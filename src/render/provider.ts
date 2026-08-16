import type { RenderPlan } from "../ai/schemas.ts";
import { sceneRequiresMedia, type SceneAsset } from "../assets/resolution.ts";

export const CREATOMATE_TEMPLATE_CONTRACT = "dark-media-composer-v1";
export const CREATOMATE_TEMPLATE_SCENE_SLOTS = 10;
export type RenderStatus = "RENDERING" | "RENDERED" | "FAILED";
export type RenderSubmission = { externalId: string; status: "RENDERING"; metadata: Record<string, unknown> };
export type RenderResult = { externalId: string; status: RenderStatus; videoUrl?: string; errorCode?: string; errorDetail?: string; metadata: Record<string, unknown> };
export type ComposerPreviewScene = RenderPlan["scenes"][number] & { asset: SceneAsset | null; status: "READY" | "MISSING_MEDIA" };
export type ComposerPreview = { status: "READY" | "NOT_READY"; scenes: ComposerPreviewScene[]; errors: string[] };
export interface RenderProvider { readonly available: boolean; readonly name: string; submit(plan: RenderPlan, assets: SceneAsset[]): Promise<RenderSubmission>; status(externalId: string): Promise<RenderResult>; }
export class RenderProviderError extends Error { readonly code: string; constructor(code: string, message: string) { super(message); this.code = code; this.name = "RenderProviderError"; } }
export class DisabledRenderProvider implements RenderProvider { readonly available = false; readonly name = "RENDERIZAÇÃO NÃO CONFIGURADA"; private fail(): never { throw new RenderProviderError("RENDER_NOT_CONFIGURED", this.name); } async submit(): Promise<RenderSubmission> { return this.fail(); } async status(): Promise<RenderResult> { return this.fail(); } }

export class CreatomateProvider implements RenderProvider {
  readonly available = true; readonly name = "Creatomate";
  private readonly key:string;private readonly templateId:string;private readonly fetcher:typeof fetch;private readonly contract:string;
  constructor(key:string,templateId:string,fetcher:typeof fetch=fetch,contract=process.env.CREATOMATE_TEMPLATE_CONTRACT??""){this.key=key;this.templateId=templateId;this.fetcher=fetcher;this.contract=contract}
  async submit(plan: RenderPlan, assets: SceneAsset[]) {
    validateTemplateContract(plan, assets, this.contract);
    const response = await this.request("https://api.creatomate.com/v2/renders", { method:"POST", headers:{ Authorization:`Bearer ${this.key}`,"Content-Type":"application/json" }, body:JSON.stringify({template_id:this.templateId,modifications:renderModifications(plan,assets)}) });
    if (!response.ok) throw new RenderProviderError(response.status===400?"CREATOMATE_TEMPLATE_INCOMPATIBLE":"CREATOMATE_SUBMIT_FAILED",`Creatomate recusou o template/payload (${response.status})`);
    const body=await response.json() as Array<{id?:string}>|{id?:string};const item=Array.isArray(body)?body[0]:body;if(!item?.id)throw new RenderProviderError("CREATOMATE_INVALID_RESPONSE","Creatomate não retornou render ID");
    return {externalId:item.id,status:"RENDERING" as const,metadata:{templateId:this.templateId,contract:this.contract}};
  }
  async status(externalId:string){const response=await this.request(`https://api.creatomate.com/v2/renders/${encodeURIComponent(externalId)}`,{headers:{Authorization:`Bearer ${this.key}`}});if(!response.ok)throw new RenderProviderError("CREATOMATE_STATUS_FAILED",`Consulta Creatomate falhou (${response.status})`);const body=await response.json() as {status?:string;url?:string;error_message?:string};if(body.status==="succeeded"&&body.url)return{externalId,status:"RENDERED" as const,videoUrl:body.url,metadata:{providerStatus:body.status}};if(body.status==="failed")return{externalId,status:"FAILED" as const,errorCode:"CREATOMATE_RENDER_FAILED",errorDetail:body.error_message||"Render falhou",metadata:{providerStatus:body.status}};return{externalId,status:"RENDERING" as const,metadata:{providerStatus:body.status||"unknown"}}}
  private async request(url:string,init:RequestInit){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),Number(process.env.CREATOMATE_TIMEOUT_MS||15000));try{return await this.fetcher(url,{...init,signal:controller.signal})}catch(error){if((error as Error).name==="AbortError")throw new RenderProviderError("CREATOMATE_TIMEOUT","Tempo limite do Creatomate excedido");throw new RenderProviderError("CREATOMATE_NETWORK_ERROR","Falha de comunicação com o Creatomate")}finally{clearTimeout(timeout)}}
}

const unsafeUrl=(url:string)=>!url.startsWith("https://")||/(placeholder|demo|sample|example|ocean|sea|beach)/i.test(url);
const wordsPerSecond=2.8;
export function composerPreview(plan:RenderPlan,assets:SceneAsset[]):ComposerPreview{
  const byScene=new Map(assets.map(asset=>[asset.sceneOrder,asset])),errors:string[]=[];const seen=new Set<string>();
  const scenes=plan.scenes.map(scene=>{const asset=byScene.get(scene.order)??null;let status:"READY"|"MISSING_MEDIA"="READY";if(sceneRequiresMedia(scene.visualType)){if(asset?.status!=="RESOLVED"||!asset.assetUrl||unsafeUrl(asset.assetUrl)){status="MISSING_MEDIA";errors.push(`SCENE_${scene.order}_MEDIA_REQUIRED`)}else if(seen.has(asset.assetUrl)){status="MISSING_MEDIA";errors.push(`SCENE_${scene.order}_DUPLICATE_MEDIA`)}else seen.add(asset.assetUrl)}return{...scene,asset,status}});
  try{validateTimelineAndNarration(plan)}catch(error){errors.push((error as RenderProviderError).code)}
  return{status:errors.length?"NOT_READY":"READY",scenes,errors};
}
function validateTimelineAndNarration(plan:RenderPlan){let cursor=0;for(const scene of plan.scenes){if(Math.abs(scene.startSeconds-cursor)>.05)throw new RenderProviderError("RENDER_BLOCKED_TIMELINE",`Timeline inconsistente na cena ${scene.order}`);const speechSeconds=scene.narration.trim().split(/\s+/).length/wordsPerSecond;if(speechSeconds>scene.durationSeconds+.75)throw new RenderProviderError("RENDER_BLOCKED_VOICE_OVERFLOW",`Narração da cena ${scene.order} excede sua duração`);cursor+=scene.durationSeconds}if(Math.abs(cursor-plan.targetDuration)>.05)throw new RenderProviderError("RENDER_BLOCKED_TIMELINE","Duração das cenas difere do total")}
export function validateTemplateContract(plan:RenderPlan,assets:SceneAsset[],contract:string){
  if(contract!==CREATOMATE_TEMPLATE_CONTRACT||plan.version!==CREATOMATE_TEMPLATE_CONTRACT)throw new RenderProviderError("RENDER_BLOCKED_TEMPLATE_CONTRACT",`CREATOMATE_TEMPLATE_CONTRACT deve ser ${CREATOMATE_TEMPLATE_CONTRACT}`);
  if(plan.scenes.length<6||plan.scenes.length>CREATOMATE_TEMPLATE_SCENE_SLOTS)throw new RenderProviderError("RENDER_BLOCKED_SCENE_COUNT","Composer requer entre 6 e 10 cenas");
  for(const asset of assets)if(asset.assetUrl&&unsafeUrl(asset.assetUrl))throw new RenderProviderError("RENDER_BLOCKED_GENERIC_TEMPLATE",`Cena ${asset.sceneOrder} contém mídia genérica/demo`);
  const preview=composerPreview(plan,assets);const missing=preview.errors.find(x=>x.includes("MEDIA_REQUIRED"));if(missing)throw new RenderProviderError("RENDER_BLOCKED_MISSING_ASSET",missing);const duplicate=preview.errors.find(x=>x.includes("DUPLICATE_MEDIA"));if(duplicate)throw new RenderProviderError("RENDER_BLOCKED_DUPLICATE_MEDIA",duplicate);if(preview.errors.length)validateTimelineAndNarration(plan);
  for(const scene of plan.scenes){if(!scene.caption.trim()||!scene.narration.trim())throw new RenderProviderError("RENDER_BLOCKED_REQUIRED_SLOT",`Cena ${scene.order} não preenche caption/narration`);const asset=preview.scenes[scene.order-1]?.asset;if(asset?.assetUrl&&unsafeUrl(asset.assetUrl))throw new RenderProviderError("RENDER_BLOCKED_GENERIC_TEMPLATE",`Cena ${scene.order} contém mídia genérica/demo`)}
}
export function renderModifications(plan:RenderPlan,assets:SceneAsset[]){
  validateTemplateContract(plan,assets,CREATOMATE_TEMPLATE_CONTRACT);const byScene=new Map(assets.map(a=>[a.sceneOrder,a]));const modifications:Record<string,string|number>={"Brand.Name.text":plan.branding.brandName,"Brand.Accent.fill_color":plan.branding.primaryColor,"Brand.Font.font_family":plan.branding.fontFamily,"Brand.Logo.source":plan.branding.logoAssetUrl??"","Brand.Logo.opacity":plan.branding.logoAssetUrl?100:0,"Music.source":plan.backgroundAudio.sourceUrl??"","Music.volume":plan.backgroundAudio.sourceUrl?plan.backgroundAudio.volume*100:0,"Music.metadata":`${plan.backgroundAudio.mood}|ducking=${plan.backgroundAudio.ducking}`,"Voice.VoiceId":plan.voice.voiceId};
  for(let order=1;order<=CREATOMATE_TEMPLATE_SCENE_SLOTS;order++){const prefix=`Scene-${order}`,scene=plan.scenes[order-1];if(!scene){modifications[`${prefix}.Group.opacity`]=0;modifications[`${prefix}.Media.source`]="";modifications[`${prefix}.Headline.text`]="";modifications[`${prefix}.Caption.text`]="";modifications[`${prefix}.VoiceOver.source`]="";continue}const asset=byScene.get(order);modifications[`${prefix}.Group.opacity`]=100;modifications[`${prefix}.Group.time`]=scene.startSeconds;modifications[`${prefix}.Group.duration`]=scene.durationSeconds;modifications[`${prefix}.Media.source`]=asset?.assetUrl??"";modifications[`${prefix}.Media.fit`]=scene.mediaFit.toLowerCase();modifications[`${prefix}.Media.motion`]=scene.mediaMotion;modifications[`${prefix}.Media.duration`]=scene.durationSeconds;modifications[`${prefix}.Headline.text`]=scene.headline??"";modifications[`${prefix}.Headline.fill_color`]=plan.branding.primaryColor;modifications[`${prefix}.Caption.text`]=scene.caption;modifications[`${prefix}.Caption.position`]=scene.captionPosition;modifications[`${prefix}.Caption.style`]=scene.textStyle??"EDITORIAL";modifications[`${prefix}.Caption.emphasis`]=(scene.emphasisWords??[]).join("|");modifications[`${prefix}.VoiceOver.source`]=scene.narration;modifications[`${prefix}.VoiceOver.duration`]=scene.durationSeconds;modifications[`${prefix}.Transition.type`]=scene.transition;modifications[`${prefix}.Overlay.opacity`]=scene.overlay?.enabled?scene.overlay.opacity*100:0}
  return modifications;
}
export function getRenderProvider():RenderProvider{return process.env.CREATOMATE_API_KEY&&process.env.CREATOMATE_TEMPLATE_ID?new CreatomateProvider(process.env.CREATOMATE_API_KEY,process.env.CREATOMATE_TEMPLATE_ID):new DisabledRenderProvider()}
