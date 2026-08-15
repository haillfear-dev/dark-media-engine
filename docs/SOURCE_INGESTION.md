# Ingestão editorial automática

## Arquitetura

`Source config → SourceIngestionProvider → normalização → deduplicação → clustering → corroboração → scoring → Hot Queue`.

`npm run ingest` seleciona fontes reais habilitadas cujo `next_poll_at` venceu. `-- --force` ignora apenas o calendário de polling; não contorna bloqueios remotos. Uma falha é isolada por fonte e registrada em `ingestion_runs`.

## Fontes seed editáveis

O seed registra UOL Splash, Metrópoles Celebridades, Hugo Gloss, CNN Brasil Entretenimento, TMZ, Page Six, People, Variety, Quem e O Fuxico. Nomes não participam da lógica: URL, estratégia, país, idioma, prioridade, confiabilidade e intervalo vivem em `sources` e podem ser editados em `/sources`.

Defaults: prioridade 1 a cada 5 minutos, prioridade 2 a cada 10 minutos e complementares a cada 15 minutos.

## Estratégias e rede

- `RSS` / `ATOM`: primeira escolha para feeds estruturados.
- `SITEMAP`: aceita news sitemap com título/data.
- `HTML_LISTING`: fallback configurável; visita links serialmente e extrai JSON-LD `NewsArticle`, canonical e OpenGraph.

O cliente envia User-Agent identificável, timeout, no máximo uma repetição para erro 5xx, `If-None-Match`/`If-Modified-Since`, aceita 304 e aplica backoff exponencial com teto de seis horas. Não usa browser automation nem tenta contornar 401, 403, 429, login, paywall, CAPTCHA ou anti-bot.

## Dados, direitos e deduplicação

O item guarda canonical e normalized URL, título/subtítulo, resumo, até 4.000 caracteres de texto limpo quando permitido, autoria/datas, tags, idioma, JSON-LD, método, hash e provenance. O texto é exclusivamente grounding editorial; não é republicado.

`og_image_url` é metadata editorial protegida e nunca segue automaticamente para Creatomate. O vídeo continua usando o `AssetProvider` (Pexels neste estágio).

No mesmo site, URL normalizada, hash e título normalizado evitam duplicatas. Entre sites, similaridade de manchetes/resumos, entidades e janela de 48 horas agrupam eventos. Frases como “segundo TMZ” registram dependência; republicações da mesma origem não aumentam `independent_source_count`.

## Corroboração e factual status

Cada Topic persiste fontes, contagem independente, corroboração, velocity, freshness, source quality, novelty, confiança, viralidade, momentum, saturação e prioridade. O status é `CONFIRMED`, `DEVELOPING`, `RUMOR`, `CONFLICTING` ou `LOW_CONFIDENCE`. Esse contexto, reliability e dependências seguem para o `AIProvider`.

## Fixtures versus dados reais

Registros Luna Vale/Nico Prado permanecem `FIXTURE` e desabilitados para ingestão. A Hot Queue usa `REAL` quando existe ao menos um Topic real; somente uma instalação ainda sem coleta usa fixtures como demonstração claramente rotulada.

## Troubleshooting

Consulte `/sources` para HTTP/erros, falhas consecutivas, última coleta/sucesso e próxima tentativa. `BLOCKED` exige revisar permissão/estratégia, não automatizar evasão. Feed que mudou pode ser editado ou desativado sem deploy. Para validação controlada use fixtures HTTP dos testes; validação real depende da disponibilidade e política atual de cada domínio.
