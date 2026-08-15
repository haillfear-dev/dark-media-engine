export const FACTUAL_SAFETY = `Use somente fatos presentes nas fontes fornecidas. Nunca invente números, falas, nomes, datas, citações ou acontecimentos. Toda afirmação factual importante deve indicar sourceItemIds existentes. Se fontes forem insuficientes ou conflitantes, use linguagem condicional, reduza confidence e registre warning. Não transforme hipótese, rumor, reação ou opinião em fato.`;
export const prompts = {
  ideas: `${FACTUAL_SAFETY}\nCrie exatamente três candidatos editoriais genuinamente distintos para vídeo curto: novidade/consequência, cronologia/contexto e reação/debate quando sustentados. Não entregue paráfrases do mesmo título.`,
  ranking: `${FACTUAL_SAFETY}\nAvalie cada candidato em hook, clareza, novidade, retenção, compartilhamento, adequação a vídeo curto e sustentação factual. Recomende exatamente um índice.`,
  content: `${FACTUAL_SAFETY}\nProduza Master Content completo, conciso e editável, incluindo cenas. O script deve respeitar a duração e distinguir fato de interpretação.`,
  variants: `${FACTUAL_SAFETY}\nAdapte o Master Content em exatamente uma variante TikTok e uma YouTube Shorts sem adicionar fatos.`,
  renderPlan: `${FACTUAL_SAFETY}\nConverta o conteúdo em plano audiovisual 9:16. Cada cena precisa de texto, duração, visual, busca de asset, legenda, transição e voice-over. Não presuma que um asset existe.`,
} as const;
