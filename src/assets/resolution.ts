import { db, one, type Row } from "../db.ts";
import { renderPlanSchema, type RenderPlan } from "../ai/schemas.ts";
import { getAssetProvider, type AssetProvider, type ResolvedAsset } from "./provider.ts";

export type SceneAssetStatus = "PENDING" | "RESOLVED" | "MISSING" | "FAILED" | "NOT_REQUIRED";
export type SceneAsset = {
  sceneOrder: number;
  query: string;
  provider: string;
  providerAssetId: string | null;
  origin: "SOURCE_MEDIA" | "STOCK" | "GENERATED" | "MANUAL" | "NONE";
  assetUrl: string | null;
  assetType: "IMAGE" | "VIDEO" | null;
  attribution: string | null;
  licenseMetadata: Record<string, unknown>;
  sourceUrl: string | null;
  selectionScore: number | null;
  status: SceneAssetStatus;
};

const newId = () => `scene-asset-${crypto.randomUUID()}`;
export const sceneRequiresMedia = (visualType: RenderPlan["scenes"][number]["visualType"]) => visualType === "SOURCE_MEDIA" || visualType === "STOCK_VIDEO" || visualType === "STOCK_IMAGE";

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

  await Promise.all(plan.scenes.map(async scene => {
    if (!sceneRequiresMedia(scene.visualType)) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, "NONE", null, "NOT_REQUIRED");
      return;
    }
    // Source media must come from an explicitly licensed source integration. Never
    // disguise stock search results as media supplied by the news source.
    if (scene.visualType === "SOURCE_MEDIA") {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, "SOURCE", null, "MISSING", "SOURCE_MEDIA_NOT_AVAILABLE");
      return;
    }
    if (!provider.available) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "MISSING", "ASSET_PROVIDER_NOT_CONFIGURED");
      return;
    }
    try {
      const resolved = await provider.resolve({ query: scene.assetQuery, preferredKind: scene.visualType === "STOCK_IMAGE" ? "IMAGE" : "VIDEO" });
      if (resolved && isUsableAsset(resolved.url, resolved.type)) persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, resolved.provider, resolved, "RESOLVED");
      else persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "MISSING", "ASSET_NOT_FOUND");
    } catch (error) {
      persistSceneAsset(renderPlanId, scene.order, scene.assetQuery, provider.name, null, "FAILED", (error as { code?: string }).code ?? "ASSET_RESOLUTION_FAILED");
    }
  }));

  const assets = loadResolvedAssets(renderPlanId);
  const state = resolutionState(plan, assets);
  db().prepare("UPDATE render_plans SET status=?,validation_errors=? WHERE id=?").run(state.status, JSON.stringify(state.missingSceneOrders.map(scene => `SCENE_${scene}_MEDIA_REQUIRED`)), renderPlanId);
  db().prepare("UPDATE contents SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(state.status, row.content_id);
  return { ...state, assets };
}

export function loadResolvedAssets(renderPlanId: string): SceneAsset[] {
  return (db().prepare("SELECT * FROM render_plan_scene_assets WHERE render_plan_id=? ORDER BY scene_order").all(renderPlanId) as Row[]).map(row => ({
    sceneOrder: Number(row.scene_order), query: String(row.query), provider: String(row.provider), providerAssetId:row.provider_asset_id?String(row.provider_asset_id):null, origin:String(row.origin??"NONE") as SceneAsset["origin"], assetUrl: row.asset_url ? String(row.asset_url) : null,
    assetType: row.asset_type ? String(row.asset_type) as "IMAGE" | "VIDEO" : null, attribution: row.attribution ? String(row.attribution) : null,
    licenseMetadata: JSON.parse(String(row.license_metadata)), sourceUrl:row.source_url?String(row.source_url):null, selectionScore:row.selection_score===null?null:Number(row.selection_score), status: String(row.status) as SceneAssetStatus,
  }));
}

function persistSceneAsset(planId: string, order: number, query: string, provider: string, asset: ResolvedAsset | null, status: SceneAssetStatus, errorCode: string | null = null) {
  db().prepare(`INSERT INTO render_plan_scene_assets(id,render_plan_id,scene_order,query,provider,provider_asset_id,origin,asset_url,asset_type,attribution,source_url,selection_score,license_metadata,status,error_code)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(render_plan_id,scene_order) DO UPDATE SET query=excluded.query,provider=excluded.provider,provider_asset_id=excluded.provider_asset_id,origin=excluded.origin,asset_url=excluded.asset_url,asset_type=excluded.asset_type,attribution=excluded.attribution,source_url=excluded.source_url,selection_score=excluded.selection_score,license_metadata=excluded.license_metadata,status=excluded.status,error_code=excluded.error_code,updated_at=CURRENT_TIMESTAMP`)
    .run(newId(), planId, order, query, provider, asset?.providerAssetId ?? null, asset?.origin ?? "NONE", asset?.url ?? null, asset?.type ?? null, asset?.attribution ?? null, asset?.sourceUrl ?? null, asset?.selectionScore ?? null, JSON.stringify(asset?.licenseMetadata ?? {}), status, errorCode);
}

function isUsableAsset(url: string | null | undefined, type: string | null | undefined) {
  if (!url || (type !== "IMAGE" && type !== "VIDEO")) return false;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}
