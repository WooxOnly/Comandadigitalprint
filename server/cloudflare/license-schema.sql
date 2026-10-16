-- Additive and repeatable: no existing data, credentials or module flags change.
CREATE TABLE IF NOT EXISTS client_licenses (
  client_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'blocked')),
  expires_at INTEGER NOT NULL,
  anchor_day INTEGER NOT NULL CHECK(anchor_day BETWEEN 1 AND 31),
  auto_renew INTEGER NOT NULL DEFAULT 1 CHECK(auto_renew IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS client_license_events (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
  action TEXT NOT NULL, actor TEXT NOT NULL, created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL, device_id TEXT
);
CREATE INDEX IF NOT EXISTS client_license_history ON client_license_events(client_id, created_at);
