CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data)),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_rotation (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT OR IGNORE INTO admin_rotation (id, revision) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS panel_login (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO panel_login (id) VALUES (1);
