CREATE TABLE IF NOT EXISTS panel_password (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0)
);
