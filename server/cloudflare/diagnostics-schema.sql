CREATE TABLE IF NOT EXISTS diagnostics (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  code TEXT NOT NULL,
  order_id TEXT
);
CREATE INDEX IF NOT EXISTS diagnostics_received ON diagnostics(received_at);
