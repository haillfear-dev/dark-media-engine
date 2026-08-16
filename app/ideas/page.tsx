import { addIdea, generateIdeaCandidates, selectCandidate } from "@/app/actions";
import { PendingButton } from "@/app/components/PendingButton";
import { all, one, Row } from "@/src/db";
import { getAIProvider } from "@/src/ai/provider";
export const dynamic = "force-dynamic";

export default async function Ideas({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const topic = one<Row>("SELECT * FROM topics WHERE id=?", query.topic || "topic-a") ?? one<Row>("SELECT * FROM topics ORDER BY editorial_priority_score DESC LIMIT 1")!;
  const batchId = query.batch || String(one<Row>("SELECT generation_batch_id FROM ideas WHERE topic_id=? AND generation_batch_id IS NOT NULL ORDER BY created_at DESC LIMIT 1", String(topic.id))?.generation_batch_id ?? "");
  const candidates = batchId ? all<Row>("SELECT * FROM ideas WHERE topic_id=? AND generation_batch_id=? ORDER BY recommended DESC,rank_score DESC LIMIT 3", String(topic.id), batchId) : [];
  const provider = getAIProvider();
  const selectionError = query.error ? selectionErrorMessage(query.error) : null;
  return <div className="page"><div className="titleRow"><div><div className="eyebrow">A MÁQUINA PROPÕE · O HUMANO DECIDE</div><h1>Escolha um ângulo</h1></div><span className="tag">{provider.provenanceLabel === "DEVELOPMENT" ? "PROVIDER DE DESENVOLVIMENTO" : provider.name.toUpperCase()}</span></div>
    <section className="panel topicContext"><div><small className="muted">TOPIC EM ANÁLISE</small><h2>{topic.title}</h2><p>{topic.summary}</p></div><div className="metricStrip"><span>VIRAL <b>{topic.virality_score}</b></span><span>MOMENTUM <b>{topic.momentum_score}</b></span><span>CONFIANÇA <b className={Number(topic.confidence_score)<50?"uncertain":"good"}>{topic.confidence_score}</b></span></div></section>
    {!provider.available && <div className="notice"><b>IA NÃO CONFIGURADA.</b> Configure `AI_PROVIDER` no backend ou use o modo manual. Para avaliar a UX local sem alegar IA real, use `AI_PROVIDER=development`.</div>}
    {selectionError && <div className="notice" role="alert"><b>NÃO FOI POSSÍVEL CRIAR O CONTEÚDO.</b> {selectionError} Tente novamente.</div>}
    {candidates.length === 3 ? <><div className="candidateGrid">{candidates.map((candidate,index)=><article className={`panel candidate ${candidate.recommended?"recommended":""}`} key={String(candidate.id)}>{candidate.recommended?<span className="recommend">RECOMENDADO PELA IA</span>:<span className="option">OPÇÃO {index+1}</span>}<h2>{candidate.title}</h2><div className="candidateScore"><b>{candidate.rank_score}</b><small>POTENCIAL</small></div>{Number(topic.confidence_score)<50&&<div className="lowConfidence">CONFIRMAÇÃO BAIXA · TRATAR COMO RUMOR</div>}<label>HOOK SUGERIDO<blockquote>{candidate.suggested_hook}</blockquote></label><p>{candidate.rationale}</p><div className="signals"><span>{candidate.editorial_strategy}</span><span>{candidate.generated_by}</span></div><details><summary>Fatos de apoio e avisos</summary><ul>{(JSON.parse(String(candidate.supporting_facts)) as string[]).map(fact=><li key={fact}>{fact}</li>)}</ul>{(JSON.parse(String(candidate.warnings)) as string[]).map(warning=><p className="uncertain" key={warning}>{warning}</p>)}</details><div className="actions"><form action={selectCandidate}><input type="hidden" name="ideaId" value={String(candidate.id)}/><input type="hidden" name="topicId" value={String(topic.id)}/><input type="hidden" name="batchId" value={batchId}/><PendingButton idle="USAR ESTA" pending="CRIANDO CONTEÚDO..."/></form><a className="btn secondary" href={`#manual-${candidate.id}`}>EDITAR</a></div></article>)}</div><form action={generateIdeaCandidates} className="actions"><input type="hidden" name="topicId" value={String(topic.id)}/><input type="hidden" name="generation" value={String(Date.now())}/><PendingButton idle="GERAR OUTRAS 3"/></form></> : provider.available ? <form action={generateIdeaCandidates} className="panel emptyGeneration"><input type="hidden" name="topicId" value={String(topic.id)}/><p>O provider analisará Topic, fontes, sinais, confidence e Brand Brain para propor exatamente três abordagens.</p><PendingButton idle="ANALISAR TOPIC E GERAR 3 OPÇÕES"/></form> : null}
    <details className="panel manualMode" open={!provider.available}><summary>CRIAR MANUALMENTE</summary><form action={addIdea} className="formGrid"><input type="hidden" name="topicId" value={String(topic.id)}/><label className="full">Título<input name="title" required/></label><label className="full">Ângulo<textarea name="angle" required/></label><label className="full">Hook sugerido<textarea name="suggestedHook" required/></label><label className="full">Rationale<textarea name="rationale"/></label><button className="full secondary">CRIAR IDEIA MANUAL</button></form></details>
  </div>;
}

function selectionErrorMessage(code: string) {
  if (code === "OPENAI_TIMEOUT") return "A OpenAI excedeu o tempo limite da etapa em andamento.";
  if (code === "OPENAI_REQUEST_FAILED" || code === "OPENAI_NETWORK_ERROR") return "Houve uma falha de comunicação com a OpenAI.";
  if (code === "AI_NOT_CONFIGURED") return "O provider de IA não está configurado.";
  if (code === "AI_SOURCE_REFERENCE_INVALID" || code === "OPENAI_SCHEMA_INVALID" || code === "OPENAI_INVALID_JSON") return "A resposta gerada não passou pela validação de segurança.";
  return "O processamento foi encerrado de forma controlada.";
}
