-- Gulf Dominion D1 schema. Apply with:
--   npx wrangler d1 execute gulf-dominion --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email ON users(email);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL -- client clock, ms
);

-- One row per grant. Permanent unlocks: item = 'all_nations' | 'founder' | 'theme_night' | 'border_gold'.
-- Pearl bundles: item = 'pearls', qty = number of pearls.
CREATE TABLE IF NOT EXISTS entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL,
  order_id TEXT UNIQUE,
  revoked INTEGER NOT NULL DEFAULT 0,
  granted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ent_user ON entitlements(user_id, item);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KWD',
  kind TEXT NOT NULL, -- unlock | pearls | cosmetic
  payload TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL, -- pending | paid | failed
  mode TEXT NOT NULL,   -- test | live
  return_url TEXT,
  mf_invoice_id TEXT,
  mf_payment_id TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  user_id INTEGER,
  level TEXT NOT NULL,
  event TEXT NOT NULL,
  data TEXT
);
CREATE INDEX IF NOT EXISTS logs_ts ON logs(ts);
CREATE INDEX IF NOT EXISTS logs_event ON logs(event, ts);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Starter store. Prices are placeholders in KWD; change them in the admin dashboard.
INSERT OR IGNORE INTO products (id, name, description, price, currency, kind, payload, active, sort) VALUES
 ('all_nations', 'All nations pack', 'Unlock Bahrain, Qatar, UAE, Oman, Iraq, Iran and Yemen forever.', 2.5, 'KWD', 'unlock', '{"item":"all_nations"}', 1, 10),
 ('founder', 'Founder''s perk', 'Permanent +1 decree choice, a free air defense battery every campaign, and a Founder badge.', 3.0, 'KWD', 'unlock', '{"item":"founder"}', 1, 20),
 ('pearls_500', '500 pearls', 'A pouch of 500 pearls for Majlis upgrades.', 0.5, 'KWD', 'pearls', '{"pearls":500}', 1, 30),
 ('pearls_3000', '3,000 pearls', 'A chest of 3,000 pearls for Majlis upgrades.', 2.0, 'KWD', 'pearls', '{"pearls":3000}', 1, 40),
 ('theme_night', 'Night map theme', 'Play the whole map under a moonlit palette. Cosmetic only.', 0.75, 'KWD', 'cosmetic', '{"item":"theme_night"}', 1, 50),
 ('border_gold', 'Gold borders', 'Draw your borders in gold. Cosmetic only.', 0.5, 'KWD', 'cosmetic', '{"item":"border_gold"}', 1, 60);
