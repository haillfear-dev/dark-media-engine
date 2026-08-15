PRAGMA foreign_keys=ON;

ALTER TABLE sources ADD COLUMN base_url TEXT;
ALTER TABLE sources ADD COLUMN source_type TEXT NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE sources ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
ALTER TABLE sources ADD COLUMN country TEXT NOT NULL DEFAULT 'BR';
ALTER TABLE sources ADD COLUMN ingestion_strategy TEXT NOT NULL DEFAULT 'RSS';
ALTER TABLE sources ADD COLUMN polling_interval_minutes INTEGER NOT NULL DEFAULT 15 CHECK(polling_interval_minutes >= 1);
ALTER TABLE sources ADD COLUMN last_polled_at TEXT;
ALTER TABLE sources ADD COLUMN last_success_at TEXT;
ALTER TABLE sources ADD COLUMN next_poll_at TEXT;
ALTER TABLE sources ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sources ADD COLUMN etag TEXT;
ALTER TABLE sources ADD COLUMN last_modified TEXT;
ALTER TABLE sources ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'READY';
ALTER TABLE sources ADD COLUMN data_classification TEXT NOT NULL DEFAULT 'REAL' CHECK(data_classification IN('REAL','FIXTURE'));

ALTER TABLE source_items ADD COLUMN canonical_url TEXT;
ALTER TABLE source_items ADD COLUMN normalized_url TEXT;
ALTER TABLE source_items ADD COLUMN subtitle TEXT;
ALTER TABLE source_items ADD COLUMN clean_text TEXT NOT NULL DEFAULT '';
ALTER TABLE source_items ADD COLUMN updated_at TEXT;
ALTER TABLE source_items ADD COLUMN fetched_at TEXT;
ALTER TABLE source_items ADD COLUMN category TEXT;
ALTER TABLE source_items ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE source_items ADD COLUMN language TEXT;
ALTER TABLE source_items ADD COLUMN og_image_url TEXT;
ALTER TABLE source_items ADD COLUMN source_page_url TEXT;
ALTER TABLE source_items ADD COLUMN structured_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE source_items ADD COLUMN ingestion_method TEXT;
ALTER TABLE source_items ADD COLUMN content_hash TEXT;
ALTER TABLE source_items ADD COLUMN normalized_title TEXT;
ALTER TABLE source_items ADD COLUMN depends_on_source_id TEXT REFERENCES sources(id);
ALTER TABLE source_items ADD COLUMN data_classification TEXT NOT NULL DEFAULT 'REAL' CHECK(data_classification IN('REAL','FIXTURE'));

ALTER TABLE topics ADD COLUMN independent_source_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN source_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE topics ADD COLUMN corroboration_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN first_seen_at TEXT;
ALTER TABLE topics ADD COLUMN last_seen_at TEXT;
ALTER TABLE topics ADD COLUMN velocity REAL NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN freshness_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN source_quality_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN novelty_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN saturation_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN priority_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE topics ADD COLUMN factual_status TEXT NOT NULL DEFAULT 'DEVELOPING';
ALTER TABLE topics ADD COLUMN country TEXT;
ALTER TABLE topics ADD COLUMN data_classification TEXT NOT NULL DEFAULT 'REAL' CHECK(data_classification IN('REAL','FIXTURE'));

CREATE TABLE ingestion_runs(
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  items_seen INTEGER NOT NULL DEFAULT 0,
  items_inserted INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  topics_created INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  error_code TEXT,
  error_detail TEXT,
  duration_ms INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}'
);

UPDATE sources SET data_classification='FIXTURE' WHERE id IN('src-1','src-2','src-3');
UPDATE source_items SET data_classification='FIXTURE' WHERE id LIKE 'item-%';
UPDATE topics SET data_classification='FIXTURE' WHERE id LIKE 'topic-%';
UPDATE topics SET priority_score=editorial_priority_score,saturation_score=saturation_risk,freshness_score=CASE freshness WHEN 'BREAKING' THEN 100 WHEN 'VERY_FRESH' THEN 85 WHEN 'FRESH' THEN 65 WHEN 'AGING' THEN 30 ELSE 10 END,first_seen_at=first_detected_at,last_seen_at=last_information_at WHERE data_classification='FIXTURE';

CREATE UNIQUE INDEX idx_source_items_normalized_url ON source_items(source_id,normalized_url) WHERE normalized_url IS NOT NULL;
CREATE INDEX idx_source_items_hash_title ON source_items(source_id,content_hash,normalized_title);
CREATE INDEX idx_sources_polling ON sources(enabled,data_classification,next_poll_at,priority DESC);
CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_id,started_at DESC);
CREATE INDEX idx_topics_real_hot ON topics(data_classification,editorial_priority_score DESC,last_seen_at DESC);
