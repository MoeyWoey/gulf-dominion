// GameRoom: one Durable Object per online game. It keeps the lobby (players, nations, settings)
// and relays messages: players' orders go to the host, the host's game state goes to everyone else.
// The host's browser runs the simulation; this object never simulates.

const MAX_PLAYERS = 9;
const NATIONS = 9;

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get('room')) || null;
    });
  }

  async save() {
    await this.ctx.storage.put('room', this.room);
  }

  view() {
    const r = this.room;
    return { code: r.code, host: r.host, status: r.status, heat: r.heat, realistic: r.realistic, players: r.players };
  }

  sockets(uid) {
    return uid === undefined ? this.ctx.getWebSockets() : this.ctx.getWebSockets(String(uid));
  }

  sendTo(uid, obj) {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    for (const ws of this.sockets(uid)) try { ws.send(s); } catch {}
  }

  broadcast(obj, exceptUid) {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    for (const ws of this.sockets()) {
      const a = ws.deserializeAttachment() || {};
      if (exceptUid !== undefined && a.uid === exceptUid) continue;
      try { ws.send(s); } catch {}
    }
  }

  broadcastRoom() {
    this.broadcast({ t: 'room', room: this.view() });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/init' && req.method === 'POST') {
      if (this.room && this.room.status !== 'closed') return Response.json({ error: 'exists' }, { status: 409 });
      const b = await req.json();
      this.room = { code: b.code, host: b.uid, status: 'lobby', heat: 1, realistic: false, players: [], created: Date.now() };
      await this.save();
      return Response.json({ ok: true });
    }
    if (url.pathname === '/info') {
      if (!this.room || this.room.status === 'closed') return Response.json({ error: 'none' }, { status: 404 });
      return Response.json({ status: this.room.status, players: this.room.players.length, max: MAX_PLAYERS });
    }

    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    if (!this.room || this.room.status === 'closed') return new Response('No such game', { status: 404 });
    const uid = Number(req.headers.get('x-uid'));
    const name = (req.headers.get('x-name') || 'Player').slice(0, 24);
    let p = this.room.players.find((x) => x.uid === uid);
    if (!p) {
      if (this.room.status !== 'lobby') return new Response('This game has already started', { status: 409 });
      if (this.room.players.length >= MAX_PLAYERS) return new Response('This game is full', { status: 409 });
      p = { uid, name, nation: 0, connected: true };
      this.room.players.push(p);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    for (const old of this.sockets(uid)) try { old.close(4000, 'Opened in another tab'); } catch {}
    this.ctx.acceptWebSocket(server, [String(uid)]);
    server.serializeAttachment({ uid });
    p.connected = true;
    p.name = name;
    await this.save();
    this.broadcastRoom();
    if (this.room.status === 'playing') {
      server.send(JSON.stringify({ t: 'start', room: this.view(), rejoin: true }));
      if (uid === this.room.host) this.broadcast({ t: 'hostBack' }, uid);
      else this.sendTo(this.room.host, { t: 'need', uid });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const { uid } = ws.deserializeAttachment() || {};
    const r = this.room;
    if (!r || typeof raw !== 'string' || raw.length > 900000) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const isHost = uid === r.host;
    const me = r.players.find((x) => x.uid === uid);
    if (!me) return;
    switch (m.t) {
      case 'pick': {
        if (r.status !== 'lobby') return;
        const n = Math.floor(Number(m.nation)) || 0;
        if (n < 0 || n > NATIONS) return;
        if (n && r.players.some((x) => x.uid !== uid && x.nation === n)) return;
        me.nation = n;
        await this.save();
        this.broadcastRoom();
        return;
      }
      case 'settings': {
        if (!isHost || r.status !== 'lobby') return;
        r.heat = Math.max(1, Math.min(5, Math.floor(Number(m.heat)) || 1));
        r.realistic = !!m.realistic;
        await this.save();
        this.broadcastRoom();
        return;
      }
      case 'start': {
        if (!isHost || r.status !== 'lobby') return;
        const ready = r.players.filter((x) => x.nation && x.connected);
        if (ready.length < 2 || !r.players.find((x) => x.uid === r.host).nation) return;
        // players who never picked a nation watch as spectators
        r.status = 'playing';
        r.started = Date.now();
        await this.save();
        this.broadcast({ t: 'start', room: this.view() });
        return;
      }
      case 'act':
        if (r.status === 'playing' && !isHost) this.sendTo(r.host, { t: 'act', uid, nation: me.nation, a: m.a });
        return;
      case 'state':
        if (!isHost) return;
        if (m.to) this.sendTo(m.to, raw);
        else this.broadcast(raw, uid);
        return;
      case 'to':
        if (isHost && m.uid) this.sendTo(m.uid, m.m || {});
        return;
      case 'chat':
        this.broadcast({ t: 'chat', uid, name: me.name, msg: String(m.msg || '').slice(0, 60) });
        return;
      case 'end':
        if (!isHost || r.status !== 'playing') return;
        r.status = 'ended';
        await this.save();
        this.broadcast({ t: 'end', res: m.res || null });
        return;
      case 'leave':
        await this.leave(uid, ws);
        return;
    }
  }

  async leave(uid, ws) {
    const r = this.room;
    if (!r) return;
    if (r.status === 'lobby') {
      if (uid === r.host) {
        r.status = 'closed';
        await this.save();
        this.broadcast({ t: 'closed', why: 'The host closed the game.' });
        for (const s of this.sockets()) try { s.close(1000, 'closed'); } catch {}
        return;
      }
      r.players = r.players.filter((x) => x.uid !== uid);
    } else {
      const p = r.players.find((x) => x.uid === uid);
      if (p) p.connected = false;
      if (r.status === 'playing') {
        if (uid === r.host) this.broadcast({ t: 'hostLost' }, uid);
        else this.sendTo(r.host, { t: 'gone', uid });
      }
    }
    await this.save();
    try { ws && ws.close(1000, 'left'); } catch {}
    this.broadcastRoom();
  }

  async webSocketClose(ws) {
    try { ws.close(1000, 'bye'); } catch {} // finish the close handshake so the client can reconnect
    const { uid } = ws.deserializeAttachment() || {};
    if (!this.room || uid === undefined) return;
    if (this.sockets(uid).some((s) => s !== ws && s.readyState === 1)) return;
    const p = this.room.players.find((x) => x.uid === uid);
    if (!p || !p.connected) return;
    p.connected = false;
    await this.save();
    if (this.room.status === 'playing') {
      if (uid === this.room.host) this.broadcast({ t: 'hostLost' }, uid);
      else this.sendTo(this.room.host, { t: 'gone', uid });
    }
    this.broadcastRoom();
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}
