# Dark Media Engine — Content Operating System

Content OS AI-first persistido para operar marcas do **Topic à Publication**: a máquina propõe candidatos, Master e variantes; o humano escolhe, edita e aprova. O seed usa apenas personagens e eventos fictícios.

## Executar

Requer Node.js 22.5+ (o banco usa `node:sqlite`).

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. Para experimentar geração local claramente rotulada, configure `AI_PROVIDER=development`; sem isso a aplicação opera manualmente e mostra `IA NÃO CONFIGURADA`. Para reiniciar os dados: remova `data/content-os.db`, rode migration e seed novamente.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Escopo

Brand Brain, fontes, Topics, Hot Queue, batches de três candidatos, seleção, Master Content, claims, variantes, Asset MP4, aprovação, agendamento, OAuth e Publications persistem em SQLite. TikTok e YouTube possuem providers oficiais backend, mas permanecem `NOT_CONFIGURED` sem credenciais e não simulam sucesso. Consulte `docs/AI_WORKFLOW.md` e `docs/SOCIAL_INTEGRATIONS.md`.

## OpenAI e vídeo automatizado

Configure `AI_PROVIDER=openai` e `OPENAI_API_KEY` para geração real estruturada. Configure `CREATOMATE_API_KEY` e `CREATOMATE_TEMPLATE_ID` para render real. A seleção de uma ideia gera Master Content, variantes TikTok/Shorts e RenderPlan; a aprovação permanece bloqueada até a confirmação `RENDERED` do Creatomate. Sem credenciais, a interface informa a indisponibilidade e não simula sucesso. Veja `docs/AUTOMATED_CONTENT_PIPELINE.md`.

## Ingestão automática de fontes

Depois de migrations e seed, execute `npm run ingest -- --force` para coletar um lote pequeno das fontes editoriais habilitadas. Execuções normais com `npm run ingest` respeitam intervalos, ETag, Last-Modified e backoff persistidos. A Hot Queue prioriza Topics `REAL`; fixtures fictícias aparecem somente quando ainda não existem Topics reais.

A coleta usa RSS/Atom, news sitemap ou HTML estruturado conforme a configuração editável de cada fonte, sem Selenium e sem contornar login, paywall, CAPTCHA ou bloqueios. Imagens OpenGraph são apenas referência editorial e nunca substituem o `AssetProvider` licenciado usado no vídeo. Consulte `docs/SOURCE_INGESTION.md`.
