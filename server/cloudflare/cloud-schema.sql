CREATE TABLE IF NOT EXISTS cloud_records (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(json_valid(data)),
  revision INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS cloud_apply_event AFTER INSERT ON cloud_events BEGIN
  INSERT INTO cloud_records(key, data, revision) VALUES(NEW.key, NEW.data, NEW.seq)
  ON CONFLICT(key) DO UPDATE SET data = excluded.data, revision = excluded.revision;
END;
CREATE TABLE IF NOT EXISTS cloud_login_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
