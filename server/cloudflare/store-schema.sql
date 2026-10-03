-- Run after schema.sql, cloud-schema.sql, and diagnostics-schema.sql, before deploying
-- the store-aware Worker. Legacy tables remain intact as a rollback copy.
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT OR IGNORE INTO stores(id, name, active) VALUES ('seabra-1', 'Seabra 1', 1);

CREATE TABLE IF NOT EXISTS store_records (
  store_id TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  revision INTEGER NOT NULL,
  PRIMARY KEY (store_id, key)
);
CREATE TABLE IF NOT EXISTS store_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  mutation TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (store_id, mutation)
);
CREATE INDEX IF NOT EXISTS store_events_after ON store_events(store_id, seq);
CREATE TRIGGER IF NOT EXISTS store_apply_event AFTER INSERT ON store_events BEGIN
  INSERT INTO store_records(store_id, key, data, revision)
  VALUES (NEW.store_id, NEW.key, NEW.data, NEW.seq)
  ON CONFLICT(store_id, key) DO UPDATE SET data = excluded.data, revision = excluded.revision;
END;

CREATE TABLE IF NOT EXISTS store_login_limits (
  store_id TEXT NOT NULL,
  key TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  reset_at INTEGER NOT NULL,
  PRIMARY KEY (store_id, key)
);
CREATE TABLE IF NOT EXISTS store_admin_rotation (
  store_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE IF NOT EXISTS store_diagnostics (
  store_id TEXT NOT NULL,
  id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  code TEXT NOT NULL,
  order_id TEXT,
  PRIMARY KEY (store_id, id)
);
CREATE INDEX IF NOT EXISTS store_diagnostics_received ON store_diagnostics(store_id, received_at);

-- Copy existing Seabra 1 data with its event sequence/revisions unchanged. This
-- script is safe to rerun: records written after the migration are not replaced.
INSERT OR IGNORE INTO store_events(seq, store_id, mutation, key, data, actor, created_at)
  SELECT seq, 'seabra-1', mutation, key, data, actor, created_at FROM cloud_events ORDER BY seq;
INSERT OR IGNORE INTO store_records(store_id, key, data, revision)
  SELECT 'seabra-1', key, data, revision FROM cloud_records;
INSERT OR IGNORE INTO store_admin_rotation(store_id, revision)
  SELECT 'seabra-1', revision FROM admin_rotation WHERE id = 1;
INSERT OR IGNORE INTO store_login_limits(store_id, key, attempts, reset_at)
  SELECT 'seabra-1', key, attempts, reset_at FROM cloud_login_limits;
INSERT OR IGNORE INTO store_diagnostics(store_id, id, device_id, created_at, received_at, actor, event, code, order_id)
  SELECT 'seabra-1', id, device_id, created_at, received_at, actor, event, code, order_id FROM diagnostics;
