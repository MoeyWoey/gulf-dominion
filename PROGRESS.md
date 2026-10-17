# Gulf Dominion — Progress Log

A slow-paced, phone-first, incremental rogue-lite strategy game across the Gulf, Iraq, Iran and Yemen, inspired by OpenFront. You expand from your capital, fight rival nations, trade drone and missile strikes, build air defense, and spend pearls on permanent upgrades between campaigns.

_Last updated: 2026-10-17 (after commit `d48a70d`)_

---

## Where everything lives

| What | Where |
|---|---|
| Live game | https://moeywoey.github.io/gulf-dominion/ |
| Admin dashboard | https://moeywoey.github.io/gulf-dominion/admin.html |
| Backend (Cloudflare Worker) | https://gulf-dominion.m-hotiri.workers.dev |
| Database | Cloudflare D1 `gulf-dominion` (`92de228b-eec0-4d74-9954-dcc7cabca14b`) |
| Code | https://github.com/MoeyWoey/gulf-dominion (GitHub Pages serves `/docs`) |
| Offline preview | Private Claude artifact https://claude.ai/artifact/ByDWoQqK3ik6ovvw1VHDTv (no sign-in or store) |

### Project layout

| Path | Purpose |
|---|---|
| `docs/index.html` | The game (single file) |
| `docs/admin.html` | Admin dashboard |
| `docs/balance.js` | Shared balance defaults, read by both pages; dashboard overrides merge over them |
| `worker/src/index.js` | Worker: Google sign-in, cloud saves, logs, store, MyFatoorah, balance config |
| `worker/schema.sql` | D1 tables and starter store items |
| `worker/wrangler.toml` | Worker config (vars only, no secrets) |
| `DEPLOY.md` | Full first-time setup guide |
| `PROGRESS.md` | This file |

### Accounts and secrets

- **Cloudflare:** your personal Cloudflare account (workers.dev subdomain `m-hotiri`). Worker secrets: `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`.
- **Google OAuth:** Google Cloud project "Gulf Dominion", Web client. The redirect URI is `https://gulf-dominion.m-hotiri.workers.dev/auth/google/callback`.
- **GitHub:** MoeyWoey. Commits use the GitHub no-reply email so the Gmail stays out of public history.
- **MyFatoorah:** The **live** key is saved, encrypted, in the dashboard, and the store runs in **Live** mode. The test key was skipped by choice. The token permissions are Send Payment, Initiate Payment and Get Payment Status.

---

## How we work (the process)

Every change follows the same loop:

1. **Request.** You describe the change in chat.
2. **Build.** Edits go into `docs/index.html`, `docs/admin.html`, `docs/balance.js` and/or `worker/src/index.js`. Any new numbers become **Balance tab** settings where it makes sense.
3. **Test locally.**
   - The Worker runs under `wrangler dev` on port 8797 (preview entry `gulf-dominion-worker`).
   - The game's `gd-api` meta is set to `/` for the test.
   - A temporary `window.__gd` debug hook drives the simulation, using `tick()` and direct calls.
   - The hook is always removed and `gd-api` restored before shipping.
4. **Ship.**
   - `npx wrangler deploy` updates the Worker and its copy of `docs/`.
   - `git commit` + `git push` updates GitHub Pages, which rebuilds in about a minute.
   - The artifact is republished from a scratch copy with `gd-api` emptied (offline mode), with `balance.js` included.
5. **Log.** This file gets updated.

Safety rules we keep:

- Secrets never go in chat or in the repo. You paste keys yourself, into the dashboard or `wrangler secret put`.
- Before going live, check the public repo for secrets and for your email address.
- Payments are verified with MyFatoorah (`GetPaymentStatus`) before anything is granted. Redirects alone are never trusted.

---

## Timeline

### 1. Prototype (artifact v1–v7)

- Pixel map of the Arabian Peninsula; the six GCC states expand from their capitals into neutral land.
- OpenFront-style troops, regen, attacks with a send slider, cities, forts and oil rigs.
- Rogue-lite layer: decree cards at land milestones, pearls after every run, Majlis upgrades, nation unlocks, heat levels, and an idle dhow fleet.
- Dhow landings across water, then ports and warships that hunt dhows.
- Redesign to a slower pace, with drones, missiles and air defense, and **Iraq and Iran** added. Buildings can be placed freely.
- Balance pass:
  - Silos, hangars and air defense got magazines and reload cooldowns.
  - Counter-attacks now meet the incoming army on the same tiles.
- Border fixes:
  - Missiles no longer neutralize land.
  - Taking a capital moves it instead of annexing the whole nation.
  - AI dhows only land where there's no land route.
- Smooth supersampled rendering with curved borders and coasts. **Yemen** added as a strong land nation.
- Two blocs: GCC versus Iraq, Iran and Yemen. AIs rarely attack inside their own bloc.

### 2. Online backend — `43c3c56`

- Cloudflare Worker + D1, with Google sign-in (token auth, works on GitHub Pages) and cloud saves.
- Event logs, a store, and MyFatoorah payments (SendPayment, verified via GetPaymentStatus, plus a webhook).
- Admin dashboard: Overview, Logs, Players (grant/revoke/ban), Orders (recheck), Store (edit prices), Payments API (encrypted keys, test connection).
- Store items: All nations pack, Founder's perk, 500 / 3,000 pearls, Night map theme, Gold borders.
- Deployed: D1 created, Worker live, Google OAuth set up, repo published, GitHub Pages on.

### 3. Weapons and arsenals — `217dde2`

- Three drone types (light, strike, heavy) and three missile tiers, each with its own cost, blast radius, speed, troop damage and interceptability.
- Nation arsenals:
  - Iran flies all three drone types; Iraq and Yemen fly light drones. All three are capped at Missile I.
  - The GCC get every missile tier but a handicapped light drone.
- Drones from Iraq, Iran and Yemen stay hidden until 8 tiles from your land. There are extra oil fields on GCC land.
- New Balance tab in the dashboard; the Worker serves `/api/config`.

### 4. Radar and warnings — `a6da2d1`

- New Radar building:
  - Tracks incoming strikes in range, with impact zones, a countdown, HUD chips and screen-edge arrows.
  - Reveals hidden drones early and boosts air defense inside its coverage.
- Missiles slowed to 6/7/8 tiles/s, and the radar range set to 26, so warnings give a few seconds to react.

### 5. Sound — `66b3add`

- Generated Web Audio music: D Hijaz, with a pad, bass, oud-like plucks and darbuka.
- Effects plus warnings: missile siren, radar ping, and an alarm when attacked or landed on.
- Volume and toggles on the home screen and in the pause menu, plus an in-game mute.

### 6. Home layout — `8cc551e`, `3a1747c`

- Majlis upgrades and Store became big tabs pinned at the top, each opening a full-screen panel.
- Begin campaign moved above the nation choice.
- Round building icons with type symbols, used on the map and in the build menu.
- Radar and air defense ranges made clearer.
- **Deep silos** upgrade: 1 → 4 missile slots, costing 400 / 1,400 / 4,900 pearls.

### 7. Stealth and abilities — `3d8fcb1`, `296e172`

- Silos are hidden from rivals and show for 10 seconds after firing. The AI only targets silos it can see.
- Your air defense ranges are faded until you tap or hover the battery. Enemy ranges are hidden unless your UAV is up.
- **UAV recon** (GCC only): 120 gold, reveals hidden silos, drones and enemy air defense for 15 seconds, then a 60-second cooldown.
- **Drone rush** (Iran only): launches every ready drone at random enemy buildings in range at half price, then a 90-second cooldown.
- The AI uses both abilities.

### 8. Achievements, unlocks and world news — `d48a70d`

- New **Achievements** tab: a third tab on the home screen and in the panel. It has 12 achievements with progress bars, pearl rewards and a "new" badge.
- Fresh progress starts with these **locked for everyone**, both you and every AI. Each unlocks when you earn its achievement:

  | Locked item | Achievement | Goal |
  |---|---|---|
  | Missile II + Strike drone | Arms development | 15 strikes launched |
  | Missile III + Heavy drone | Strategic deterrent | 40 enemy buildings destroyed by strikes |
  | UAV recon (GCC) | Eyes in the sky | 3 radars built |
  | Drone rush (Iran) | Swarm doctrine | 60 drones launched |

- Pearl achievements:

  | Achievement | Goal | Reward |
  |---|---|---|
  | First campaign | Finish a campaign | +20 |
  | Expansionist | Hold 10% of the region | +30 |
  | Regional power | Hold 30% of the region | +60 |
  | Kingmaker | Take a capital | +40 |
  | Conqueror | Eliminate a nation | +40 |
  | Iron wall | 50 interceptions | +50 |
  | Dominion | Win a campaign | +100 |
  | Under fire | Win at Heat 3 or higher | +150 |

- Locked weapons appear in Strike mode as dashed buttons that name the achievement needed. Nation cards mark locked items.
- **World news:** a breaking-news banner appears every 280–420 s (the first at 200 s), and its effect lasts 60 s for every nation:

  | Headline | Effect |
  |---|---|
  | Fed rate cut | Oil income ×1.5 |
  | Fed rate rise | Oil income ×0.6 |
  | OPEC+ cut | Oil income ×1.4 |
  | Oil glut | Oil income ×0.7 |
  | Gas shortage | Silo reload ×1.5 |
  | Arms embargo | Missiles +30% cost |
  | Hormuz insurance | Dhows ×0.6 speed |
  | Interceptor tech | Air defense ×1.2 |
  | Sandstorm | Desert ×2.2 |

  There are also two one-off events: tribal support adds troops, and traders bring gold. News replaced the old 2-minute events.
- Achievements are logged in the dashboard's Logs as `achievement` events. The unlock goals and news timing are in the Balance tab.

---

## Current balance defaults (`docs/balance.js`)

| Weapon | Cost | Blast | Speed | Notes |
|---|---|---|---|---|
| Light drone | 45 | 1.0 | 3 | GCC version: ×1.4 cost, ×1.3 easier to intercept, ×0.8 blast, ×0.9 speed |
| Strike drone | 85 | 1.6 | 2.6 | Iran |
| Heavy drone | 140 | 2.3 | 2.2 | Iran |
| Missile I | 200 | 2 | 6 | All; Iran pays 30% less |
| Missile II | 420 | 3 | 7 | GCC; silo reload ×1.5 |
| Missile III | 750 | 4 | 8 | GCC; silo reload ×2.2 |

| Rule | Default |
|---|---|
| Hidden drones reveal distance | 8 tiles |
| Radar range / air defense boost | 26 tiles / ×1.25 |
| Silo visible after firing | 10 s |
| UAV recon | 120 gold, 15 s, 60 s cooldown |
| Drone rush | 50% cost, 90 s cooldown |
| Extra GCC oil | 0.05 |
| Magazines (reload) | Silo 1 (30 s), Hangar 4 (35 s), Air defense 3 (18 s) |
| Unlock goals | Tier II: 15 strikes · Tier III: 40 buildings destroyed · UAV: 3 radars · Drone rush: 60 drones |
| World news | First at 200 s, then every 280–420 s, effects last 60 s |
| Win condition | 60% of the land, or every rival eliminated |

Every value above can be changed live from the dashboard's **Balance** tab.

---

## Open items

- [ ] **No real payment has completed yet.** One live 2.500 KWD invoice (`231535393`) is still pending and unpaid. The 0.500 KWD test purchase never reached the database. The next purchase should be checked in Orders and Logs.
- [ ] **MyFatoorah webhook:** confirm it's set in the live portal to `https://gulf-dominion.m-hotiri.workers.dev/pay/webhook` (event: Transaction Status Changed).
- [ ] **Store prices** are still placeholders. Set real prices in the dashboard's Store tab.
- [ ] **Full play-through:** no campaign has been played start to finish since the slower pace and the new weapons. Pacing, AI strike frequency and drone rush strength need a real playtest.
- [ ] **Real phone check:** sound, vibration and touch controls are only verified in a desktop browser.
- [ ] **Wrangler** is on 3.114; an upgrade to v4 is recommended (`npm install --save-dev wrangler@4` in `worker/`).
- [ ] Deep silos cost isn't dashboard-tunable yet (Majlis upgrade costs are fixed in code).
- [ ] Existing saves (including yours) also start with tier II/III and abilities locked. There's no admin grant for unlocks yet.
- [ ] Achievement thresholds for pearl rewards (10%, 30%, 50 interceptions, …) are fixed in code; only the four unlock goals are in the Balance tab.

## Ideas suggested but not built

- Rival-specific events (e.g. a GCC summit truce, an oil embargo)
- Daily challenge seed with a leaderboard
- Cruise missiles that fly low under air defense; a counter-battery radar
- Nation-specific decree cards
