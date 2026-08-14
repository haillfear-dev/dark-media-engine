export type TopicContext = {
  id: string;
  title: string;
  summary: string;
  confidenceScore: number;
  viralityScore: number;
  momentumScore: number;
  saturationRisk: number;
  freshness: string;
  signals: string[];
  sourceItems: Array<{ id: string; title: string; summary: string; url: string | null }>;
  brand: { id: string; name: string; tone: string; targetAudience: string; editorialAggressiveness: string };
};

export type IdeaCandidate = {
  title: string;
  angle: string;
  rationale: string;
  suggestedHook: string;
  viralityPotential: number;
  editorialStrategy: string;
  supportingFacts: string[];
  warnings: string[];
  recommendedCandidate: boolean;
};

export type MasterContentDraft = {
  headline: string;
  thesis: string;
  masterHook: string;
  masterScript: string;
  captionBase: string;
  factualClaims: Array<{ text: string; confidence: "HIGH" | "MEDIUM" | "LOW"; sourceItemIds: string[] }>;
  sourceReferences: string[];
};

export type PlatformDraft = {
  platform: "TIKTOK" | "YOUTUBE_SHORTS";
  title: string;
  hook: string;
  script: string;
  caption: string;
  description: string;
  hashtags: string;
  cta: string;
  targetDuration: number;
  visualDirection: string;
};

export interface AIProvider {
  readonly available: boolean;
  readonly name: string;
  readonly provenanceLabel: "AI" | "DEVELOPMENT" | "DISABLED";
  generateIdeaCandidates(topic: TopicContext, generation: number): Promise<IdeaCandidate[]>;
  rankIdeaCandidates(candidates: IdeaCandidate[], topic: TopicContext): Promise<IdeaCandidate[]>;
  generateContentFromIdea(topic: TopicContext, idea: IdeaCandidate): Promise<MasterContentDraft>;
  generatePlatformVariants(content: MasterContentDraft): Promise<PlatformDraft[]>;
}

export class AIUnavailableError extends Error {
  constructor() { super("IA NÃO CONFIGURADA"); this.name = "AIUnavailableError"; }
}

export class DisabledAIProvider implements AIProvider {
  readonly available = false;
  readonly name = "IA não configurada";
  readonly provenanceLabel = "DISABLED" as const;
  private unavailable(): never { throw new AIUnavailableError(); }
  async generateIdeaCandidates(): Promise<IdeaCandidate[]> { return this.unavailable(); }
  async rankIdeaCandidates(): Promise<IdeaCandidate[]> { return this.unavailable(); }
  async generateContentFromIdea(): Promise<MasterContentDraft> { return this.unavailable(); }
  async generatePlatformVariants(): Promise<PlatformDraft[]> { return this.unavailable(); }
}

/** Deterministic local fixture provider. It is always labelled DEVELOPMENT and never presented as real AI. */
export class DevelopmentAIProvider implements AIProvider {
  readonly available = true;
  readonly name = "Provider determinístico de desenvolvimento";
  readonly provenanceLabel = "DEVELOPMENT" as const;

  async generateIdeaCandidates(topic: TopicContext, generation: number): Promise<IdeaCandidate[]> {
    const uncertain = topic.confidenceScore < 50;
    const qualifier = uncertain ? "Rumor sobre" : "A resposta em";
    const facts = topic.sourceItems.map((item) => item.summary).slice(0, 3);
    const warning = uncertain ? ["CONFIRMAÇÃO BAIXA — preserve linguagem de rumor e não afirme confirmação."] : [];
    const shift = generation % 3;
    const base: Omit<IdeaCandidate, "recommendedCandidate">[] = [
      { title: `${qualifier} ${topic.title} ganha força`, angle: "A nova informação que acelerou a repercussão, distinguindo publicação observada de interpretação.", rationale: "Momentum e freshness indicam uma janela curta; o ângulo prioriza o elemento novo sustentado pelas fontes.", suggestedHook: uncertain ? "O rumor ganhou força — mas o que existe de confirmação até agora?" : "Parecia que o assunto tinha esfriado — até que veio esta nova informação.", viralityPotential: Math.min(99, topic.viralityScore), editorialStrategy: "REENTRADA + CONSEQUÊNCIA", supportingFacts: facts, warnings: warning },
      { title: `O detalhe que iniciou ${topic.title.toLowerCase()}`, angle: "Reconstruir a cronologia e destacar o primeiro detalhe verificável.", rationale: "Oferece contexto novo para quem já viu a headline e reduz o risco de repetir um assunto saturado.", suggestedHook: "Todo mundo está olhando para o desfecho, mas a história começou com este detalhe.", viralityPotential: Math.max(0, topic.viralityScore - 5 + shift), editorialStrategy: "CRONOLOGIA + CURIOSIDADE", supportingFacts: facts, warnings: warning },
      { title: `Por que a reação a ${topic.title.toLowerCase()} se dividiu`, angle: "Mapear as reações públicas sem apresentar leitura de audiência como fato universal.", rationale: "A estratégia captura comment potential e formação de lados sem inventar intenção dos personagens.", suggestedHook: "A reação criou dois lados — e existe um ponto específico no centro da discussão.", viralityPotential: Math.max(0, topic.viralityScore - 9 + shift), editorialStrategy: "REAÇÃO + DEBATE", supportingFacts: facts, warnings: warning },
    ];
    return base.map((candidate, index) => ({ ...candidate, recommendedCandidate: index === 0 }));
  }

  async rankIdeaCandidates(candidates: IdeaCandidate[]): Promise<IdeaCandidate[]> {
    return [...candidates].sort((a, b) => b.viralityPotential - a.viralityPotential).map((candidate, index) => ({ ...candidate, recommendedCandidate: index === 0 }));
  }

  async generateContentFromIdea(topic: TopicContext, idea: IdeaCandidate): Promise<MasterContentDraft> {
    const qualifier = topic.confidenceScore < 50 ? "Até agora, o que existe é um rumor em aceleração, sem confirmação primária." : "As fontes vinculadas registram uma nova informação pública sobre o assunto.";
    return { headline: idea.title, thesis: idea.angle, masterHook: idea.suggestedHook, masterScript: `${idea.suggestedHook}\n\n${qualifier} ${topic.summary}\n\nO contexto foi construído a partir das fontes vinculadas. Reações e interpretações devem continuar identificadas como tais.`, captionBase: `${idea.title}. Veja o contexto e as fontes antes de tirar uma conclusão.`, factualClaims: topic.sourceItems.map((item) => ({ text: item.summary, confidence: topic.confidenceScore >= 80 ? "HIGH" : topic.confidenceScore >= 50 ? "MEDIUM" : "LOW", sourceItemIds: [item.id] })), sourceReferences: topic.sourceItems.map((item) => item.id) };
  }

  async generatePlatformVariants(content: MasterContentDraft): Promise<PlatformDraft[]> {
    return [
      { platform: "TIKTOK", title: content.headline, hook: content.masterHook, script: `${content.masterHook}\n${content.masterScript}`, caption: content.captionBase, description: "", hashtags: "#RadarPop #CulturaPop", cta: "Qual é a sua leitura?", targetDuration: 40, visualDirection: "Hook nos primeiros 2 segundos; fontes identificadas na tela; cortes rápidos." },
      { platform: "YOUTUBE_SHORTS", title: content.headline.slice(0, 100), hook: `Entenda: ${content.masterHook}`, script: `${content.masterHook}\n${content.masterScript}`, caption: "", description: `${content.captionBase}\n\nFontes vinculadas no Content OS.`, hashtags: "#Shorts #RadarPop", cta: "Inscreva-se para acompanhar os próximos capítulos.", targetDuration: 55, visualDirection: "Contexto suficiente para descoberta; títulos e fontes legíveis; formato vertical." },
    ];
  }
}

export function getAIProvider(): AIProvider {
  return process.env.AI_PROVIDER === "development" ? new DevelopmentAIProvider() : new DisabledAIProvider();
}
