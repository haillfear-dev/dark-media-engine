# Arquitetura

## Forma

Monólito modular em Next.js/TypeScript, adequado à primeira vertical. Server Actions coordenam casos de uso; acesso SQL fica no backend; SQLite relacional oferece execução local simples. `migrations/` é a fonte versionada do schema e `scripts/seed.mjs` cria a operação fictícia.

## Domínios

- `brands`: identidade e Brand Brain configurável.
- `sources`: origem, itens, provenance e futura coleta.
- `topics`: cluster editorial; relação N:N evita confundir cinco itens com cinco pautas.
- `editorial`: scores puros e pesos centralizados.
- `ideas` e `content`: separação explícita entre fato, ângulo, peça master, hooks e variantes.
- `publications`, `social`, `assets`, `analytics`: delivery e aprendizado, sem simular providers.
- `ai`: porta `AIProvider`; ausência de credencial degrada para modo manual.
- `jobs`: contratos do pipeline futuro, sem infraestrutura distribuída prematura.

## Dados e limites

Entidades editoriais têm colunas relacionais, FKs, checks e índices. JSON/texto extensível é reservado a metadata de providers. Arquivos grandes ficam fora do banco e `Asset.storage_location` mantém a referência. Credenciais pertencem exclusivamente ao backend.
