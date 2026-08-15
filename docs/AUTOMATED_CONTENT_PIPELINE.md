# Pipeline automatizado OpenAI → Creatomate

## Fluxo editorial

`SOURCE → TOPIC → 3 AI IDEAS → RANKING → MASTER CONTENT → TIKTOK/SHORTS → RENDER PLAN → CREATOMATE → RENDERED → HUMAN REVIEW → APPROVED`.

Ao escolher um candidato, o backend gera e valida Master Content, duas variantes e RenderPlan. Toda claim relevante referencia `source_items`; incerteza vira warning. A OpenAI usa Structured Outputs e schemas Zod. Prompts ficam em `src/ai/prompts.ts`; segredo nunca chega ao browser.

## Configuração

- Produção real: `AI_PROVIDER=openai`, `OPENAI_API_KEY`, opcionalmente `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS` e `OPENAI_MAX_CONTEXT_CHARS`.
- Desenvolvimento explícito: `AI_PROVIDER=development`. É determinístico e rotulado; não representa IA real.
- Sem configuração: `AI_PROVIDER=disabled`; a UI mostra **IA NÃO CONFIGURADA**.
- Render real: `CREATOMATE_API_KEY` e `CREATOMATE_TEMPLATE_ID`.
- Sem ambas: a UI mostra **RENDERIZAÇÃO NÃO CONFIGURADA** e nenhuma linha é marcada como concluída.

## Estados persistidos

`AI_READY → GENERATING → CONTENT_READY → NEEDS_MEDIA → READY_TO_RENDER → RENDERING → RENDERED → APPROVED`, além de `FAILED`. Aprovação só é aceita após `RENDERED`. Upload manual continua como fallback. Publicação social automática não integra este pipeline.

## Render e polling

`render_plans` guarda instruções editoriais validadas, desacopladas do payload Creatomate. `renders` guarda ID externo, timestamps, polling, URL, metadata e erro. Submissão confirma apenas `RENDERING`; somente status `succeeded` com URL do Creatomate vira `RENDERED`.

## Custos e troubleshooting

`ai_executions` registra operação, modelo, tokens e custo estimado quando fornecidos pela API. O contexto é limitado e contém somente Topic, Brand Brain essencial e até 12 fontes resumidas. Erros de rede/schema são persistidos de forma segura, sem payload ou chave. Verifique migration, credenciais backend, template Creatomate e correspondência dos nomes `Scene-N.*` quando uma renderização falhar.
