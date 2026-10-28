-- Additive: existing catalog, orders, preparation and sales remain unchanged.
CREATE TABLE IF NOT EXISTS online_client_modules (
 client_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 scheduling INTEGER NOT NULL DEFAULT 0 CHECK(scheduling IN(0,1)),
 tables_enabled INTEGER NOT NULL DEFAULT 0 CHECK(tables_enabled IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS online_store_presets (
 store_id TEXT PRIMARY KEY REFERENCES stores(id), table_count INTEGER NOT NULL DEFAULT 0 CHECK(table_count BETWEEN 0 AND 999),
 qr_mode TEXT NOT NULL DEFAULT 'per-table' CHECK(qr_mode IN('per-table','generic')),
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS online_store_settings (
 store_id TEXT PRIMARY KEY REFERENCES stores(id), data TEXT NOT NULL CHECK(json_valid(data)),
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS online_requests (
 store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL,
 fingerprint TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, actor TEXT,
 PRIMARY KEY(store_id,id)
);
CREATE INDEX IF NOT EXISTS online_requests_queue ON online_requests(store_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS online_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, store_id TEXT NOT NULL, client_id TEXT NOT NULL,
 actor TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS online_rate_limits (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS online_product_photos (
 store_id TEXT NOT NULL REFERENCES stores(id), product_id TEXT NOT NULL,
 image TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(store_id,product_id)
);
