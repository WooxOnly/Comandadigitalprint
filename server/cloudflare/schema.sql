CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data)),
  updated_at TEXT NOT NULL
);
