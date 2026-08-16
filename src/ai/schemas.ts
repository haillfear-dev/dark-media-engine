import { z } from "zod";

export const factualClaimSchema = z.object({ text: z.string().min(1), confidence: z.enum(["HIGH", "MEDIUM", "LOW"]), sourceItemIds: z.array(z.string().min(1)).min(1) });
export const ideaCandidateSchema = z.object({ title: z.string().min(1), angle: z.string().min(1), rationale: z.string().min(1), suggestedHook: z.string().min(1), viralityPotential: z.number().min(0).max(100), editorialStrategy: z.string().min(1), supportingFacts: z.array(z.string()), factualClaims: z.array(factualClaimSchema), sourceReferences: z.array(z.string()), warnings: z.array(z.string()), recommendedCandidate: z.boolean().default(false) });
export const ideaCandidatesSchema = z.object({ candidates: z.array(ideaCandidateSchema).length(3) });
export const rankingScoreSchema = z.object({ candidateIndex: z.number().int().min(0).max(2), hookStrength: z.number().min(0).max(100), clarity: z.number().min(0).max(100), novelty: z.number().min(0).max(100), retention: z.number().min(0).max(100), shareability: z.number().min(0).max(100), shortVideoFit: z.number().min(0).max(100), factualSupport: z.number().min(0).max(100), total: z.number().min(0).max(100), rationale: z.string().min(1) });
export const rankedIdeasSchema = z.object({ recommendedIndex: z.number().int().min(0).max(2), scores: z.array(rankingScoreSchema).length(3) });
export const sceneSchema = z.object({
  order: z.number().int().min(1).max(10), startSeconds: z.number().min(0), durationSeconds: z.number().min(2).max(8),
  visualType: z.enum(["SOURCE_MEDIA", "STOCK_VIDEO", "STOCK_IMAGE", "TEXT_CARD", "BRAND_CARD"]), assetQuery: z.string(), assetUrl: z.string().url().optional(),
  narration: z.string().min(1), headline: z.string().max(100).optional(), caption: z.string().min(1).max(180), captionPosition: z.enum(["TOP", "CENTER", "BOTTOM"]),
  mediaFit: z.enum(["COVER", "CONTAIN"]), mediaMotion: z.enum(["NONE", "SLOW_ZOOM_IN", "SLOW_ZOOM_OUT", "PAN_LEFT", "PAN_RIGHT"]),
  transition: z.enum(["CUT", "FADE", "SLIDE", "ZOOM"]), textStyle: z.string().max(50).optional(), emphasisWords: z.array(z.string().min(1)).max(8).optional(),
  overlay: z.object({ enabled: z.boolean(), opacity: z.number().min(0).max(.85) }).optional(),
}).superRefine((scene, ctx) => {
  const needsMedia = ["SOURCE_MEDIA", "STOCK_VIDEO", "STOCK_IMAGE"].includes(scene.visualType);
  if (needsMedia && !scene.assetQuery.trim() && !scene.assetUrl) ctx.addIssue({ code: "custom", path: ["assetQuery"], message: "Media scenes require an asset query or URL" });
});
export const masterContentSchema = z.object({ title: z.string().min(1), thesis: z.string().min(1), hook: z.string().min(1), script: z.string().min(1), caption: z.string().min(1), cta: z.string().min(1), hashtags: z.array(z.string()), estimatedDuration: z.number().positive().max(180), factualClaims: z.array(factualClaimSchema), sourceReferences: z.array(z.string()), warnings: z.array(z.string()), scenes: z.array(sceneSchema).min(1) });
export const platformVariantSchema = z.object({ platform: z.enum(["TIKTOK", "YOUTUBE_SHORTS"]), title: z.string(), hook: z.string().min(1), script: z.string().min(1), caption: z.string(), description: z.string(), cta: z.string(), hashtags: z.array(z.string()), targetDuration: z.number().positive().max(180) });
export const platformVariantsSchema = z.object({ variants: z.array(platformVariantSchema).length(2).refine(v => new Set(v.map(x => x.platform)).size === 2, "Both platforms are required") });
export const renderPlanSchema = z.object({
  version: z.literal("dark-media-composer-v1"), aspectRatio: z.literal("9:16"), targetDuration: z.number().min(30).max(45), scenes: z.array(sceneSchema).min(6).max(10),
  voice: z.object({ provider: z.literal("ELEVENLABS"), voiceId: z.string().min(1) }),
  backgroundAudio: z.object({ mood: z.string().min(1), volume: z.number().min(0).max(.35), sourceUrl: z.string().url().nullable(), ducking: z.boolean() }),
  branding: z.object({ brandName: z.string().min(1), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), fontFamily: z.string().min(1), logoAssetUrl: z.string().url().nullable() }),
}).superRefine((plan, ctx) => {
  let cursor = 0;
  for (const [index, scene] of plan.scenes.entries()) {
    if (scene.order !== index + 1) ctx.addIssue({ code: "custom", path: ["scenes", index, "order"], message: "Scene order must be contiguous" });
    if (Math.abs(scene.startSeconds - cursor) > .05) ctx.addIssue({ code: "custom", path: ["scenes", index, "startSeconds"], message: "Scene timeline must be contiguous" });
    cursor += scene.durationSeconds;
  }
  if (Math.abs(cursor - plan.targetDuration) > .05) ctx.addIssue({ code: "custom", path: ["targetDuration"], message: "Scene duration must match target duration" });
});

export type IdeaCandidate = z.infer<typeof ideaCandidateSchema>;
export type MasterContent = z.infer<typeof masterContentSchema>;
export type PlatformVariant = z.infer<typeof platformVariantSchema>;
export type RenderPlan = z.infer<typeof renderPlanSchema>;
