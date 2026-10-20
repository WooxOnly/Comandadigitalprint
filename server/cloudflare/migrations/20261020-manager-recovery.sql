-- Additive, repeatable. Reset tokens never share the owner or invitation tables.
CREATE TABLE IF NOT EXISTS manager_password_recovery (
 user_id TEXT PRIMARY KEY REFERENCES manager_users(id) ON DELETE CASCADE,
 token_hash TEXT UNIQUE,
 password_revision INTEGER NOT NULL,
 client_id TEXT NOT NULL,
 client_revision INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 used_at INTEGER
);
CREATE TABLE IF NOT EXISTS manager_recovery_limits (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 reset_at INTEGER NOT NULL
);

-- Keep day/month reports from reading the entire 120-day synchronization store.
CREATE INDEX IF NOT EXISTS production_orders_by_date ON store_records(
 store_id,julianday(json_extract(data,'$.createdAt'))
) WHERE key GLOB 'order:*';
