-- Incremental rollout: add the kitchen policy without replaying legacy data migrations.
CREATE TABLE IF NOT EXISTS store_preparation_settings (
  store_id TEXT PRIMARY KEY REFERENCES stores(id),
  allow_reprint INTEGER NOT NULL DEFAULT 0 CHECK (allow_reprint IN (0, 1))
);
