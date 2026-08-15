# Pipeline automatizado OpenAI → Creatomate

## Fluxo editorial

`SOURCE → TOPIC → 3 AI IDEAS → RANKING → MASTER CONTENT → TIKTOK/SHORTS → RENDER PLAN → ASSET RESOLUTION → CREATOMATE → RENDERED → HUMAN REVIEW → APPROVED`.

Ao escolher um candidato, o backend gera e valida Master Content, duas variantes e RenderPlan. Toda claim relevante referencia `source_items`; incerteza vira warning. A OpenAI usa Structured Outputs e schemas Zod. Prompts ficam em `src/ai/prompts.ts`; segredo nunca chega ao browser.

## Configuração

- Produção real: `AI_PROVIDER=openai`, `OPENAI_API_KEY`, opcionalmente `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS` e `OPENAI_MAX_CONTEXT_CHARS`.
- Desenvolvimento explícito: `AI_PROVIDER=development`. É determinístico e rotulado; não representa IA real.
- Sem configuração: `AI_PROVIDER=disabled`; a UI mostra **IA NÃO CONFIGURADA**.
- Render real: `CREATOMATE_API_KEY` e `CREATOMATE_TEMPLATE_ID`.
- Resolução real de mídia: `ASSET_PROVIDER=pexels` e `PEXELS_API_KEY`. Sem isso, cenas obrigatórias permanecem `MISSING` e o conteúdo permanece `NEEDS_MEDIA`.
- Contrato do template: `CREATOMATE_TEMPLATE_CONTRACT=dark-media-v1`.
- Sem ambas: a UI mostra **RENDERIZAÇÃO NÃO CONFIGURADA** e nenhuma linha é marcada como concluída.

## Estados persistidos

`AI_READY → GENERATING → CONTENT_READY → NEEDS_MEDIA → READY_TO_RENDER → RENDERING → RENDERED → APPROVED`, além de `FAILED`. Aprovação só é aceita após `RENDERED`. Upload manual continua como fallback. Publicação social automática não integra este pipeline.

## Render e polling

`render_plans` guarda instruções editoriais validadas, desacopladas do payload Creatomate. `renders` guarda ID externo, timestamps, polling, URL, metadata e erro. Submissão confirma apenas `RENDERING`; somente status `succeeded` com URL do Creatomate vira `RENDERED`.

## Asset Resolution

`assetQuery` é apenas intenção de busca. O resolver consulta o provider configurado e persiste em `render_plan_scene_assets` a query original, provider, URL HTTPS, tipo, atribuição/licença, status e erro. Cenas `SOURCE_MEDIA` e `STOCK` exigem mídia; `TEXT` e `BRAND` são registradas como `NOT_REQUIRED`. O RenderPlan não é alterado. Se qualquer cena obrigatória estiver ausente, o estado é `NEEDS_MEDIA` e nenhuma requisição de render é criada.

## Contrato obrigatório do template Creatomate (`dark-media-v1`)

O template precisa expor `Brand` e, para cada ordem `N` existente no RenderPlan:

- `Scene-N.Text`: texto visível da cena;
- `Scene-N.Media`: elemento de imagem/vídeo que recebe uma URL HTTPS resolvida (obrigatório para `SOURCE_MEDIA` e `STOCK`);
- `Scene-N.VoiceOver`: elemento de áudio/text-to-speech que recebe o voice-over;
- `Scene-N.Duration`: duração numérica da cena.

`Scene-N.AssetQuery` **não existe no contrato e nunca é enviado**. Antes da submissão, o backend valida contrato, texto, voice-over, duração e todas as mídias obrigatórias. Resposta HTTP 400 do Creatomate é persistida como `CREATOMATE_TEMPLATE_INCOMPATIBLE`.

## Custos e troubleshooting

`ai_executions` registra operação, modelo, tokens e custo estimado quando fornecidos pela API. O contexto é limitado e contém somente Topic, Brand Brain essencial e até 12 fontes resumidas. Erros de rede/schema são persistidos de forma segura, sem payload ou chave. Verifique migration, credenciais backend, template Creatomate e correspondência dos nomes `Scene-N.*` quando uma renderização falhar.
