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
- Contrato do template: `CREATOMATE_TEMPLATE_CONTRACT=dark-media-v2`.
- Sem ambas: a UI mostra **RENDERIZAÇÃO NÃO CONFIGURADA** e nenhuma linha é marcada como concluída.

## Estados persistidos

`AI_READY → GENERATING → CONTENT_READY → NEEDS_MEDIA → READY_TO_RENDER → RENDERING → RENDERED → APPROVED`, além de `FAILED`. Aprovação só é aceita após `RENDERED`. Upload manual continua como fallback. Publicação social automática não integra este pipeline.

## Render e polling

`render_plans` guarda instruções editoriais validadas, desacopladas do payload Creatomate. `renders` guarda ID externo, timestamps, polling, URL, metadata e erro. Submissão confirma apenas `RENDERING`; somente status `succeeded` com URL do Creatomate vira `RENDERED`.

## Asset Resolution

`assetQuery` é apenas intenção de busca. O resolver consulta o provider configurado e persiste em `render_plan_scene_assets` a query original, provider, URL HTTPS, tipo, atribuição/licença, status e erro. Cenas `SOURCE_MEDIA` e `STOCK` exigem mídia; `TEXT` e `BRAND` são registradas como `NOT_REQUIRED`. O RenderPlan não é alterado. Se qualquer cena obrigatória estiver ausente, o estado é `NEEDS_MEDIA` e nenhuma requisição de render é criada.

## Contrato obrigatório do template Creatomate (`dark-media-v2`)

O primeiro template do MVP possui **6 slots de cena**. O RenderPlan pode usar de uma a seis cenas; mais de seis falha com `CREATOMATE_SCENE_LIMIT_EXCEEDED` antes de qualquer chamada externa. O template precisa expor `Brand` e, para cada `N` de 1 a 6:

- `Brand`: elemento de texto. Modificação: `Brand.text`.
- `Scene-N.Media`: elemento de imagem ou vídeo. Modificações: `Scene-N.Media.source` com a URL HTTPS resolvida e `Scene-N.Media.duration`.
- `Scene-N.Text`: elemento de texto. Modificações: `Scene-N.Text.text` e `Scene-N.Text.duration`.
- `Scene-N.VoiceOver`: elemento RenderScript do tipo `audio`, com provider de TTS configurado no próprio template. Modificação: `Scene-N.VoiceOver.source`, recebendo apenas o texto da narração. A duração do áudio é determinada pelo elemento/provider no Creatomate.

Não há uma API de TTS adicional no backend. `Scene-N.AssetQuery`, `Scene-N.Duration` e valores genéricos atribuídos diretamente ao nome do elemento **não existem no contrato e nunca são enviados**. Antes da submissão, o backend valida versão do contrato, limite/slots de cenas, texto, voice-over, duração e todas as mídias obrigatórias. O POST usa `https://api.creatomate.com/v2/renders` e o polling usa `https://api.creatomate.com/v2/renders/:id`. Resposta HTTP 400 do Creatomate é persistida como `CREATOMATE_TEMPLATE_INCOMPATIBLE`.

## Custos e troubleshooting

`ai_executions` registra operação, modelo, tokens e custo estimado quando fornecidos pela API. O contexto é limitado e contém somente Topic, Brand Brain essencial e até 12 fontes resumidas. Erros de rede/schema são persistidos de forma segura, sem payload ou chave. Verifique migration, credenciais backend, template Creatomate e correspondência dos nomes `Scene-N.*` quando uma renderização falhar.
