"use server";

import { getAssetStorage } from "@/src/assets/storage";
import { generateAndPersistCandidates, generateContentForIdea, generateVariantsForContent } from "@/src/ai/workflow";
import { db, one, Row } from "@/src/db";
import { distribute } from "@/src/social/distribution";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshRender, submitRender } from "@/src/render/workflow";
import { resolveRenderPlanAssets } from "@/src/assets/resolution";
import { runSourceIngestion } from "@/src/ingestion/job";
import { HttpSourceIngestionProvider } from "@/src/ingestion/provider";
import type { SourceConfig } from "@/src/ingestion/types";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const val = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function updateBrand(form: FormData) {
  db().prepare(`UPDATE brands SET name=?,niche=?,target_audience=?,persona=?,tone=?,editorial_aggressiveness=?,controversy_appetite=?,preferred_topics=?,avoided_topics=?,preferred_vocabulary=?,avoided_vocabulary=?,cta_preferences=?,content_objectives=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...["name", "niche", "targetAudience", "persona", "tone", "aggressiveness", "controversy", "preferredTopics", "avoidedTopics", "preferredVocabulary", "avoidedVocabulary", "cta", "objectives"].map((key) => val(form, key)), val(form, "id"));
  revalidatePath("/brands");
}
export async function addSource(form: FormData) { db().prepare("INSERT INTO sources(id,brand_id,name,type,url,enabled,priority,reliability,category) VALUES(?,?,?,?,?,1,?,?,?)").run(id("src"), val(form, "brandId"), val(form, "name"), val(form, "type"), val(form, "url"), Number(val(form, "priority")), Number(val(form, "reliability")), val(form, "category")); revalidatePath("/sources"); }
export async function toggleSource(form: FormData) { db().prepare("UPDATE sources SET enabled=CASE enabled WHEN 1 THEN 0 ELSE 1 END WHERE id=?").run(val(form, "id")); revalidatePath("/sources"); }
export async function collectSource(form: FormData) { const sourceId=val(form,"id");const [result]=await runSourceIngestion({force:true,sourceId});redirect(`/sources?collected=${sourceId}&status=${result?.status??"NOT_DUE"}`); }
export async function testSource(form:FormData){const sourceId=val(form,"id"),row=one<Row>("SELECT * FROM sources WHERE id=?",sourceId);if(!row)redirect("/sources?test=NOT_FOUND");let target="/sources?test=FAILED";try{const source:SourceConfig={id:String(row.id),name:String(row.name),url:String(row.url),baseUrl:String(row.base_url??row.url),category:String(row.category),language:String(row.language),country:String(row.country),priority:Number(row.priority),reliability:Number(row.reliability),strategy:String(row.ingestion_strategy) as SourceConfig["strategy"],etag:null,lastModified:null};const result=await new HttpSourceIngestionProvider().collect(source);target=`/sources?test=SUCCESS&items=${result.items.length}`}catch{}redirect(target)}
export async function updateSource(form:FormData){db().prepare(`UPDATE sources SET name=?,base_url=?,url=?,category=?,language=?,country=?,priority=?,reliability=?,ingestion_strategy=?,polling_interval_minutes=? WHERE id=?`).run(val(form,"name"),val(form,"baseUrl"),val(form,"url"),val(form,"category"),val(form,"language"),val(form,"country"),Number(val(form,"priority")),Number(val(form,"reliability")),val(form,"strategy"),Number(val(form,"interval")),val(form,"id"));revalidatePath("/sources");}
export async function addSourceItem(form: FormData) { db().prepare("INSERT INTO source_items(id,source_id,title,url,published_at,summary,processing_status,provenance_group) VALUES(?,?,?,?,?,?,?,?)").run(id("item"), val(form, "sourceId"), val(form, "title"), val(form, "url"), val(form, "publishedAt") || null, val(form, "summary"), "NEW", val(form, "provenance") || null); revalidatePath("/sources"); }

export async function generateIdeaCandidates(form: FormData) {
  const topicId = val(form, "topicId"), generation = Number(val(form, "generation")) || 0;
  try { const batch = await generateAndPersistCandidates(topicId, generation); redirect(`/ideas?topic=${topicId}&batch=${batch}`); }
  catch (error) { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; redirect(`/ideas?topic=${topicId}&ai=not-configured`); }
}
export async function selectCandidate(form: FormData) {
  const ideaId = val(form, "ideaId"), topicId = val(form, "topicId"), batchId = val(form, "batchId");
  let target: string;
  try {
    const contentId = await generateContentForIdea(ideaId);
    target = `/studio?content=${encodeURIComponent(contentId)}&generated=all`;
  } catch (error) {
    const code = safeErrorCode(error);
    target = `/ideas?topic=${encodeURIComponent(topicId)}&batch=${encodeURIComponent(batchId)}&error=${encodeURIComponent(code)}`;
  }
  // Keep redirect outside the catch: Next implements it as a framework exception.
  redirect(target);
}

function safeErrorCode(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : error instanceof Error ? error.message : "UNKNOWN_ERROR";
  return /^[A-Z0-9_]+$/.test(code) ? code : "UNKNOWN_ERROR";
}
export async function addIdea(form: FormData) { const newId = id("idea"); db().prepare(`INSERT INTO ideas(id,topic_id,title,angle,rationale,rank_score,status,suggested_hook,generated_by) VALUES(?,?,?,?,?,0,'DRAFT',?,'MANUAL')`).run(newId, val(form, "topicId"), val(form, "title"), val(form, "angle"), val(form, "rationale"), val(form, "suggestedHook")); redirect(`/studio?idea=${newId}`); }
export async function generateMasterContent(form: FormData) { try { const contentId = await generateContentForIdea(val(form, "ideaId")); redirect(`/studio?content=${contentId}`); } catch (error) { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; redirect(`/studio?idea=${val(form, "ideaId")}&ai=not-configured`); } }
export async function generateVariants(form: FormData) { const contentId = val(form, "contentId"); try { await generateVariantsForContent(contentId); redirect(`/studio?content=${contentId}&variants=generated`); } catch (error) { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; redirect(`/studio?content=${contentId}&ai=not-configured`); } }

export async function saveContent(form: FormData) { const contentId = val(form, "contentId") || id("content"), existing = db().prepare("SELECT id FROM contents WHERE id=?").get(contentId); if (existing) db().prepare("UPDATE contents SET title=?,thesis=?,angle=?,master_hook=?,master_script=?,caption_base=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(val(form, "title"), val(form, "thesis"), val(form, "angle"), val(form, "hook"), val(form, "script"), val(form, "captionBase"), val(form, "status"), contentId); else db().prepare("INSERT INTO contents(id,brand_id,topic_id,idea_id,title,thesis,angle,master_hook,master_script,caption_base,status) VALUES(?,?,?,?,?,?,?,?,?,?,'DRAFT')").run(contentId, val(form, "brandId"), val(form, "topicId"), val(form, "ideaId"), val(form, "title"), val(form, "thesis"), val(form, "angle"), val(form, "hook"), val(form, "script"), val(form, "captionBase")); revalidatePath("/studio"); redirect(`/studio?content=${contentId}`); }
export async function feedback(form: FormData) { const action = val(form, "action"), contentId = val(form, "contentId"), current = db().prepare("SELECT status FROM contents WHERE id=?").get(contentId) as { status: string } | undefined; if (!current) throw new Error("CONTENT_NOT_FOUND"); if (action === "approved" && current.status !== "RENDERED") redirect(`/studio?content=${contentId}&review=render-required`); const status = action === "approved" ? "APPROVED" : action === "rejected" ? "FAILED" : "GENERATING"; db().prepare("UPDATE contents SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, contentId); db().prepare("INSERT INTO editorial_feedback(id,content_id,action,reason,note) VALUES(?,?,?,?,?)").run(id("feedback"), contentId, action, val(form, "reason") || null, val(form, "note") || null); revalidatePath("/studio"); }
export async function resolveMedia(form: FormData) { const contentId = val(form, "contentId"), planId = val(form, "renderPlanId"); const result = await resolveRenderPlanAssets(planId); redirect(`/studio?content=${contentId}&media=${result.status}`); }
export async function startRender(form: FormData) { const contentId = val(form, "contentId"); try { const renderId = await submitRender(contentId); redirect(`/studio?content=${contentId}&render=${renderId}`); } catch (error) { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; redirect(`/studio?content=${contentId}&render=not-configured`); } }
export async function pollRender(form: FormData) { const contentId = val(form, "contentId"), renderId = val(form, "renderId"); try { await refreshRender(renderId); redirect(`/studio?content=${contentId}&render=${renderId}`); } catch (error) { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; redirect(`/studio?content=${contentId}&render=failed`); } }
export async function saveVariant(form: FormData) { db().prepare("UPDATE content_variants SET hook=?,script=?,title=?,caption=?,hashtags=?,cta=?,target_duration=?,visual_direction=? WHERE id=?").run(val(form, "hook"), val(form, "script"), val(form, "title"), val(form, "caption"), val(form, "hashtags"), val(form, "cta"), Number(val(form, "duration")) || null, val(form, "visual"), val(form, "id")); revalidatePath("/studio"); }

export async function attachVideo(form: FormData) {
  const file = form.get("video"), variantId = val(form, "variantId");
  if (!(file instanceof File)) redirect(`/studio?content=${val(form, "contentId")}&upload=invalid`);
  const assetId = id("asset"), storage = getAssetStorage(); let stored: Awaited<ReturnType<typeof storage.saveVideo>> | undefined;
  try { stored = await storage.saveVideo(file as File, assetId); db().prepare(`INSERT INTO assets(id,content_variant_id,type,source,storage_location,mime_type,byte_size,original_filename,status,metadata) VALUES(?,?,'video','operator_upload',?,?,?,?,?,'{}')`).run(assetId, variantId, stored.location, stored.mimeType, stored.byteSize, stored.originalFilename, "READY"); }
  catch { if (stored) await storage.remove(stored.location).catch(() => undefined); redirect(`/studio?content=${val(form, "contentId")}&upload=invalid`); }
  redirect(`/studio?content=${val(form, "contentId")}&upload=success`);
}
export async function distributeVariant(form: FormData) { const result = await distribute({ brandId: "brand-radar", variantId: val(form, "variantId"), assetId: val(form, "assetId"), providerId: val(form, "provider") as "TIKTOK" | "YOUTUBE" }); redirect(`/studio?content=${val(form, "contentId")}&distribution=${result.status}`); }
export async function distributeContent(form: FormData) {
  const contentId = val(form, "contentId"), providers = form.getAll("providers").map(String).filter((provider): provider is "TIKTOK" | "YOUTUBE" => provider === "TIKTOK" || provider === "YOUTUBE");
  const results = [];
  for (const providerId of providers) {
    const platform = providerId === "YOUTUBE" ? "YOUTUBE_SHORTS" : "TIKTOK";
    const row = db().prepare(`SELECT v.id variant_id,a.id asset_id FROM content_variants v JOIN assets a ON a.content_variant_id=v.id AND a.status='READY' WHERE v.content_id=? AND v.platform=? ORDER BY a.created_at DESC LIMIT 1`).get(contentId, platform) as { variant_id: string; asset_id: string } | undefined;
    if (row) results.push(await distribute({ brandId: "brand-radar", variantId: row.variant_id, assetId: row.asset_id, providerId }));
  }
  const status = results.some((result) => result.status === "FAILED") ? "PARTIAL_OR_FAILED" : results.length ? "QUEUED" : "NOT_READY";
  redirect(`/studio?content=${contentId}&distribution=${status}`);
}
export async function schedulePublication(form: FormData) { db().prepare("INSERT INTO publications(id,content_variant_id,social_account_id,scheduled_for,status) VALUES(?,?,?,?,?)").run(id("pub"), val(form, "variantId"), val(form, "accountId") || null, new Date(val(form, "scheduledFor")).toISOString(), "SCHEDULED"); revalidatePath("/calendar"); }
