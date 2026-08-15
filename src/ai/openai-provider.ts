import { prompts } from "./prompts.ts";
import { ideaCandidatesSchema, masterContentSchema, platformVariantsSchema, rankedIdeasSchema, renderPlanSchema, type IdeaCandidate, type MasterContent, type PlatformVariant } from "./schemas.ts";
import type { AIProvider, TopicContext, AIUsage } from "./provider.ts";
import { z, type ZodType } from "zod";

type ResponseEnvelope = { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
export class OpenAIProviderError extends Error { readonly code: string; constructor(code: string, message: string) { super(message); this.code = code; this.name = "OpenAIProviderError"; } }

export class OpenAIProvider implements AIProvider {
  readonly available = true; readonly name = "OpenAI"; readonly provenanceLabel = "AI" as const;
  private readonly endpoint: string; private readonly fetcher: typeof fetch;
  private readonly apiKey: string; readonly model: string;
  constructor(apiKey: string, model = process.env.OPENAI_MODEL || "gpt-5-mini", fetcher: typeof fetch = fetch) { this.apiKey = apiKey; this.model = model; if (!apiKey) throw new OpenAIProviderError("OPENAI_NOT_CONFIGURED", "IA NÃO CONFIGURADA"); this.endpoint = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses"; this.fetcher = fetcher; }
  private async structured<T>(operation: string, instruction: string, input: unknown, schemaName: string, schema: ZodType<T>): Promise<{ value: T; usage: AIUsage }> {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_TIMEOUT_MS || 45000));
    try {
      const response = await this.fetcher(this.endpoint, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: this.model, instructions: instruction, input: JSON.stringify(input).slice(0, Number(process.env.OPENAI_MAX_CONTEXT_CHARS || 30000)), text: { format: { type: "json_schema", name: schemaName, strict: true, schema: z.toJSONSchema(schema) } } }) });
      if (!response.ok) throw new OpenAIProviderError("OPENAI_REQUEST_FAILED", `OpenAI indisponível (${response.status})`);
      const envelope = await response.json() as ResponseEnvelope;
      const text = envelope.output_text ?? envelope.output?.flatMap(item => item.content ?? []).map(item => item.text ?? "").join("") ?? "";
      let decoded: unknown; try { decoded = JSON.parse(text); } catch { throw new OpenAIProviderError("OPENAI_INVALID_JSON", "A OpenAI retornou JSON inválido"); }
      const parsed = schema.safeParse(decoded); if (!parsed.success) throw new OpenAIProviderError("OPENAI_SCHEMA_INVALID", "A resposta da OpenAI não respeitou o schema");
      const inputTokens = envelope.usage?.input_tokens ?? 0, outputTokens = envelope.usage?.output_tokens ?? 0;
      return { value: parsed.data, usage: { operation, model: this.model, inputTokens, outputTokens, estimatedCostUsd: estimateCost(this.model, inputTokens, outputTokens) } };
    } catch (error) { if (error instanceof OpenAIProviderError) throw error; if ((error as Error).name === "AbortError") throw new OpenAIProviderError("OPENAI_TIMEOUT", "Tempo limite da OpenAI excedido"); throw new OpenAIProviderError("OPENAI_NETWORK_ERROR", "Falha de comunicação com a OpenAI"); }
    finally { clearTimeout(timeout); }
  }
  async generateIdeaCandidates(topic: TopicContext) { const r = await this.structured("GENERATE_IDEAS", prompts.ideas, topic, "idea_candidates", ideaCandidatesSchema); this.lastUsage = r.usage; return r.value.candidates; }
  async rankIdeaCandidates(candidates: IdeaCandidate[], topic: TopicContext) { const r = await this.structured("RANK_IDEAS", prompts.ranking, { topic, candidates }, "ranked_ideas", rankedIdeasSchema); this.lastUsage = r.usage; return candidates.map((c, i) => ({ ...c, viralityPotential: r.value.scores.find(s => s.candidateIndex === i)?.total ?? c.viralityPotential, recommendedCandidate: i === r.value.recommendedIndex })).sort((a,b) => b.viralityPotential-a.viralityPotential); }
  async generateContentFromIdea(topic: TopicContext, idea: IdeaCandidate) { const r = await this.structured("GENERATE_CONTENT", prompts.content, { topic, idea }, "master_content", masterContentSchema); this.lastUsage = r.usage; return r.value; }
  async generatePlatformVariants(content: MasterContent) { const r = await this.structured("GENERATE_VARIANTS", prompts.variants, content, "platform_variants", platformVariantsSchema); this.lastUsage = r.usage; return r.value.variants; }
  async generateRenderPlan(content: MasterContent, variants: PlatformVariant[], brand: TopicContext["brand"]) { const r = await this.structured("GENERATE_RENDER_PLAN", prompts.renderPlan, { content, variants, brand }, "render_plan", renderPlanSchema); this.lastUsage = r.usage; return r.value; }
  lastUsage?: AIUsage;
}
function estimateCost(model: string, input: number, output: number) { const rates = model.includes("mini") ? [0.25, 2] : [1.25, 10]; return Number(((input * rates[0] + output * rates[1]) / 1_000_000).toFixed(6)); }
