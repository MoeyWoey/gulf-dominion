// Gulf Dominion backend: Google sign-in, cloud saves, event logs, store and MyFatoorah payments.
// Runs on Cloudflare Workers with a D1 database bound as DB. Optionally serves ../docs as static assets.

import { GameRoom } from './room.js';
export { GameRoom };

const enc = new TextEncoder();
const dec = new TextDecoder();
const SESSION_DAYS = 30;
const MAX_SAVE_BYTES = 100 * 1024;
const CLIENT_EVENTS = new Set(['run_start', 'run_end', 'store_open', 'client_error', 'session', 'achievement', 'mp_end']);
const MAX_DAILY_SCORE = 25000;
const utcDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
// Leaderboard names: first name plus last initial, never the email
function shortName(name) {
  const parts = String(name || 'Player').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Player';
  return (parts[0].slice(0, 16) + (parts.length > 1 ? ' ' + parts[parts.length - 1][0].toUpperCase() + '.' : ''));
}
const MF_BASES = {
  test: 'https://apitest.myfatoorah.com',
  kw: 'https://api.myfatoorah.com', // Kuwait, UAE, Bahrain, Jordan, Oman
  sa: 'https://api-sa.myfatoorah.com',
  qa: 'https://api-qa.myfatoorah.com',
  eg: 'https://api-eg.myfatoorah.com',
};

/* ---------------- helpers ---------------- */
const b64u = {
  enc: (buf) => {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  encStr: (s) => b64u.enc(enc.encode(s)),
  dec: (s) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  },
  decStr: (s) => dec.decode(b64u.dec(s)),
};

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const now = () => Math.floor(Date.now() / 1000);

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(payload, secret) {
  const body = b64u.encStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64u.enc(sig);
}
async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64u.dec(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(b64u.decStr(body));
    if (p.exp && p.exp < now()) return null;
    return p;
  } catch {
    return null;
  }
}

// Settings secrets (MyFatoorah keys) are stored encrypted with a key derived from SESSION_SECRET.
async function aesKey(secret) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode('gd-settings:' + secret));
  return crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encryptText(text, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), enc.encode(text));
  return b64u.enc(iv) + '.' + b64u.enc(ct);
}
async function decryptText(blob, secret) {
  const [iv, ct] = blob.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(iv) }, await aesKey(secret), b64u.dec(ct));
  return dec.decode(pt);
}

function allowedOrigins(env, reqUrl) {
  const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  list.push(new URL(reqUrl).origin);
  return list;
}
function corsHeaders(req, env) {
  const o = req.headers.get('Origin');
  if (o && allowedOrigins(env, req.url).includes(o)) {
    return {
      'Access-Control-Allow-Origin': o,
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
  }
  return {};
}
// Only redirect back to pages on an allowed origin, so a session token never leaves our own sites.
function safeReturn(env, reqUrl, ret, fallbackPath = '/') {
  const origins = allowedOrigins(env, reqUrl);
  try {
    const u = new URL(ret);
    if (origins.includes(u.origin)) return u.origin + u.pathname + u.search;
  } catch {}
  return origins[0] + fallbackPath;
}
function isAdminEmail(env, email) {
  return (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes((email || '').toLowerCase());
}

async function log(env, userId, level, event, data) {
  try {
    await env.DB.prepare('INSERT INTO logs (ts, user_id, level, event, data) VALUES (?, ?, ?, ?, ?)')
      .bind(now(), userId || null, level, event, data ? JSON.stringify(data).slice(0, 4000) : null)
      .run();
  } catch {}
}

async function getSetting(env, key) {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return r ? r.value : null;
}
async function setSetting(env, key, value) {
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value)
    .run();
}

async function mfConfig(env) {
  const mode = (await getSetting(env, 'mf_mode')) || 'test';
  const region = (await getSetting(env, 'mf_region')) || 'kw';
  const currency = (await getSetting(env, 'currency')) || 'KWD';
  let key = null;
  const stored = await getSetting(env, mode === 'live' ? 'mf_key_live' : 'mf_key_test');
  if (stored) {
    try { key = await decryptText(stored, env.SESSION_SECRET); } catch { key = null; }
  }
  if (!key) key = mode === 'live' ? env.MF_API_KEY_LIVE : env.MF_API_KEY_TEST;
  const base = mode === 'live' ? MF_BASES[region] || MF_BASES.kw : MF_BASES.test;
  return { mode, region, currency, key: key || null, base };
}
async function mfCall(cfg, path, body) {
  const r = await fetch(cfg.base + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('MyFatoorah rejected the API key. Check it matches the selected mode (test or live) and region.');
  if (!r.ok || j.IsSuccess === false) {
    const detail = (j.ValidationErrors && j.ValidationErrors.map((v) => v.Error).join('; ')) || j.Message || 'HTTP ' + r.status;
    throw new Error('MyFatoorah: ' + detail);
  }
  return j.Data;
}

/* ---------------- auth ---------------- */
async function currentUser(req, env) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const p = await verifyToken(token, env.SESSION_SECRET);
  if (!p || p.typ !== 'session') return null;
  const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(p.uid).first();
  if (!u || u.banned) return null;
  u.is_admin = u.is_admin || isAdminEmail(env, u.email) ? 1 : 0;
  return u;
}

async function authStart(req, env, url) {
  const ret = safeReturn(env, req.url, url.searchParams.get('return') || '');
  const state = await signToken({ typ: 'state', ret, n: crypto.randomUUID(), exp: now() + 600 }, env.SESSION_SECRET);
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: url.origin + '/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, 302);
}

async function authCallback(req, env, url) {
  const st = await verifyToken(url.searchParams.get('state'), env.SESSION_SECRET);
  if (!st || st.typ !== 'state') return new Response('Sign-in expired. Go back and try again.', { status: 400 });
  const back = (frag) => Response.redirect(st.ret + '#' + frag, 302);
  const code = url.searchParams.get('code');
  if (!code) return back('auth_error=' + encodeURIComponent(url.searchParams.get('error') || 'cancelled'));

  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: url.origin + '/auth/google/callback',
      grant_type: 'authorization_code',
    }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tok.access_token) {
    await log(env, null, 'error', 'login_failed', { reason: tok.error || 'token_exchange' });
    return back('auth_error=google');
  }
  const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } });
  const info = await ur.json().catch(() => ({}));
  if (!info.sub || !info.email || info.email_verified === false) return back('auth_error=unverified');

  const t = now();
  await env.DB.prepare(
    `INSERT INTO users (google_sub, email, name, picture, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture, last_seen = excluded.last_seen`
  ).bind(info.sub, info.email, info.name || '', info.picture || '', t, t).run();
  const u = await env.DB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(info.sub).first();
  if (u.banned) {
    await log(env, u.id, 'warn', 'login_blocked', {});
    return back('auth_error=banned');
  }
  const session = await signToken({ typ: 'session', uid: u.id, exp: t + SESSION_DAYS * 86400 }, env.SESSION_SECRET);
  await log(env, u.id, 'info', 'login', { email: u.email });
  return back('token=' + encodeURIComponent(session));
}

/* ---------------- payments ---------------- */
async function grantForOrder(env, order) {
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(order.product_id).first();
  const payload = product ? JSON.parse(product.payload || '{}') : {};
  if (product && product.kind === 'pearls') {
    await env.DB.prepare('INSERT OR IGNORE INTO entitlements (user_id, item, qty, source, order_id, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(order.user_id, 'pearls', payload.pearls || 0, 'purchase', order.id, now()).run();
  } else if (product) {
    const item = payload.item || product.id;
    const has = await env.DB.prepare('SELECT id FROM entitlements WHERE user_id = ? AND item = ?').bind(order.user_id, item).first();
    if (!has) {
      await env.DB.prepare('INSERT OR IGNORE INTO entitlements (user_id, item, qty, source, order_id, granted_at) VALUES (?, ?, 1, ?, ?, ?)')
        .bind(order.user_id, item, 'purchase', order.id, now()).run();
    }
  }
}

// Verify a payment with MyFatoorah itself (never trust the redirect alone), then fulfil the order once.
async function settlePayment(env, key, keyType) {
  const cfg = await mfConfig(env);
  if (!cfg.key) throw new Error('payments_not_configured');
  const d = await mfCall(cfg, '/v2/GetPaymentStatus', { Key: String(key), KeyType: keyType });
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(d.CustomerReference || '').first();
  if (!order) {
    await log(env, null, 'warn', 'payment_unknown_order', { invoice: d.InvoiceId, ref: d.CustomerReference });
    return { order: null, paid: false };
  }
  const paid = d.InvoiceStatus === 'Paid' && Number(d.InvoiceValue) + 0.0005 >= Number(order.amount);
  const tx = (d.InvoiceTransactions || []).slice(-1)[0] || {};
  if (paid && order.status !== 'paid') {
    const res = await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ?, mf_invoice_id = ?, mf_payment_id = ? WHERE id = ? AND status != 'paid'")
      .bind(now(), String(d.InvoiceId), String(tx.PaymentId || key), order.id).run();
    if (res.meta && res.meta.changes) {
      await grantForOrder(env, order);
      await log(env, order.user_id, 'info', 'purchase_paid', { order: order.id, product: order.product_id, amount: order.amount, currency: order.currency, mode: cfg.mode });
    }
  } else if (!paid && order.status === 'pending' && ['Canceled', 'Expired', 'Failed'].includes(d.InvoiceStatus)) {
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(order.id).run();
    await log(env, order.user_id, 'warn', 'purchase_failed', { order: order.id, status: d.InvoiceStatus, error: tx.Error || null });
  }
  return { order, paid };
}

async function payCallback(req, env, url) {
  const pid = url.searchParams.get('paymentId') || url.searchParams.get('Id');
  let target = allowedOrigins(env, req.url)[0] + '/';
  let ok = false;
  try {
    if (pid) {
      const r = await settlePayment(env, pid, 'PaymentId');
      if (r.order && r.order.return_url) target = r.order.return_url;
      ok = r.paid;
    }
  } catch (e) {
    await log(env, null, 'error', 'payment_callback_error', { msg: String(e.message || e) });
  }
  return Response.redirect(target + '#store=' + (ok ? 'success' : 'failed'), 302);
}

async function payWebhook(req, env) {
  const body = await req.json().catch(() => ({}));
  const inv = body && body.Data && (body.Data.InvoiceId || body.Data.InvoiceID);
  if (inv) {
    try { await settlePayment(env, inv, 'InvoiceId'); } catch (e) { await log(env, null, 'error', 'payment_webhook_error', { msg: String(e.message || e) }); }
  }
  return json({ ok: true });
}

/* ---------------- API ---------------- */
async function api(req, env, url, path) {
  const method = req.method;
  const body = method === 'POST' || method === 'PUT' ? await req.json().catch(() => ({})) : {};

  if (path === '/api/store' && method === 'GET') {
    const r = await env.DB.prepare('SELECT id, name, description, price, currency, kind, payload FROM products WHERE active = 1 ORDER BY sort, id').all();
    const cfg = await mfConfig(env);
    return json({ products: r.results.map((p) => ({ ...p, payload: JSON.parse(p.payload || '{}') })), mode: cfg.mode, enabled: !!cfg.key });
  }

  if (path === '/api/config' && method === 'GET') {
    let config = {};
    try { config = JSON.parse((await getSetting(env, 'game_config')) || '{}'); } catch {}
    return json({ config });
  }

  if (path === '/api/daily' && method === 'GET') {
    const q = url.searchParams.get('date') || '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : utcDay();
    const viewer = await currentUser(req, env);
    const top = await env.DB.prepare(
      `SELECT d.user_id, d.score, d.peak, d.win, d.minutes, d.kills, d.nation, u.name FROM daily_scores d JOIN users u ON u.id = d.user_id
       WHERE d.date = ? AND u.banned = 0 ORDER BY d.score DESC, d.updated_at ASC LIMIT 50`
    ).bind(date).all();
    const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM daily_scores d JOIN users u ON u.id = d.user_id WHERE d.date = ? AND u.banned = 0').bind(date).first()).n;
    let me = null;
    if (viewer) {
      const mine = await env.DB.prepare('SELECT score FROM daily_scores WHERE date = ? AND user_id = ?').bind(date, viewer.id).first();
      if (mine) {
        const above = await env.DB.prepare('SELECT COUNT(*) AS n FROM daily_scores d JOIN users u ON u.id = d.user_id WHERE d.date = ? AND d.score > ? AND u.banned = 0').bind(date, mine.score).first();
        me = { score: mine.score, rank: above.n + 1 };
      }
    }
    return json({
      date, total, me,
      top: top.results.map((t, i) => ({ rank: i + 1, name: shortName(t.name), score: t.score, peak: t.peak, win: !!t.win, minutes: t.minutes, kills: t.kills, nation: t.nation, you: !!viewer && t.user_id === viewer.id })),
    });
  }

  const user = await currentUser(req, env);
  if (!user) return json({ error: 'auth' }, 401);

  if (path === '/api/rooms' && method === 'POST') {
    // Online game: create a room with a short code; the creator is the host
    const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let tries = 0; tries < 6; tries++) {
      let code = '';
      const bytes = crypto.getRandomValues(new Uint8Array(5));
      for (const b of bytes) code += ABC[b % ABC.length];
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      const r = await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, uid: user.id, map: body && body.map === 'ext' ? 'ext' : 'gulf' }) });
      if (r.ok) {
        await log(env, user.id, 'info', 'room_created', { code });
        return json({ code });
      }
    }
    return json({ error: 'busy' }, 503);
  }
  if (path.startsWith('/api/rooms/') && method === 'GET') {
    const code = path.slice(11).toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) return json({ error: 'code' }, 400);
    const r = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/info');
    return json(await r.json(), r.status);
  }

  if (path === '/api/daily/score' && method === 'POST') {
    const date = String(body.date || '');
    if (date !== utcDay() && date !== utcDay(-1)) return json({ error: 'date' }, 400);
    const score = Math.floor(Number(body.score));
    const peak = Number(body.peak), minutes = Number(body.minutes), kills = Math.floor(Number(body.kills) || 0);
    if (!(score >= 0 && score <= MAX_DAILY_SCORE) || !(peak >= 0 && peak <= 100) || !(minutes >= 0 && minutes <= 600) || kills < 0 || kills > 8)
      return json({ error: 'invalid' }, 400);
    const nation = String(body.nation || '').slice(0, 3).toUpperCase();
    await env.DB.prepare(
      `INSERT INTO daily_scores (date, user_id, score, peak, win, minutes, kills, nation, attempts, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(date, user_id) DO UPDATE SET attempts = attempts + 1,
         peak = CASE WHEN excluded.score > score THEN excluded.peak ELSE peak END,
         win = CASE WHEN excluded.score > score THEN excluded.win ELSE win END,
         minutes = CASE WHEN excluded.score > score THEN excluded.minutes ELSE minutes END,
         kills = CASE WHEN excluded.score > score THEN excluded.kills ELSE kills END,
         nation = CASE WHEN excluded.score > score THEN excluded.nation ELSE nation END,
         updated_at = CASE WHEN excluded.score > score THEN excluded.updated_at ELSE updated_at END,
         score = CASE WHEN excluded.score > score THEN excluded.score ELSE score END`
    ).bind(date, user.id, score, peak, body.win ? 1 : 0, minutes, kills, nation, now()).run();
    const best = (await env.DB.prepare('SELECT score FROM daily_scores WHERE date = ? AND user_id = ?').bind(date, user.id).first()).score;
    const above = await env.DB.prepare('SELECT COUNT(*) AS n FROM daily_scores d JOIN users u ON u.id = d.user_id WHERE d.date = ? AND d.score > ? AND u.banned = 0').bind(date, best).first();
    const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM daily_scores d JOIN users u ON u.id = d.user_id WHERE d.date = ? AND u.banned = 0').bind(date).first()).n;
    await log(env, user.id, 'info', 'daily_score', { date, score, best, win: !!body.win, peak, nation });
    return json({ ok: true, best, rank: above.n + 1, total });
  }

  if (path === '/api/me' && method === 'GET') {
    await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(now(), user.id).run();
    const save = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?').bind(user.id).first();
    const ents = await env.DB.prepare('SELECT item, SUM(qty) AS qty FROM entitlements WHERE user_id = ? AND revoked = 0 GROUP BY item').bind(user.id).all();
    return json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture, is_admin: !!user.is_admin },
      save: save ? { data: JSON.parse(save.data), updated_at: save.updated_at } : null,
      entitlements: ents.results,
    });
  }

  if (path === '/api/save' && method === 'PUT') {
    const data = JSON.stringify(body.data || {});
    if (data.length > MAX_SAVE_BYTES) return json({ error: 'too_large' }, 413);
    const updated = Math.max(Number(body.updatedAt) || 0, 0) || Date.now();
    await env.DB.prepare('INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .bind(user.id, data, updated).run();
    return json({ ok: true, updated_at: updated });
  }

  if (path === '/api/log' && method === 'POST') {
    if (!CLIENT_EVENTS.has(body.event)) return json({ error: 'bad_event' }, 400);
    await log(env, user.id, body.event === 'client_error' ? 'error' : 'info', body.event, body.data || null);
    return json({ ok: true });
  }

  if (path === '/api/checkout' && method === 'POST') {
    const p = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND active = 1').bind(body.productId || '').first();
    if (!p) return json({ error: 'no_product' }, 404);
    const payload = JSON.parse(p.payload || '{}');
    if (p.kind !== 'pearls') {
      const owned = await env.DB.prepare('SELECT id FROM entitlements WHERE user_id = ? AND item = ? AND revoked = 0').bind(user.id, payload.item || p.id).first();
      if (owned) return json({ error: 'owned' }, 409);
    }
    const cfg = await mfConfig(env);
    if (!cfg.key) return json({ error: 'payments_not_configured' }, 503);
    const id = crypto.randomUUID();
    const origin = req.headers.get('Origin');
    const ret = safeReturn(env, req.url, body.returnUrl || (origin ? origin + '/' : ''));
    await env.DB.prepare("INSERT INTO orders (id, user_id, product_id, amount, currency, status, mode, return_url, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)")
      .bind(id, user.id, p.id, p.price, p.currency || cfg.currency, cfg.mode, ret, now()).run();
    try {
      const d = await mfCall(cfg, '/v2/SendPayment', {
        CustomerName: (user.name || user.email || 'Player').slice(0, 60),
        NotificationOption: 'LNK',
        InvoiceValue: p.price,
        DisplayCurrencyIso: p.currency || cfg.currency,
        CustomerEmail: user.email,
        CallBackUrl: url.origin + '/pay/callback',
        ErrorUrl: url.origin + '/pay/callback',
        Language: 'en',
        CustomerReference: id,
        UserDefinedField: String(user.id),
        InvoiceItems: [{ ItemName: p.name, Quantity: 1, UnitPrice: p.price }],
      });
      await env.DB.prepare('UPDATE orders SET mf_invoice_id = ? WHERE id = ?').bind(String(d.InvoiceId), id).run();
      await log(env, user.id, 'info', 'checkout_started', { order: id, product: p.id, amount: p.price, mode: cfg.mode });
      return json({ url: d.InvoiceURL, order: id });
    } catch (e) {
      await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(id).run();
      await log(env, user.id, 'error', 'checkout_error', { order: id, msg: String(e.message || e) });
      return json({ error: 'payment_error', detail: String(e.message || e) }, 502);
    }
  }

  if (path.startsWith('/api/admin/')) {
    if (!user.is_admin) return json({ error: 'forbidden' }, 403);
    return admin(req, env, url, path.slice(10), method, body, user);
  }
  return json({ error: 'not_found' }, 404);
}

/* ---------------- admin ---------------- */
function mask(k) { return k ? '•••• ' + k.slice(-4) : null; }

async function admin(req, env, url, path, method, body, me) {
  const q = url.searchParams;
  if (path === '/overview') {
    const day = now() - 86400;
    const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first()) || {};
    const users = await one('SELECT COUNT(*) AS n FROM users');
    const active = await one('SELECT COUNT(*) AS n FROM users WHERE last_seen > ?', day);
    const runs = await one("SELECT COUNT(*) AS n FROM logs WHERE event = 'run_start' AND ts > ?", day);
    const errors = await one("SELECT COUNT(*) AS n FROM logs WHERE level = 'error' AND ts > ?", day);
    const pending = await one("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'");
    const revenue = await env.DB.prepare("SELECT currency, mode, SUM(amount) AS total, COUNT(*) AS n FROM orders WHERE status = 'paid' GROUP BY currency, mode").all();
    const daily = await env.DB.prepare("SELECT (ts / 86400) AS d, COUNT(*) AS n FROM logs WHERE event = 'run_start' AND ts > ? GROUP BY d ORDER BY d").bind(now() - 14 * 86400).all();
    return json({ users: users.n, active24h: active.n, runs24h: runs.n, errors24h: errors.n, pendingOrders: pending.n, revenue: revenue.results, dailyRuns: daily.results });
  }
  if (path === '/logs') {
    const where = [], b = [];
    if (q.get('event')) { where.push('l.event = ?'); b.push(q.get('event')); }
    if (q.get('level')) { where.push('l.level = ?'); b.push(q.get('level')); }
    if (q.get('q')) { where.push('(u.email LIKE ? OR l.data LIKE ?)'); b.push('%' + q.get('q') + '%', '%' + q.get('q') + '%'); }
    if (q.get('before')) { where.push('l.id < ?'); b.push(Number(q.get('before'))); }
    const limit = Math.min(500, Number(q.get('limit')) || 100);
    const r = await env.DB.prepare(`SELECT l.id, l.ts, l.level, l.event, l.data, u.email FROM logs l LEFT JOIN users u ON u.id = l.user_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY l.id DESC LIMIT ${limit}`).bind(...b).all();
    const events = await env.DB.prepare('SELECT DISTINCT event FROM logs ORDER BY event').all();
    return json({ logs: r.results, events: events.results.map((e) => e.event) });
  }
  if (path === '/users' && method === 'GET') {
    const like = '%' + (q.get('q') || '') + '%';
    const r = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.created_at, u.last_seen, u.banned, u.is_admin,
        (SELECT GROUP_CONCAT(item) FROM (SELECT DISTINCT item FROM entitlements e WHERE e.user_id = u.id AND e.revoked = 0)) AS items,
        (SELECT COALESCE(SUM(amount),0) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid' AND o.mode = 'live') AS spent
       FROM users u WHERE u.email LIKE ? OR u.name LIKE ? ORDER BY u.last_seen DESC LIMIT 200`
    ).bind(like, like).all();
    return json({ users: r.results.map((u) => ({ ...u, is_admin: u.is_admin || isAdminEmail(env, u.email) ? 1 : 0 })) });
  }
  let m = path.match(/^\/users\/(\d+)\/(grant|revoke|ban)$/);
  if (m && method === 'POST') {
    const uid = Number(m[1]);
    if (m[2] === 'grant') {
      const item = String(body.item || '');
      if (!item) return json({ error: 'item' }, 400);
      const qty = item === 'pearls' ? Math.max(1, Math.floor(Number(body.qty) || 0)) : 1;
      await env.DB.prepare('INSERT INTO entitlements (user_id, item, qty, source, granted_at) VALUES (?, ?, ?, ?, ?)').bind(uid, item, qty, 'admin:' + me.email, now()).run();
    } else if (m[2] === 'revoke') {
      await env.DB.prepare('UPDATE entitlements SET revoked = 1 WHERE user_id = ? AND item = ?').bind(uid, String(body.item || '')).run();
    } else {
      await env.DB.prepare('UPDATE users SET banned = ? WHERE id = ?').bind(body.banned ? 1 : 0, uid).run();
    }
    await log(env, me.id, 'info', 'admin_' + m[2], { user: uid, item: body.item, qty: body.qty, banned: body.banned });
    return json({ ok: true });
  }
  if (path === '/orders') {
    const r = await env.DB.prepare('SELECT o.*, u.email FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 300').all();
    return json({ orders: r.results });
  }
  m = path.match(/^\/orders\/([\w-]+)\/recheck$/);
  if (m && method === 'POST') {
    const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(m[1]).first();
    if (!o || !o.mf_invoice_id) return json({ error: 'no_invoice' }, 404);
    try {
      const r = await settlePayment(env, o.mf_invoice_id, 'InvoiceId');
      return json({ ok: true, paid: r.paid });
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  }
  if (path === '/products' && method === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM products ORDER BY sort, id').all();
    return json({ products: r.results });
  }
  if (path === '/products' && method === 'PUT') {
    const p = body;
    if (!/^[a-z0-9_]{2,40}$/.test(p.id || '')) return json({ error: 'id must be lowercase letters, digits or _' }, 400);
    if (!['unlock', 'pearls', 'cosmetic'].includes(p.kind)) return json({ error: 'kind' }, 400);
    const price = Math.round(Number(p.price) * 1000) / 1000;
    if (!(price > 0)) return json({ error: 'price' }, 400);
    let payload = p.payload;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { return json({ error: 'payload must be JSON' }, 400); } }
    await env.DB.prepare(
      `INSERT INTO products (id, name, description, price, currency, kind, payload, active, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
       kind = excluded.kind, payload = excluded.payload, active = excluded.active, sort = excluded.sort`
    ).bind(p.id, String(p.name || p.id), String(p.description || ''), price, String(p.currency || 'KWD').toUpperCase(), p.kind, JSON.stringify(payload || {}), p.active ? 1 : 0, Number(p.sort) || 0).run();
    await log(env, me.id, 'info', 'admin_product_saved', { id: p.id, price, active: !!p.active });
    return json({ ok: true });
  }
  if (path === '/settings' && method === 'GET') {
    const cfg = await mfConfig(env);
    const keyFor = async (name, fallback) => {
      const s = await getSetting(env, name);
      if (s) { try { return { source: 'dashboard', masked: mask(await decryptText(s, env.SESSION_SECRET)) }; } catch { return { source: 'dashboard', masked: 'unreadable' }; } }
      return fallback ? { source: 'worker secret', masked: mask(fallback) } : null;
    };
    return json({
      mode: cfg.mode, region: cfg.region, currency: cfg.currency, base: cfg.base,
      testKey: await keyFor('mf_key_test', env.MF_API_KEY_TEST),
      liveKey: await keyFor('mf_key_live', env.MF_API_KEY_LIVE),
      callbackUrl: url.origin + '/pay/callback',
      webhookUrl: url.origin + '/pay/webhook',
    });
  }
  if (path === '/settings' && method === 'PUT') {
    if (body.mode && ['test', 'live'].includes(body.mode)) await setSetting(env, 'mf_mode', body.mode);
    if (body.region && MF_BASES[body.region] && body.region !== 'test') await setSetting(env, 'mf_region', body.region);
    if (body.currency && /^[A-Z]{3}$/.test(body.currency)) await setSetting(env, 'currency', body.currency);
    for (const [field, name] of [['testKey', 'mf_key_test'], ['liveKey', 'mf_key_live']]) {
      if (typeof body[field] === 'string') {
        const v = body[field].trim();
        if (v) await setSetting(env, name, await encryptText(v, env.SESSION_SECRET));
        else await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(name).run();
      }
    }
    await log(env, me.id, 'info', 'admin_settings_saved', { mode: body.mode, region: body.region, currency: body.currency, testKey: body.testKey !== undefined, liveKey: body.liveKey !== undefined });
    return json({ ok: true });
  }
  if (path === '/daily' && method === 'GET') {
    const q = url.searchParams.get('date') || '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : utcDay();
    const r = await env.DB.prepare(
      'SELECT d.*, u.email, u.name, u.banned FROM daily_scores d JOIN users u ON u.id = d.user_id WHERE d.date = ? ORDER BY d.score DESC LIMIT 300'
    ).bind(date).all();
    return json({ date, scores: r.results });
  }
  if (path === '/daily/delete' && method === 'POST') {
    await env.DB.prepare('DELETE FROM daily_scores WHERE date = ? AND user_id = ?').bind(String(body.date || ''), Number(body.user_id)).run();
    await log(env, me.id, 'warn', 'admin_daily_removed', { date: body.date, user: body.user_id });
    return json({ ok: true });
  }
  if (path === '/config' && method === 'GET') {
    let config = {};
    try { config = JSON.parse((await getSetting(env, 'game_config')) || '{}'); } catch {}
    return json({ config });
  }
  if (path === '/config' && method === 'PUT') {
    const cfg = body && typeof body.config === 'object' && !Array.isArray(body.config) ? body.config : null;
    if (!cfg) return json({ error: 'config must be an object' }, 400);
    const text = JSON.stringify(cfg);
    if (text.length > 30000) return json({ error: 'config too large' }, 413);
    await setSetting(env, 'game_config', text);
    await log(env, me.id, 'info', 'admin_balance_saved', { bytes: text.length, reset: text === '{}' });
    return json({ ok: true });
  }
  if (path === '/mf/test' && method === 'POST') {
    const cfg = await mfConfig(env);
    if (!cfg.key) return json({ ok: false, error: 'No ' + cfg.mode + ' key saved yet.' });
    try {
      const d = await mfCall(cfg, '/v2/InitiatePayment', { InvoiceAmount: 1, CurrencyIso: cfg.currency });
      return json({ ok: true, mode: cfg.mode, methods: (d.PaymentMethods || []).map((p) => p.PaymentMethodEn) });
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) });
    }
  }
  return json({ error: 'not_found' }, 404);
}

/* ---------------- entry ---------------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    try {
      if (path === '/auth/google/start') return await authStart(req, env, url);
      if (path === '/auth/google/callback') return await authCallback(req, env, url);
      if (path === '/pay/callback') return await payCallback(req, env, url);
      if (path === '/pay/webhook' && req.method === 'POST') return await payWebhook(req, env);
      if (path.startsWith('/ws/room/')) {
        // WebSocket into an online game room; the session token comes in the query string
        const code = path.slice(9).toUpperCase();
        if (!/^[A-Z0-9]{5}$/.test(code)) return new Response('Bad code', { status: 400 });
        const origin = req.headers.get('Origin');
        if (origin && !allowedOrigins(env, req.url).includes(origin)) return new Response('Forbidden', { status: 403 });
        const p = await verifyToken(url.searchParams.get('token'), env.SESSION_SECRET);
        const u = p && p.typ === 'session' ? await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(p.uid).first() : null;
        if (!u || u.banned) return new Response('Sign in first', { status: 401 });
        const h = new Headers(req.headers);
        h.set('x-uid', String(u.id));
        h.set('x-name', shortName(u.name || u.email));
        return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request('https://room/ws', { headers: h }));
      }
      if (path.startsWith('/api/')) {
        const r = await api(req, env, url, path);
        const h = new Headers(r.headers);
        for (const [k, v] of Object.entries(corsHeaders(req, env))) h.set(k, v);
        h.set('cache-control', 'no-store');
        return new Response(r.body, { status: r.status, headers: h });
      }
      if (env.ASSETS) return env.ASSETS.fetch(req);
      return new Response('Not found', { status: 404 });
    } catch (e) {
      await log(env, null, 'error', 'server_error', { path, msg: String((e && e.message) || e) });
      return json({ error: 'server_error' }, 500, corsHeaders(req, env));
    }
  },
};
