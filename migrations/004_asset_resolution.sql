PRAGMA foreign_keys=ON;

CREATE TABLE render_plan_scene_assets(
  id TEXT PRIMARY KEY,
  render_plan_id TEXT NOT NULL REFERENCES render_plans(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  asset_url TEXT,
  asset_type TEXT CHECK(asset_type IN('IMAGE','VIDEO')),
  attribution TEXT,
  license_metadata TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK(status IN('PENDING','RESOLVED','MISSING','FAILED','NOT_REQUIRED')),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(render_plan_id,scene_order)
);

CREATE INDEX idx_scene_assets_plan_status ON render_plan_scene_assets(render_plan_id,status,scene_order);
