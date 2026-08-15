import type { RenderPlan } from "../ai/schemas.ts";
import type { SceneAsset } from "../assets/resolution.ts";

export const CREATOMATE_TEMPLATE_CONTRACT = "dark-media-v1";
export type RenderStatus = "RENDERING" | "RENDERED" | "FAILED";
export type RenderSubmission = { externalId: string; status: "RENDERING"; metadata: Record<string, unknown> };
export type RenderResult = { externalId: string; status: RenderStatus; videoUrl?: string; errorCode?: string; errorDetail?: string; metadata: Record<string, unknown> };
export interface RenderProvider {
  readonly available: boolean;
  readonly name: string;
  submit(plan: RenderPlan, assets: SceneAsset[]): Promise<RenderSubmission>;
  status(externalId: string): Promise<RenderResult>;
}
export class RenderProviderError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = "RenderProviderError"; }
}
export class DisabledRenderProvider implements RenderProvider {
  readonly available = false;
  readonly name = "RENDERIZAÇÃO NÃO CONFIGURADA";
  private fail(): never { throw new RenderProviderError("RENDER_NOT_CONFIGURED", this.name); }
  async submit(): Promise<RenderSubmission> { return this.fail(); }
  async status(): Promise<RenderResult> { return this.fail(); }
}

export class CreatomateProvider implements RenderProvider {
  readonly available = true;
  readonly name = "Creatomate";
  private readonly key: string;
  private readonly templateId: string;
  private readonly contract: string;
  private readonly fetcher: typeof fetch;
  constructor(key: string, templateId: string, fetcher: typeof fetch = fetch, contract = process.env.CREATOMATE_TEMPLATE_CONTRACT ?? "") {
    this.key = key; this.templateId = templateId; this.fetcher = fetcher; this.contract = contract;
  }
  async submit(plan: RenderPlan, assets: SceneAsset[]) {
    validateTemplateContract(plan, assets, this.contract);
    const response = await this.fetcher("https://api.creatomate.com/v1/renders", {
      method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: this.templateId, modifications: renderModifications(plan, assets) }),
    });
    if (!response.ok) throw new RenderProviderError(response.status === 400 ? "CREATOMATE_TEMPLATE_INCOMPATIBLE" : "CREATOMATE_SUBMIT_FAILED", `Creatomate recusou o template/payload (${response.status})`);
    const body = await response.json() as Array<{ id?: string }> | { id?: string };
    const item = Array.isArray(body) ? body[0] : body;
    if (!item?.id) throw new RenderProviderError("CREATOMATE_INVALID_RESPONSE", "Creatomate não retornou render ID");
    return { externalId: item.id, status: "RENDERING" as const, metadata: { templateId: this.templateId, contract: this.contract } };
  }
  async status(externalId: string) {
    const response = await this.fetcher(`https://api.creatomate.com/v1/renders/${encodeURIComponent(externalId)}`, { headers: { Authorization: `Bearer ${this.key}` } });
    if (!response.ok) throw new RenderProviderError("CREATOMATE_STATUS_FAILED", `Consulta Creatomate falhou (${response.status})`);
    const body = await response.json() as { status?: string; url?: string; error_message?: string };
    if (body.status === "succeeded" && body.url) return { externalId, status: "RENDERED" as const, videoUrl: body.url, metadata: { providerStatus: body.status } };
    if (body.status === "failed") return { externalId, status: "FAILED" as const, errorCode: "CREATOMATE_RENDER_FAILED", errorDetail: body.error_message || "Render falhou", metadata: { providerStatus: body.status } };
    return { externalId, status: "RENDERING" as const, metadata: { providerStatus: body.status || "unknown" } };
  }
}

export function validateTemplateContract(plan: RenderPlan, assets: SceneAsset[], contract: string) {
  if (contract !== CREATOMATE_TEMPLATE_CONTRACT) throw new RenderProviderError("CREATOMATE_TEMPLATE_CONTRACT_INVALID", `CREATOMATE_TEMPLATE_CONTRACT deve ser ${CREATOMATE_TEMPLATE_CONTRACT}`);
  const byScene = new Map(assets.map(asset => [asset.sceneOrder, asset]));
  for (const scene of plan.scenes) {
    if (!scene.text || !scene.voiceOverText || scene.durationSeconds <= 0) throw new RenderProviderError("CREATOMATE_TEMPLATE_DATA_INVALID", `Cena ${scene.order} não satisfaz Text, VoiceOver e Duration`);
    if (scene.visualType === "SOURCE_MEDIA" || scene.visualType === "STOCK") {
      const asset = byScene.get(scene.order);
      if (asset?.status !== "RESOLVED" || !asset.assetUrl?.startsWith("https://")) throw new RenderProviderError("CREATOMATE_MEDIA_REQUIRED", `Cena ${scene.order} não possui mídia resolvida`);
    }
  }
}

export function renderModifications(plan: RenderPlan, assets: SceneAsset[]) {
  validateTemplateContract(plan, assets, CREATOMATE_TEMPLATE_CONTRACT);
  const byScene = new Map(assets.map(asset => [asset.sceneOrder, asset]));
  const modifications: Record<string, string | number> = { Brand: plan.branding.brandName };
  for (const scene of plan.scenes) {
    const prefix = `Scene-${scene.order}`;
    modifications[`${prefix}.Text`] = scene.text;
    modifications[`${prefix}.VoiceOver`] = scene.voiceOverText;
    modifications[`${prefix}.Duration`] = scene.durationSeconds;
    const asset = byScene.get(scene.order);
    if (asset?.status === "RESOLVED" && asset.assetUrl) modifications[`${prefix}.Media`] = asset.assetUrl;
  }
  return modifications;
 }

export function getRenderProvider(): RenderProvider {
  return process.env.CREATOMATE_API_KEY && process.env.CREATOMATE_TEMPLATE_ID
    ? new CreatomateProvider(process.env.CREATOMATE_API_KEY, process.env.CREATOMATE_TEMPLATE_ID)
    : new DisabledRenderProvider();
}
