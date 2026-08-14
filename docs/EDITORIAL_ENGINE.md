# Editorial Engine

## Dois eixos que não se confundem

`viralityScore` estima atenção; `confidenceScore` estima sustentação factual. Ambos permanecem visíveis mesmo quando há prioridade alta. Hot + uncertain entra em pesquisa urgente, nunca em publicação apresentada como fato.

## Virality Score

`src/editorial/engine.ts` centraliza pesos para conflito, controvérsia, peso da personalidade, curiosidade, emoção, surpresa, reviravolta, comentários, compartilhamentos, fit, freshness, momentum, timing e risco de saturação. Todos os sinais e resultados são normalizados em 0–100. A evolução prevista permite pesos por Brand.

## Confidence Score e provenance

Fonte primária, confirmação oficial, independência, reputação, consistência, documentos e mídia original elevam confiança. Contradições, especulação, anonimato e risco de origem duplicada reduzem-na. `source_items.provenance_group` permite reconhecer dez republicações da mesma origem como uma cadeia, não dez confirmações.

## Momentum

`momentumScore` é um eixo persistido para velocidade/aceleração. Workers futuros calcularão fontes e menções por intervalo, crescimento de engagement, alcance multiplataforma e mudança de velocidade. Um tópico menor em forte aceleração pode superar um tema enorme estável.

## Freshness

As faixas são `BREAKING` (até 30 min), `VERY_FRESH` (até 2 h), `FRESH` (até 12 h), `AGING` (até 48 h) e `SATURATED`. Topic preserva primeira detecção, publicação original, última informação e coleta.

## Saturation e reentrada

`saturationRisk` penaliza repetição, mas não bloqueia uma pauta: declaração, consequência, reação, contradição, vídeo ou personagem novo habilitam reentrada editorial.

## Editorial Priority

Representa valor de produção **agora**. Fórmula inicial: viralidade 32%, momentum 22%, freshness 18%, audience fit 13%, confiança 12%, menos saturação 9%. O score ordena a Hot Queue; jamais esconde confiança baixa.

## Brand Brain e Hook Engine

Brand Brain configura audiência, persona, tom, agressividade, apetite por controvérsia, vocabulário, CTAs, plataformas e objetivos. Agressividade molda embalagem, não factualidade. Hooks candidatos podem explorar conflito, pergunta, surpresa, contraste, consequência, curiosidade ou reviravolta e recebem `hookScore`; só são válidos quando sustentados pelos claims e fontes.
