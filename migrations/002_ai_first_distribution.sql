PRAGMA foreign_keys=ON;

ALTER TABLE ideas ADD COLUMN suggested_hook TEXT NOT NULL DEFAULT '';
ALTER TABLE ideas ADD COLUMN editorial_strategy TEXT NOT NULL DEFAULT '';
ALTER TABLE ideas ADD COLUMN supporting_facts TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ideas ADD COLUMN warnings TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ideas ADD COLUMN recommended INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ideas ADD COLUMN generation_batch_id TEXT;
ALTER TABLE ideas ADD COLUMN generated_by TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE contents ADD COLUMN caption_base TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN mime_type TEXT;
ALTER TABLE assets ADD COLUMN byte_size INTEGER;
ALTER TABLE assets ADD COLUMN original_filename TEXT;
ALTER TABLE assets ADD COLUMN status TEXT NOT NULL DEFAULT 'READY';
ALTER TABLE publications ADD COLUMN provider TEXT;
ALTER TABLE publications ADD COLUMN asset_id TEXT REFERENCES assets(id);
ALTER TABLE publications ADD COLUMN idempotency_key TEXT;
ALTER TABLE publications ADD COLUMN provider_status TEXT;
ALTER TABLE publications ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS social_connections(
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN('NOT_CONFIGURED','CONFIGURED','CONNECTED','TOKEN_EXPIRED','ERROR')),
  external_account_id TEXT,
  display_name TEXT,
  username TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TEXT,
  scopes TEXT NOT NULL DEFAULT '',
  error_code TEXT,
  error_detail TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id,provider)
);
CREATE TABLE IF NOT EXISTS oauth_states(
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  code_verifier_encrypted TEXT,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_idempotency ON publications(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_topic_batch ON ideas(topic_id,generation_batch_id,rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_assets_variant ON assets(content_variant_id,status);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);
