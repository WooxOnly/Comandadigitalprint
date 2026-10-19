-- Customer portal invitations; the existing username column stores normalized
-- e-mail addresses for portal accounts. Legacy identifiers require an owner to
-- add the real e-mail; never guess an address or replace the account ID.
CREATE TABLE IF NOT EXISTS manager_user_invitations (
  user_id TEXT PRIMARY KEY REFERENCES manager_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE,
  password_revision INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  needs_password INTEGER NOT NULL DEFAULT 1 CHECK(needs_password IN (0,1)),
  delivery_status TEXT NOT NULL CHECK(delivery_status IN ('pending','sent','failed','accepted')),
  sent_at INTEGER,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS manager_invitation_expiry ON manager_user_invitations(expires_at);
