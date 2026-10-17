# Gulf Dominion — Progress Log

A slow-paced, phone-first, incremental rogue-lite strategy game across the Gulf, Iraq, Iran and Yemen, inspired by OpenFront. You expand from your capital, fight rival nations, trade drone and missile strikes, build air defense, and spend pearls on permanent upgrades between campaigns.

_Last updated: 2026-10-17 (after commit `d089a9a`)_

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
| `worker/src/index.js` | Worker: Google sign-in, cloud saves, logs, store, MyFatoorah, balance config, online room routes |
| `worker/src/room.js` | `GameRoom` Durable Object: one per online game; holds the lobby and relays messages |
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

### 9. Daily challenge — `45d6ab1`

- A **Daily challenge** card sits above the heat selector on the home screen. Everyone gets the same setup each UTC day:
  - a nation (any of the nine, even locked ones)
  - a heat level from 1 to 3
  - a twist: Standard, Oil shock, Fuel rationing, Arms race, Full arsenal, Storm season, Calm seas or Iron sky
- Fair play:
  - The day's seed drives all randomness.
  - Majlis upgrades and the Founder perk are off.
  - Weapon unlocks come only from the twist.
- **Score** = peak land % × 100 + 400 per rival eliminated + 250 per capital taken + 3,000 for a win + up to 2,700 for a fast win.
- The first finish each day pays +50 pearls. There's a new achievement, **Daily devotion** (5 different days, +100 pearls). Daily wins don't raise your heat.
- **Leaderboard** (Today / Yesterday) shows first name and last initial only. Only each player's best score counts.
- The Worker accepts scores for today or yesterday only, with sanity limits (max 25,000).
- The dashboard has a **Daily** tab to review and remove suspicious scores.
- The new D1 table `daily_scores` was added to the live database.

### 10. Diplomacy — `304792c`

- Tap any nation in the top-right list to open talks. The game pauses while you negotiate.
- **Ceasefire (60 s):**
  - They stop attacking, striking and landing on you.
  - Anything they already have under way against you is called off.
- **Alliance (3 min, 3× the price):** the same, plus they turn on your rivals.
- **Price** = (60 + 0.05 × their tiles + 0.02 × their troops) × (1 + 0.2 × (heat − 1)).
- **Acceptance odds** start at 60%:
  - −25% if they're much stronger than you
  - +20% if you're much stronger than them
  - +15% if you're in the same bloc
  - −30% if they're still angry after a betrayal
  - −25% if you're attacking them right now
  - Alliances are ×0.7 harder to get.
- A refusal costs nothing, but that nation won't talk again for 30 s.
- **Betrayal:** attacking, striking or landing on a partner asks you to tap twice, then breaks the deal.
  - They seek revenge for 2 min.
  - They refuse talks for 4 min.
  - Every nation charges 50% more for 2.5 min.
- Deals show as HUD chips, as ALLY/TRUCE tags in the nation list, and on the map labels. Iran's Drone rush never targets your partners.
- New achievement **Peacemaker**: 5 treaties, +40 pearls.
- The Balance tab has the ceasefire length, alliance length and a price multiplier.

### 11. Cruise missiles and counter-battery radar — `9d6ba71`

- **Cruise missile** for every nation, fired from silos. It costs 300 gold and has a small, precise 1.5-tile blast.
  - It flies low: radar never tracks it, and the target only sees it within 5 tiles.
  - Air defense can engage it only at half its range, with a lower hit chance (×0.6).
- **Handicap for Iraq, Iran and Yemen:** 1.5× cost, 1.4× reload, and 2 silo slots per launch. A silo too small for that fires from a full magazine and reloads proportionally longer (2 slots on a 1-slot silo means twice the reload).
- **Counter-battery radar** (new building, 160 gold): when an enemy silo inside its 55-tile range fires, that silo stays revealed to you for 30 s instead of 10, with a map ping and an alert. AI nations build and use them too.
- There's a "Cruise missile inbound" warning when one is spotted close in. The AI picks a cruise missile about a third of the time it fires a missile.
- New achievement **Under the radar**: 10 cruise hits, +40 pearls.
- The Balance tab has cruise stats, visibility, how far air defense reaches, a per-nation handicap checkbox, and the counter-battery range and reveal time.

### 12. Realistic mode — `99f11f0`

- A **Realistic** switch sits next to the Begin campaign button and is remembered between sessions. When it's on, the button turns red-sand and the rules are shown below it.
- It applies to **every nation**: gold income ×0.5, and taking land costs ×2.
- Rewards:
  - pearls ×1.5 per campaign
  - deals with AI nations 25% cheaper
  - new achievement **Hard truths**: win on Realistic, +120 pearls
  - a separate "best on Realistic" in your stats
- In-game it shows as a "Realistic" chip and on the end screen. The daily challenge ignores it.
- The Balance tab has all four multipliers.

### 13. Online multiplayer (host runs the game) — `9b6fea5`

- **How it works:** the host's browser runs the simulation. A Cloudflare Durable Object (`GameRoom`, one per game) holds the lobby and relays messages:
  - players' orders go to the host
  - the host's game state goes to everyone else (5 snapshots a second)
- **Home card "Play online"** (needs Google sign-in): create a game, or join with a 5-character code. Invite links look like `…/gulf-dominion/#room=CODE` and still work after the sign-in redirect.
- **Lobby:**
  - up to 9 players, each nation can be picked once
  - host badge and connection dots for each player
  - the host sets heat (1–5) and the Realistic switch
  - Start needs 2 connected players with nations; anyone without a nation watches as a spectator
- **Online rules:**
  - no Majlis upgrades
  - every weapon and ability unlocked
  - speed fixed at 1×
  - no diplomacy or decrees
  - AI runs every nation nobody picked
  - win by holding 60% of the land, or by being the last player standing
  - if every player falls, the AI with the most land wins
- **Disconnects:** a dropped player's nation is run by the AI until they reconnect, which happens automatically. Reloading the page and opening the invite link also rejoins. If the host drops, the others see a "waiting for the host" bar.
- **Menu (II button):** shows every player's land. The host can end the game for everyone; it's then scored on current land.
- **Results screen** for everyone: winner, each player's peak land and kills, and pearls earned (peak, kills, time, win bonus, heat and Realistic multipliers). Online games and wins are counted on the home card.
- **Server:**
  - routes: `POST /api/rooms`, `GET /api/rooms/:code`, and the WebSocket at `/ws/room/:code`
  - the WebSocket checks the site origin and the session token
  - `room_created` is logged; clients log `mp_end`
- **Tested locally with two players:** lobby, picking, start, guest attacks, builds and missile strikes, impact and intercept messages on both sides, a guest reload and rejoin, disconnect and AI takeover, and host ending with results. After deploy, the live routes reject unsigned requests (401) and other sites (403).
- **Limits:**
  - the host should keep the tab open and on screen; a phone host that locks its screen pauses the game for everyone
  - if the host's page reloads, that game ends
  - not tested yet with real people on separate phones

### 14. Home order — `639864b`

- Begin campaign (with the heat picker and Realistic switch) now always sits right under the map and the dhow fleet card, above the daily challenge and Play online.

### 15. PC tooltips and build menu — `2c4eeac`

- PC only (mouse, window at least 900px wide). Phones keep the old layout.
- **Hover a building** on the map to see its name, owner, what it does (using that nation's own bonuses) and its live status, e.g. interceptors ready or reload time. Only buildings you can see get a tooltip, so hidden silos stay hidden.
- **Hover a build button** to see what the building does, its cost, and whether you can afford it.
- **The build menu is always visible** in one row in every mode, so you can see what you can afford. Clicking a building switches to Build mode.

### 16. Combat simulation and rebalance — `cf26abe`

- **How it was tested:** ran the real game code in the browser with a temporary test hook (since removed). Iraq attacked Kuwait with neutral stats, no AI and no regen, and each case was repeated. Also measured expansion into empty land, counters, forts, troop regen by nation size and strike damage.
- **What was wrong:**
  - empty land costs a steady ~4.4 troops per tile
  - wars ended in 2–9 seconds, too fast to react to
  - twice the defender's troops always wiped them out in one wave
  - 3 border forts only cut losses from 87 tiles to 72
  - regen grew with every tile, so big nations snowballed
  - a 45-gold drone killed 3% of a nation's whole army (620 troops of 20,000)
- **Changes**, all in the new **Combat** card of the Balance tab:
  - attack speed ×0.5
  - defender density weight 1.1 → 1.5
  - defender losses 0.5 → 0.35 × tile cost
  - fort ×1.8 → ×2.5
  - ring around the capital ×1.5 → ×2
  - regen 18 + 0.45/tile → 30 + 0.3/tile
  - strike troop damage ×0.5
- **Results after the change:**

  | Situation | Before | After |
  |---|---|---|
  | Equal troops | 47% of land lost in ~6s | 39% lost in ~10s |
  | Equal troops, counter-attack after 2s | — | 19% lost |
  | Twice the troops | wiped out | 77% lost, survives |
  | Three times the troops | — | wiped out |
  | 3 forts, equal troops | 39% lost | 24% lost |
  | 3 forts and a counter, equal troops | — | 12% lost |
  | Regen, 50-tile nation | — | +11% |
  | Regen, 2000-tile nation | — | −29% |

  Empty land still costs ~4.4 troops per tile but takes twice as long to take.

### 17. Keybinds — `99736a9`

- **Keys 1, 2, 3 and 4** switch to Attack, Boat, Strike and Build during a game.
- On PC the mode buttons show their key number.
- Keys are ignored while typing, while a menu is open, or with Ctrl, Alt or Cmd held.

### 18. Notices at the top — `50ae1a3`

- Game notices now sit just under the top bar. Before, they sat above the bottom menu, where the PC build row hid them.
- On PC they're centred. On phones they're left-aligned so they clear the nation list.
- World news moves below an active notice.

### 19. Expansion fills gaps — `07497eb`

- **The problem:** expanding left scattered empty tiles. A simulation of 8 expansions (about 860 tiles) left 26–30 enclosed holes, mostly single tiles, plus about 50 tiles with empty land on three sides.
- **Fix 1:** attacks now take any tile that has the attacker's land on 3 or more sides before pushing on. In the same test there were 0 holes left, with the same land gained in the same time.
- **Fix 2 (safety net):** once a second, any empty pocket of up to 30 tiles that touches only one nation's land joins that nation for free. Bigger pockets are left alone. It costs under 1 ms.
- **Dashboard:** Balance → Combat → "Auto-claim empty pockets up to N tiles" (0 turns it off).

### 20. Radar "aggression" investigated — `e557929`

- **Question:** does building a radar make nations attack you?
- **Test:** seeded A/B simulations, replaying the same game with and without the radar.
- **Answer: no.** Over 5 games at Heat 1, after building a city vs a radar at 2:00:

  | | City | Radar |
  |---|---|---|
  | Ground attacks on you | 55 | 53 |
  | Strikes at you | 73 | 68 |
  | Warnings you see | 5 | 31 |

  - Any first building (city, fort or radar) draws the same strikes. Air defense draws about twice as many.
  - The radar reveals about 6 times more incoming strikes, and each tracked missile used to play its own siren, so a salvo sounded like a new assault.
- **Fix:**
  - A new radar says how many strikes were already heading your way.
  - One siren per salvo and one tracking ping every 2s.
  - The radar notice counts how many missiles are inbound.

### 21. Missile craters — `53ed891`

- **Missiles only** (ballistic and cruise) empty the **core of the blast**, half the blast radius, back to unowned land, and any building there is gone. Missile I empties about 5 tiles, Missile III about 13. Drones never crater.
- **Capitals:** a capital's own tile is never emptied.
- **Elimination:** a nation whose last tiles are cratered is eliminated.
- **Refilling:**
  - craters are skipped by the auto-claim for **30 s**
  - meanwhile anyone bordering a crater can expand into it at the empty-land cost
  - after 30 s, a crater enclosed by one nation is claimed back automatically
- **Tested:** Missile I emptied 5/5 core tiles and left the outer 8 owned. The crater was still empty at 25 s and refilled by 35 s. A drone left no crater. A direct hit on a capital kept the capital's tile.
- **Dashboard:** Balance → Combat → "Missile crater size" (× blast radius, 0 = off) and "Crater stays empty for" (seconds).

### 22. Why Bahrain snowballed; perks in the dashboard — `1b702c0`

- **Test:** all-AI simulations, 8–12 seeded games per variant, 8 minutes each.

  | Variant | Bahrain at 8 min | Biggest nation (games) |
  |---|---|---|
  | Old perks | 27% | Bahrain 7 of 8 |
  | No coastal gold | 26% | Bahrain 6 of 6 |
  | No regen bonus | 11% | Iraq 4, Iran 3, Bahrain 1 |
  | Bahrain +12%, Iraq +10% (applied) | 17% | Iran 5, Bahrain 4, UAE 1 |

- **Cause:** Bahrain's +35% troop regen. Regen grows with land, so a percentage bonus compounds. With it removed, Iraq's +25% ran away instead.
- **Change:** Bahrain regen +35% → +12%, Iraq +25% → +10%.
- **Dashboard:** a new **Nation perks** card in the Balance tab holds every nation's perk numbers. The nation cards in the game describe the live numbers.
- **Also found, not fixed yet:** Yemen collapses to 0–2% of the land by 8 minutes in every all-AI simulation.

### 23. Why Yemen collapsed; AI breather — `70099a0`

- **Test:** all-AI simulations, 10 seeded games per variant, 8 minutes each (Yemen's land at 8 min).

  | Variant | Yemen average | Yemen eliminated | Side effect |
  |---|---|---|---|
  | Old rules (seeds 1–10 / 11–20) | 2.4% / 1.2% | 7 / 8 of 10 | — |
  | No strike troop damage | 1.3% | 8 of 10 | — |
  | Yemen defense +40% / +80% | 3.2% / 2.9% | 5 / 6 of 10 | — |
  | Max 1–2 nations attacking at once | 2.4–2.6% | 5–7 of 10 | — |
  | Blocs off | 12.9% | 0 of 10 | Kuwait 3.8%, Iraq/Iran 18–21% |
  | Bloc ×1.5, 50% chance | 10.0% | 0 of 10 | Kuwait 0.6% |
  | **Breather 4% / 60 s (applied), seeds 1–10 / 11–20** | **7.2% / 6.9%** | **0 of 20** | others 5–19% |

- **Cause:** the bloc rule. AIs treat same-bloc nations as ×6 less attractive and attack them only 5% of the time, so Yemen is the only rival-bloc land target for five GCC AIs (Iran is protected by sea, Iraq only borders Kuwait and Saudi). Once empty land runs out (~300 s), Qatar, Bahrain, UAE, Oman and Saudi attack it one after another. Over 10 games Qatar opened 88 attacks on Yemen, and Bahrain sent 9–11k-troop waves. Yemen's army ended up at ~1 troop per tile, so each tile cost attackers only ~5 troops. Missile and drone losses were normal. The attacks came one after another, not all at once, so capping simultaneous attackers did nothing.
- **Change:** a nation that has recently lost a big share of its land gets a breather. Once its losses in the last ~60 s pass 4% of its land, other AIs stop opening new attacks and boat landings on it until the losses fade. Attacks already under way carry on. It never protects the player.
- **Dashboard:** a new **AI targeting** card in the Balance tab holds the same-bloc weight (×6), the same-bloc attack chance (5%), the breather threshold (0.04) and the fade time (60 s).

### 24. Yemen stronger on land and in the mountains — `b16af81`

- **New Yemen bonuses:** troop regen +20%, defense +25% on all its land, and +60% defense on its mountain tiles. The mountain defense is a new perk stat, editable in the Nation perks card.
- **Simulation** (all-AI, 8 seeded games each):

  | Yemen's bonuses | Land at 8 min | Worst game | Land at 12 min |
  |---|---|---|---|
  | Before | 7.2% | 5.2% | 5.6% |
  | Defense only | 7.1% | — | 5.6% |
  | Regen +12% | 9.0% | 7.2% | — |
  | **Regen +20% (applied)** | **11.6%** | **9.2%** | **11.3%** |

  - Defense alone didn't help, because Yemen gets drained to about one troop per tile.
  - With the applied bonuses Yemen sits mid-table without snowballing, and the lead stays spread across nations.

### 25. No right-click menu — `0fbfc0e`

- The browser's right-click menu (Copy, Save image…) is blocked everywhere in the game.
- Phones no longer show the long-press callout, and images and the map can't be dragged out.
- Text fields keep the menu so game codes can be pasted.
- The admin dashboard is unchanged.

### 26. Win at 80% — `715686f`

- A campaign (and an online game) is now won at **80%** of the land, up from 60%. Every in-game text uses the new number.
- Decree milestones were extended with 60% and 70%.

### 27. Steeper heat; no blocs in Realistic — `01d7052`

- **Heat:** each level above 1 now adds roughly twice as much for AI rivals. Heat 1 is unchanged.
  - regen and troop cap +0.2 per level
  - starting troops +20% per level
  - they attack sooner and send bigger waves
  - they focus on you more
  - strikes start 20 s earlier per level
  - all 7 steps are in a new **Heat difficulty** card in the Balance tab
- **Test** with a scripted player (5 games per heat), average survival out of 8 minutes:

  | Heat | Old steps | New steps |
  |---|---|---|
  | 2 | 6.4 min | 5.9 min |
  | 3 | 5.1 min | 4.2 min |
  | 5 | 4.8 min | 2.7 min |

  Heat 1 played out identically.
- **Realistic** turns off bloc loyalty for everyone: the GCC states fight each other, and so do Iraq, Iran and Yemen. In AI-only games, same-bloc attacks went from 8% to 79% of all attacks.

### 28. Realistic bloc loyalty as a dial — `0320a3f`

- Realistic now weakens bloc loyalty instead of turning it off. The setting runs from 1 (normal blocs) to 0 (none); the default is **0.8**.
- **Share of attacks that stay inside a bloc** (AI-only Realistic games, 5 per value):

  | Loyalty | Same-bloc attacks |
  |---|---|
  | 1 | 19% |
  | 0.9 | 32% |
  | 0.8 | 55% |
  | 0.6 | 69% |
  | 0.3 | 74% |
  | 0 | 80% |

  - The curve is steep near 1 because most nations only border their own bloc.
  - 0.8 splits wars about half and half and gave the most even land spread.
- **Dashboard:** Balance → Rules → "Realistic: bloc loyalty".

### 29. Illustrated guide — `7d6c012`

- **Pictures:** every How to play section (23 of them) has a picture drawn on canvas with the game's own colours and building icons, so there are no image files.
- **New sections:** craters, and keyboard and mouse.
- **Live numbers:** the times and percentages in the guide come from the balance settings.
- **Layout:** a wider window on PC with larger pictures; compact on phones. Checked at both sizes.

### 30. Drone rush spreads targets — `d089a9a`

- **Change:** each rush drone takes the enemy building with the fewest drones already aimed at it, counting every hangar in the rush and drones already in flight.
- **Test:** 12 drones at 6 buildings hit each one exactly twice. Random picking used to miss about 0.7 buildings per rush.

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
| Cruise missile | 300 | 1.5 | 5 | All; untracked by radar, seen within 5 tiles, air defense at half range; Iraq/Iran/Yemen ×1.5 cost, ×1.4 reload, 2 silo slots |

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
| Diplomacy | Ceasefire 60 s, alliance 180 s, price ×1 |
| Counter-battery | 55-tile range, silos revealed 30 s |
| Realistic mode | Gold ×0.5, land ×2 (everyone), bloc loyalty 0.8, pearls ×1.5, diplomacy ×0.75 |
| Heat (per level above 1) | AI regen +0.2, cap +0.2, starting troops +20%, attack threshold −0.1, send share +0.12, player focus +0.12, strikes 20 s earlier |
| Combat | Attack speed ×0.5 · tile cost 4 + 1.5 × defender troops per tile · defender loses 0.35 × cost · fort ×2.5 · capital ×4, ring ×2 · regen 30 + 0.3/tile · cap 300 + 10/tile · strike troop damage ×0.5 · empty pockets up to 30 tiles auto-claimed · missile craters 0.5 × blast radius, empty for 30 s |
| Nation perks | KW oil ×1.6 · SA troop cap ×1.2 · BH regen ×1.12, coastal gold · QA gold ×1.4 · AE cities ×0.65 cost · OM mountains ×0.5, defense ×1.15 · IQ regen ×1.1, +100 cap per city · IR missiles ×0.7, starts with a silo · YE attacks ×0.75, expansion ×0.85, mountains ×0.5, cap ×1.2, defense ×1.25, mountain defense ×1.6, regen ×1.2 |
| AI targeting | Same-bloc target ×6, attacked 5% of the time · breather: no new AI attacks or landings on a nation that lost over 4% of its land recently (fades over 60 s); never shields the player |
| Win condition | 80% of the land, or every rival eliminated (online: or last player standing) |

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
- [ ] **Online play with real people:** play a full game on two or more phones over mobile data. Check that the game keeps going when the host's screen is on but the tab is in the background.
- [x] **Yemen collapses early** in AI-only simulations (0–2% land by 8 min). Fixed in `70099a0` with the AI breather: Yemen now averages ~7%. It's still the smallest nation on average, so watch it in real games.
- [ ] Achievement thresholds for pearl rewards (10%, 30%, 50 interceptions, …) are fixed in code; only the four unlock goals are in the Balance tab.

## Ideas suggested but not built

- Online phase 3: player-to-player diplomacy, quick chat, a public game list

- Rival-specific events (e.g. a GCC summit truce, an oil embargo)
- Nation-specific decree cards
