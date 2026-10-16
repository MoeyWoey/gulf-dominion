# Deploying Gulf Dominion

The project has two parts:

| Folder | What it is | Where it runs |
|---|---|---|
| `docs/` | The game (`index.html`) and the admin dashboard (`admin.html`) | GitHub Pages (or the Worker itself) |
| `worker/` | Backend: Google sign-in, cloud saves, logs, store, MyFatoorah | Cloudflare Workers + D1 database |

Without a backend address the game runs in offline mode (local saves only), which is what the artifact link uses.

You need: a GitHub account, a Cloudflare account (free plan is fine), a Google Cloud account, and your MyFatoorah portal login. Run every command from the `worker/` folder unless it says otherwise.

---

## 1. Create the database and log in to Cloudflare

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create gulf-dominion
```

The last command prints a `database_id`. Paste it into `worker/wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`, then create the tables and starter store items:

```bash
npm run db:init
```

## 2. Deploy the Worker once to get its address

Generate a session secret and store it (it signs logins and encrypts the MyFatoorah keys you save in the dashboard):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Note the address it prints, for example `https://gulf-dominion.YOURNAME.workers.dev`. This guide calls it **WORKER_URL**.

> Changing `SESSION_SECRET` later signs everyone out and makes saved MyFatoorah keys unreadable, so you'd have to paste them again.

## 3. Google sign-in

1. Open <https://console.cloud.google.com/>, create a project (e.g. "Gulf Dominion").
2. **APIs & Services → OAuth consent screen**: choose External, fill in the app name and support email, add the scopes `openid`, `email`, `profile`, then **Publish app** (otherwise only test users can sign in).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized redirect URI: `WORKER_URL/auth/google/callback`
4. Copy the **Client ID** into `GOOGLE_CLIENT_ID` in `worker/wrangler.toml`.
5. Store the **Client secret**:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## 4. Host the game on GitHub Pages

1. Create a GitHub repository (e.g. `gulf-dominion`) and push this whole folder to it. The `.gitignore` keeps `node_modules`, `.dev.vars` and local data out.
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`.**
3. Your game address is `https://YOUR-GITHUB-USERNAME.github.io/gulf-dominion/`.
4. In `docs/index.html` **and** `docs/admin.html`, set the backend address:

```html
<meta name="gd-api" content="WORKER_URL">
```

5. In `worker/wrangler.toml`, set `ALLOWED_ORIGINS = "https://YOUR-GITHUB-USERNAME.github.io"` (just the origin, no path, no trailing slash).
6. Commit and push the `docs/` change, then redeploy the Worker:

```bash
npx wrangler deploy
```

**Alternative: everything on Cloudflare.** Skip GitHub Pages, set `<meta name="gd-api" content="/">` in both HTML files, and run `npx wrangler deploy`. The Worker then serves the game at `WORKER_URL/` and the dashboard at `WORKER_URL/admin`.

## 5. Admin dashboard and MyFatoorah

1. Open the game, tap **Sign in with Google**, and use an email listed in `ADMIN_EMAILS` (a Worker secret: `npx wrangler secret put ADMIN_EMAILS`).
2. An **Admin** button appears next to your name. Open it, or go to `admin.html`.
3. **Payments API** tab:
   - Paste your MyFatoorah **test** API token (from the test portal: Integration Settings → API Key) and press **Save keys**. Keys are encrypted before storage and only the last 4 characters are ever shown.
   - Press **Test connection**. It should list your payment methods.
   - Copy the **Webhook URL** into the MyFatoorah portal (Integration Settings → Webhook, event "Transaction Status Changed"). Payments still settle without it when the player returns to the game, but the webhook covers players who close the page.
4. **Store** tab: edit names and prices (placeholders are in KWD), hide items, or add new pearl bundles.
5. Buy something in the game with a MyFatoorah **test card** (listed in MyFatoorah's developer docs under "Test Cards"). Check the **Orders** and **Logs** tabs, and that the unlock appears in the game.

### Going live

1. Paste your **live** API token in the Payments API tab and save it.
2. Pick the live region that matches your MyFatoorah account (Kuwait/UAE/Bahrain/Jordan/Oman, Saudi Arabia, Qatar or Egypt).
3. Switch **Mode** to **Live** and press **Save settings**. From then on, real cards are charged.

## What gets logged

Logins, campaign starts and ends (nation, heat, result, peak land, minutes, pearls), store clicks, checkouts, paid and failed payments, admin actions (grants, bans, price and settings changes) and client-side errors. Everything is visible in **Logs**, with filters by event, level and player.

## Store items the game understands

| Item | Effect |
|---|---|
| `all_nations` (unlock) | Unlocks every nation on every device |
| `founder` (unlock) | +1 decree choice, a free air defense battery each campaign, Founder badge |
| `theme_night` (cosmetic) | Night map palette, toggled in the Cosmetics section |
| `border_gold` (cosmetic) | Gold player borders, toggled in the Cosmetics section |
| `pearls` (kind `pearls`, payload `{"pearls":N}`) | Adds N pearls once per purchase |

You can grant or revoke any of these by hand from **Players → Manage**.

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars   # then edit the values
npm run db:init:local
npx wrangler dev --port 8797 --var ALLOWED_ORIGINS:http://localhost:8797
```

Set `<meta name="gd-api" content="/">` while testing locally, and change it back before pushing.
