PRAGMA foreign_keys=ON;
ALTER TABLE ideas ADD COLUMN factual_claims TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ideas ADD COLUMN source_references TEXT NOT NULL DEFAULT '[]';
ALTER TABLE contents ADD COLUMN cta TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN hashtags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE contents ADD COLUMN estimated_duration INTEGER;
ALTER TABLE contents ADD COLUMN warnings TEXT NOT NULL DEFAULT '[]';
ALTER TABLE contents ADD COLUMN scenes TEXT NOT NULL DEFAULT '[]';

CREATE TABLE ai_executions(
 id TEXT PRIMARY KEY, content_id TEXT REFERENCES contents(id) ON DELETE SET NULL, topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
 operation TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN('SUCCEEDED','FAILED')),
 input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, estimated_cost_usd REAL NOT NULL DEFAULT 0,
 error_code TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE render_plans(
 id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE, version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL CHECK(status IN('DRAFT','NEEDS_MEDIA','READY_TO_RENDER','SUPERSEDED')), aspect_ratio TEXT NOT NULL,
 target_duration INTEGER NOT NULL, plan_json TEXT NOT NULL, validation_errors TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(content_id,version)
);
CREATE TABLE renders(
 id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE, render_plan_id TEXT NOT NULL REFERENCES render_plans(id),
 provider TEXT NOT NULL, external_render_id TEXT, status TEXT NOT NULL CHECK(status IN('SUBMITTING','RENDERING','RENDERED','FAILED')),
 video_url TEXT, error_code TEXT, error_detail TEXT, metadata TEXT NOT NULL DEFAULT '{}', started_at TEXT, submitted_at TEXT,
 last_polled_at TEXT, completed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_renders_external ON renders(provider,external_render_id) WHERE external_render_id IS NOT NULL;
CREATE INDEX idx_renders_content_status ON renders(content_id,status,created_at DESC);
CREATE INDEX idx_ai_executions_topic ON ai_executions(topic_id,created_at DESC);
