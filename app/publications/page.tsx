import { all, Row } from "@/src/db";
export const dynamic = "force-dynamic";

export default function Publications() {
  const rows = all<Row>("SELECT p.*,v.platform,v.title FROM publications p JOIN content_variants v ON v.id=p.content_variant_id ORDER BY p.created_at DESC");
  return <div className="page"><div className="eyebrow">DELIVERY</div><h1>Publicações</h1><div className="notice">Envios externos só ocorrem com conta conectada e MP4 válido. `SENT_FOR_REVIEW` no TikTok não significa publicado; falhas nunca são convertidas em sucesso.</div><section className="panel"><table><thead><tr><th>Variante</th><th>Provider</th><th>Agendada</th><th>Status</th><th>ID externo</th><th>Erro</th></tr></thead><tbody>{rows.map(row=><tr key={String(row.id)}><td><b>{row.title}</b><small className="muted" style={{display:"block"}}>{row.platform} · Asset {row.asset_id ?? "—"}</small></td><td>{row.provider ?? "AGENDAMENTO"}</td><td>{row.scheduled_for ? new Date(String(row.scheduled_for)).toLocaleString("pt-BR") : "—"}</td><td>{row.provider_status ?? row.status}</td><td>{row.external_post_id ?? "—"}</td><td>{row.error ?? "—"}</td></tr>)}</tbody></table></section></div>;
}
