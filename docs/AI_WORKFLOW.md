# AI-first workflow

## Princípio

A máquina propõe e o humano decide. O caminho principal não começa com um formulário vazio:

`Hot Queue → gerar 3 candidatos → escolher → Studio preenchido → gerar Master → gerar variantes → revisar → aprovar`.

## O que funciona agora

- `AIProvider` tipado separa geração, ranking, Master Content e variantes da UI.
- O provider de desenvolvimento determinístico gera **exatamente três** candidatos e é sempre identificado como `DEVELOPMENT`; ele serve para testar o fluxo, não se apresenta como IA real.
- Cada candidato persiste title, angle, rationale, suggestedHook, potential, strategy, fatos de apoio, warnings, batch e `recommendedCandidate`.
- Confidence abaixo de 50 adiciona aviso e exige linguagem de rumor.
- Selecionar um candidato persiste o estado e abre o Studio pré-preenchido.
- Geração de Master persiste headline, tese, hook, script, caption, claims e supports.
- Geração de variantes cria/adapta TikTok e YouTube Shorts independentemente.
- O operador pode editar tudo ou abrir o modo manual secundário.

Para testar localmente, defina `AI_PROVIDER=development`. A interface mostra explicitamente “Provider de desenvolvimento”. Sem configuração, o sistema exibe `IA NÃO CONFIGURADA`, não quebra e não fabrica resposta.

## Provider real e automação

`AI_PROVIDER=openai` ativa o provider OpenAI backend-only com Responses API, Structured Outputs, validação Zod, timeout, contexto limitado e auditoria de tokens/custo. A seleção gera Master, variantes e RenderPlan em sequência. `AI_PROVIDER=development` continua sendo apenas um modo determinístico explicitamente rotulado; sem configuração não há saída simulada. O pipeline de vídeo usa Creatomate e só alcança `RENDERED` depois de polling confirmado pelo provider. Consulte `AUTOMATED_CONTENT_PIPELINE.md`.
