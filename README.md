# Dark Media Engine — Content Operating System

Vertical slice persistida para operar marcas editoriais do **Topic à Publication**, em modo assistido e com aprovação humana. O seed usa apenas personagens e eventos fictícios.

## Executar

Requer Node.js 22.5+ (o banco usa `node:sqlite`).

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. Para reiniciar os dados: remova `data/content-os.db`, rode migration e seed novamente.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Escopo

Brand Brain, fontes e Source Items manuais, Topics agrupados, Hot Queue filtrável, Ideas, Studio, cinco variantes editáveis, aprovação/rejeição com feedback e agendamento persistem em SQLite. Integrações sociais, coleta automática e IA externa são contratos deliberadamente não implementados. Consulte `docs/`.
