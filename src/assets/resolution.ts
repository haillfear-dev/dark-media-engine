import { db, one, type Row } from "../db.ts";
import { renderPlanSchema, type RenderPlan } from "../ai/schemas.ts";
import { getAssetProvider, type AssetProvider, type ResolvedAsset } from "./provider.ts";

export type SceneAssetStatus = "PENDING" | "RESOLVED" | "MISSING" | "FAILED" | "NOT_REQUIRED";
export type SceneAsset = {
  sceneOrder: number;
  query: string;
  provider: string;
  assetUrl: string | null;
  assetType: "IMAGE" | "VIDEO" | null;
  attribution: string | null;
  licenseMetadata: Record<string, unknown>;
  status: SceneAssetStatus;
};

const newId = () => `scene-asset-${crypto.randomUUID()}`;
export const sceneRequiresMedia = (visualType: RenderPlan["scenes"][number]["visualType"]) => visualType === "SOURCE_MEDIA" || visualType === "STOCK";

export function resolutionState(plan: RenderPlan, assets: SceneAsset[]) {
  const byScene = new Map(assets.map(asset => [asset.sceneOrder, asset]));
  const missing = plan.scenes.filter(scene => {
    if (!sceneRequiresMedia(scene.visualType)) return false;
    const asset = byScene.get(scene.order);
    return !asset || asset.status !== "RESOLVED" || !isUsableAsset(asset.assetUrl, asset.assetType);
  });
  return { status: missing.length ? "NEEDS_MEDIA" as const : "READY_TO_RENDER" as const, missingSceneOrders: missing.map(scene => scene.order) };
}

export async function resolveRenderPlanAssets(renderPlanId: string, provider: AssetProvider = getAssetProvider()) {
  const row = one<Row>("SELECT * FROM render_plans WHERE id=?", renderPlanId);
  if (!row) throw new Error("RENDER_PLAN_NOT_FOUND");
  const plan = renderPlanSchema.parse(JSON.parse(String(row.plan_json)));

  for (const scene of plan.scenes) {
    if (!sceneRequiresMedia(scene.visualType)) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, "NONE", null, "NOT_REQUIRED");
      continue;
    }
    if (!provider.available) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "MISSING", "ASSET_PROVIDER_NOT_CONFIGURED");
      continue;
    }
    try {
      const resolved = await provider.resolve({ query: scene.assetQuery, preferredKind: scene.visualType === "SOURCE_MEDIA" ? "VIDEO" : "IMAGE" });
      if (resolved && isUsableAsset(resolved.url, resolved.type)) persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, resolved.provider, resolved, "RESOLVED");
      else persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "MISSING", "ASSET_NOT_FOUND");
    } catch (error) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "FAILED", (error as { code?: string }).code ?? "ASSET_RESOLUTION_FAILED");
    }
  }

  const assets = loadResolvedAssets(renderPlanId);
  const state = resolutionState(plan, assets);
  db().prepare("UPDATE render_plans SET status=?,validation_errors=? WHERE id=?").run(state.status, JSON.stringify(state.missingSceneOrders.map(scene => `SCENE_${scene}_MEDIA_REQUIRED`)), renderPlanId);
  db().prepare("UPDATE contents SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(state.status, row.content_id);
  return { ...state, assets };
}

export function loadResolvedAssets(renderPlanId: string): SceneAsset[] {
  return (db().prepare("SELECT * FROM render_plan_scene_assets WHERE render_plan_id=? ORDER BY scene_order").all(renderPlanId) as Row[]).map(row => ({
    sceneOrder: Number(row.scene_order), query: String(row.query), provider: String(row.provider), assetUrl: row.asset_url ? String(row.asset_url) : null,
    assetType: row.asset_type ? String(row.asset_type) as "IMAGE" | "VIDEO" : null, attribution: row.attribution ? String(row.attribution) : null,
    licenseMetadata: JSON.parse(String(row.license_metadata)), status: String(row.status) as SceneAssetStatus,
  }));
}

function persistSceneAsset(planId: string, order: number, query: string, provider: string, asset: ResolvedAsset | null, status: SceneAssetStatus, errorCode: string | null = null) {
  db().prepare(`INSERT INTO render_plan_scene_assets(id,render_plan_id,scene_order,query,provider,asset_url,asset_type,attribution,license_metadata,status,error_code)
    VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(render_plan_id,scene_order) DO UPDATE SET query=excluded.query,provider=excluded.provider,asset_url=excluded.asset_url,asset_type=excluded.asset_type,attribution=excluded.attribution,license_metadata=excluded.license_metadata,status=excluded.status,error_code=excluded.error_code,updated_at=CURRENT_TIMESTAMP`)
    .run(newId(), planId, order, query, provider, asset?.url ?? null, asset?.type ?? null, asset?.attribution ?? null, JSON.stringify(asset?.licenseMetadata ?? {}), status, errorCode);
}

function isUsableAsset(url: string | null | undefined, type: string | null | undefined) {
  if (!url || (type !== "IMAGE" && type !== "VIDEO")) return false;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}
