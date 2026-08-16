PRAGMA foreign_keys=ON;
ALTER TABLE render_plan_scene_assets ADD COLUMN provider_asset_id TEXT;
ALTER TABLE render_plan_scene_assets ADD COLUMN origin TEXT NOT NULL DEFAULT 'NONE' CHECK(origin IN('SOURCE_MEDIA','STOCK','GENERATED','MANUAL','NONE'));
ALTER TABLE render_plan_scene_assets ADD COLUMN source_url TEXT;
ALTER TABLE render_plan_scene_assets ADD COLUMN selection_score REAL;
