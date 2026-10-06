-- Run after schema.sql, cloud-schema.sql, and diagnostics-schema.sql, before deploying
-- the store-aware Worker. Legacy tables remain intact as a rollback copy.
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT OR IGNORE INTO stores(id, name, active) VALUES ('seabra-1', 'Seabra 1', 1);

-- Optional modules are managed only by the owner's portal. Existing stores
-- keep their kitchen-only behavior until explicitly enabled.
CREATE TABLE IF NOT EXISTS store_modules (
  store_id TEXT PRIMARY KEY REFERENCES stores(id),
  preorders INTEGER NOT NULL DEFAULT 0 CHECK (preorders IN (0, 1)),
  cash INTEGER NOT NULL DEFAULT 0 CHECK (cash IN (0, 1))
);
-- Separate table keeps this migration safe to re-run on existing installations.
CREATE TABLE IF NOT EXISTS store_customer_modules (
  store_id TEXT PRIMARY KEY REFERENCES stores(id), enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
);

CREATE TABLE IF NOT EXISTS store_preparation_modules (
  store_id TEXT PRIMARY KEY REFERENCES stores(id), enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
);
CREATE TABLE IF NOT EXISTS store_access_settings (
  store_id TEXT PRIMARY KEY REFERENCES stores(id), data TEXT NOT NULL CHECK (json_valid(data))
);
CREATE TABLE IF NOT EXISTS store_admin_activity (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, store_id TEXT NOT NULL REFERENCES stores(id),
  created_at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  store_id TEXT NOT NULL REFERENCES stores(id), id TEXT NOT NULL,
  device_id TEXT NOT NULL, opened_by TEXT NOT NULL, opened_at TEXT NOT NULL,
  opening_cents INTEGER NOT NULL CHECK (opening_cents >= 0),
  closed_at TEXT, closed_by TEXT, counted_cents INTEGER CHECK (counted_cents >= 0),
  PRIMARY KEY(store_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_cash_per_tablet
  ON cash_sessions(store_id, device_id) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS cash_entries (
  store_id TEXT NOT NULL, id TEXT NOT NULL, session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('sale', 'in', 'out')),
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'zelle')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TEXT NOT NULL, actor TEXT NOT NULL, note TEXT NOT NULL,
  order_id TEXT, data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY(store_id, id), UNIQUE(store_id, order_id),
  FOREIGN KEY(store_id, session_id) REFERENCES cash_sessions(store_id, id)
);
CREATE INDEX IF NOT EXISTS cash_entries_by_session ON cash_entries(store_id, session_id);

CREATE TABLE IF NOT EXISTS store_cash_settings (
  store_id TEXT PRIMARY KEY REFERENCES stores(id), data TEXT NOT NULL CHECK (json_valid(data))
);
-- Reversals preserve the original sale and can only return its full amount once.
CREATE TABLE IF NOT EXISTS cash_adjustments (
  store_id TEXT NOT NULL, id TEXT NOT NULL, sale_id TEXT NOT NULL, session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('void', 'refund')),
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'zelle')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL,
  PRIMARY KEY(store_id, id), UNIQUE(store_id, sale_id),
  FOREIGN KEY(store_id, sale_id) REFERENCES cash_entries(store_id, id),
  FOREIGN KEY(store_id, session_id) REFERENCES cash_sessions(store_id, id)
);
CREATE INDEX IF NOT EXISTS cash_adjustments_by_session ON cash_adjustments(store_id, session_id);
CREATE INDEX IF NOT EXISTS cash_entries_by_date ON cash_entries(store_id, created_at);
CREATE INDEX IF NOT EXISTS cash_adjustments_by_date ON cash_adjustments(store_id, created_at);

-- Partial/multiple refunds preserve legacy full reversals and immutable receipts.
CREATE TABLE IF NOT EXISTS cash_refunds (
  store_id TEXT NOT NULL, id TEXT NOT NULL, sale_id TEXT NOT NULL, session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('void', 'refund')), method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), created_at TEXT NOT NULL,
  actor TEXT NOT NULL, reason TEXT NOT NULL, data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY(store_id, id),
  FOREIGN KEY(store_id, sale_id) REFERENCES cash_entries(store_id, id),
  FOREIGN KEY(store_id, session_id) REFERENCES cash_sessions(store_id, id)
);
CREATE INDEX IF NOT EXISTS cash_refunds_by_sale ON cash_refunds(store_id, sale_id);
CREATE INDEX IF NOT EXISTS cash_refunds_by_date ON cash_refunds(store_id, created_at);
CREATE INDEX IF NOT EXISTS cash_refunds_by_session ON cash_refunds(store_id, session_id);
CREATE VIEW IF NOT EXISTS cash_reversals AS
  SELECT store_id, id, sale_id, session_id, kind, method, amount_cents, created_at, actor, reason, NULL AS data FROM cash_adjustments
  UNION ALL SELECT store_id, id, sale_id, session_id, kind, method, amount_cents, created_at, actor, reason, data FROM cash_refunds;
-- Each payment leg contributes once to its payment method and drawer balance.
CREATE VIEW IF NOT EXISTS cash_movements AS
  SELECT e.store_id, e.session_id, e.kind, e.method, e.amount_cents FROM cash_entries e
    WHERE e.kind != 'sale' OR json_type(e.data, '$.payments') IS NULL
  UNION ALL SELECT e.store_id, e.session_id, e.kind, json_extract(p.value, '$.method'), json_extract(p.value, '$.amountCents')
    FROM cash_entries e, json_each(e.data, '$.payments') p WHERE e.kind = 'sale'
  UNION ALL SELECT a.store_id, a.session_id, 'reversal', a.method, -a.amount_cents FROM cash_reversals a WHERE a.data IS NULL
  UNION ALL SELECT a.store_id, a.session_id, 'reversal', json_extract(p.value, '$.method'), -json_extract(p.value, '$.amountCents')
    FROM cash_refunds a, json_each(a.data, '$.payments') p;

CREATE TABLE IF NOT EXISTS store_codes (
  code INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL UNIQUE REFERENCES stores(id)
);
-- Assign permanent numbers to existing stores before new inserts use the trigger.
INSERT INTO store_codes(store_id)
  SELECT s.id FROM stores AS s WHERE NOT EXISTS (SELECT 1 FROM store_codes WHERE store_id = s.id) ORDER BY s.rowid;
CREATE TRIGGER IF NOT EXISTS store_assign_code AFTER INSERT ON stores BEGIN
  INSERT INTO store_codes(store_id) VALUES (NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS store_code_immutable BEFORE UPDATE OF code, store_id ON store_codes BEGIN
  SELECT RAISE(ABORT, 'Store code cannot be changed');
END;

CREATE TABLE IF NOT EXISTS store_tablet_numbers (
  store_id TEXT NOT NULL REFERENCES stores(id),
  device_id TEXT NOT NULL,
  number INTEGER NOT NULL CHECK (number > 0),
  PRIMARY KEY (store_id, device_id),
  UNIQUE (store_id, number)
);
CREATE TRIGGER IF NOT EXISTS store_tablet_number_immutable BEFORE UPDATE OF store_id, device_id, number ON store_tablet_numbers BEGIN
  SELECT RAISE(ABORT, 'Tablet number cannot be changed');
END;

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
