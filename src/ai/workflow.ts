import { all, db, one, Row } from "@/src/db";
import { getAIProvider, IdeaCandidate, TopicContext } from "./provider";

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const json = (value: unknown) => JSON.stringify(value);

export function loadTopicContext(topicId: string): TopicContext {
  const topic = one<Row>(`SELECT t.*, b.name brand_name, b.tone brand_tone, b.target_audience, b.editorial_aggressiveness FROM topics t JOIN brands b ON b.id=t.brand_id WHERE t.id=?`, topicId);
  if (!topic) throw new Error("TOPIC_NOT_FOUND");
  const sourceItems = all<Row>(`SELECT i.id,i.title,i.summary,i.url FROM source_items i JOIN topic_source_items x ON x.source_item_id=i.id WHERE x.topic_id=? ORDER BY x.is_primary DESC,i.discovered_at`, topicId);
  return { id: String(topic.id), title: String(topic.title), summary: String(topic.summary), confidenceScore: Number(topic.confidence_score), viralityScore: Number(topic.virality_score), momentumScore: Number(topic.momentum_score), saturationRisk: Number(topic.saturation_risk), freshness: String(topic.freshness), signals: String(topic.signals).split(",").filter(Boolean), sourceItems: sourceItems.map((item) => ({ id: String(item.id), title: String(item.title), summary: String(item.summary), url: item.url ? String(item.url) : null })), brand: { id: String(topic.brand_id), name: String(topic.brand_name), tone: String(topic.brand_tone), targetAudience: String(topic.target_audience), editorialAggressiveness: String(topic.editorial_aggressiveness) } };
}

export async function generateAndPersistCandidates(topicId: string, generation = 0) {
  const provider = getAIProvider();
  if (!provider.available) throw new Error("AI_NOT_CONFIGURED");
  const topic = loadTopicContext(topicId);
  const generated = await provider.generateIdeaCandidates(topic, generation);
  const ranked = await provider.rankIdeaCandidates(generated, topic);
  if (ranked.length !== 3) throw new Error("AI_CANDIDATE_COUNT_INVALID");
  const batchId = newId("batch");
  const insert = db().prepare(`INSERT INTO ideas(id,topic_id,title,angle,rationale,rank_score,status,suggested_hook,editorial_strategy,supporting_facts,warnings,recommended,generation_batch_id,generated_by) VALUES(?,?,?,?,?,?,'CANDIDATE',?,?,?,?,?,?,?)`);
  db().exec("BEGIN IMMEDIATE");
  try {
    ranked.forEach((candidate, index) => insert.run(newId("idea"), topicId, candidate.title, candidate.angle, candidate.rationale, candidate.viralityPotential, candidate.suggestedHook, candidate.editorialStrategy, json(candidate.supportingFacts), json(candidate.warnings), candidate.recommendedCandidate ? 1 : 0, batchId, provider.provenanceLabel));
    db().exec("COMMIT");
  } catch (error) { db().exec("ROLLBACK"); throw error; }
  return batchId;
}

export function candidateFromRow(row: Row): IdeaCandidate {
  return { title: String(row.title), angle: String(row.angle), rationale: String(row.rationale), suggestedHook: String(row.suggested_hook), viralityPotential: Number(row.rank_score), editorialStrategy: String(row.editorial_strategy), supportingFacts: JSON.parse(String(row.supporting_facts)), warnings: JSON.parse(String(row.warnings)), recommendedCandidate: Boolean(row.recommended) };
}

export async function generateContentForIdea(ideaId: string) {
  const idea = one<Row>("SELECT * FROM ideas WHERE id=?", ideaId); if (!idea) throw new Error("IDEA_NOT_FOUND");
  const provider = getAIProvider(); if (!provider.available) throw new Error("AI_NOT_CONFIGURED");
  const topic = loadTopicContext(String(idea.topic_id));
  const draft = await provider.generateContentFromIdea(topic, candidateFromRow(idea));
  const contentId = newId("content");
  db().exec("BEGIN IMMEDIATE");
  try {
    db().prepare(`INSERT INTO contents(id,brand_id,topic_id,idea_id,title,thesis,angle,master_hook,master_script,status,caption_base) VALUES(?,?,?,?,?,?,?,?,?,'DRAFT',?)`).run(contentId, topic.brand.id, topic.id, ideaId, draft.headline, draft.thesis, String(idea.angle), draft.masterHook, draft.masterScript, draft.captionBase);
    const claimInsert = db().prepare("INSERT INTO factual_claims(id,content_id,claim_text,confidence,status) VALUES(?,?,?,?,?)");
    const supportInsert = db().prepare("INSERT OR IGNORE INTO claim_supports(claim_id,source_item_id) VALUES(?,?)");
    for (const claim of draft.factualClaims) { const claimId = newId("claim"); claimInsert.run(claimId, contentId, claim.text, claim.confidence, "EXTRACTED"); claim.sourceItemIds.forEach((sourceId) => supportInsert.run(claimId, sourceId)); }
    db().prepare("UPDATE ideas SET status='SELECTED' WHERE id=?").run(ideaId);
    db().exec("COMMIT");
  } catch (error) { db().exec("ROLLBACK"); throw error; }
  return contentId;
}

export async function generateVariantsForContent(contentId: string) {
  const content = one<Row>("SELECT * FROM contents WHERE id=?", contentId); if (!content) throw new Error("CONTENT_NOT_FOUND");
  const provider = getAIProvider(); if (!provider.available) throw new Error("AI_NOT_CONFIGURED");
  const claims = all<Row>("SELECT claim_text,confidence FROM factual_claims WHERE content_id=?", contentId);
  const sourceRefs = all<Row>(`SELECT DISTINCT cs.source_item_id FROM claim_supports cs JOIN factual_claims c ON c.id=cs.claim_id WHERE c.content_id=?`, contentId);
  const drafts = await provider.generatePlatformVariants({ headline: String(content.title), thesis: String(content.thesis), masterHook: String(content.master_hook), masterScript: String(content.master_script), captionBase: String(content.caption_base), factualClaims: claims.map((claim) => ({ text: String(claim.claim_text), confidence: String(claim.confidence) as "HIGH" | "MEDIUM" | "LOW", sourceItemIds: [] })), sourceReferences: sourceRefs.map((row) => String(row.source_item_id)) });
  const statement = db().prepare(`INSERT INTO content_variants(id,content_id,platform,hook,script,title,caption,description,hashtags,cta,target_duration,visual_direction,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'DRAFT') ON CONFLICT(content_id,platform) DO UPDATE SET hook=excluded.hook,script=excluded.script,title=excluded.title,caption=excluded.caption,description=excluded.description,hashtags=excluded.hashtags,cta=excluded.cta,target_duration=excluded.target_duration,visual_direction=excluded.visual_direction`);
  drafts.forEach((draft) => statement.run(newId("variant"), contentId, draft.platform, draft.hook, draft.script, draft.title, draft.caption, draft.description, draft.hashtags, draft.cta, draft.targetDuration, draft.visualDirection));
  return drafts.length;
}
