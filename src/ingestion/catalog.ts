import { db } from "../db.ts";

export const INITIAL_REAL_SOURCES = [
  ["source-uol-splash","UOL Splash","https://www.uol.com.br/splash/","https://rss.uol.com.br/feed/entretenimento.xml","BR",95,82,5],
  ["source-metropoles-celebridades","Metrópoles Celebridades","https://www.metropoles.com/celebridades","https://www.metropoles.com/entretenimento/feed","BR",92,78,5],
  ["source-hugo-gloss","Hugo Gloss","https://hugogloss.uol.com.br/","https://hugogloss.uol.com.br/feed/","BR",90,72,5],
  ["source-cnn-entretenimento","CNN Brasil Entretenimento","https://www.cnnbrasil.com.br/entretenimento/","https://www.cnnbrasil.com.br/entretenimento/feed/","BR",88,88,5],
  ["source-tmz","TMZ","https://www.tmz.com/","https://www.tmz.com/rss.xml","US",78,70,10],
  ["source-page-six","Page Six","https://pagesix.com/","https://pagesix.com/feed/","US",76,68,10],
  ["source-people","People","https://people.com/","https://people.com/feed/","US",75,84,10],
  ["source-variety","Variety","https://variety.com/","https://variety.com/feed/","US",74,88,10],
  ["source-quem","Quem","https://revistaquem.globo.com/","https://revistaquem.globo.com/rss/ultimas/noticia/feed.xml","BR",65,76,15],
  ["source-ofuxico","O Fuxico","https://www.ofuxico.com.br/","https://www.ofuxico.com.br/feed/","BR",62,66,15],
] as const;

export function ensureInitialSources(brandId="brand-radar") {
  const statement=db().prepare(`INSERT INTO sources(id,brand_id,name,type,url,enabled,priority,reliability,category,base_url,source_type,language,country,ingestion_strategy,polling_interval_minutes,data_classification,metadata)
    VALUES(?,?,?,'RSS',?,1,?,?,'ENTRETENIMENTO',?,'EDITORIAL',?,?,'RSS',?,'REAL','{}') ON CONFLICT(id) DO NOTHING`);
  for(const [id,name,baseUrl,url,country,priority,reliability,interval] of INITIAL_REAL_SOURCES) statement.run(id,brandId,name,url,priority,reliability,baseUrl,country==="US"?"en-US":"pt-BR",country,interval);
}
