"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "Operação", links: [["/", "Dashboard", "grid"], ["/hot-queue", "Hot Queue", "bolt"], ["/ideas", "Ideias", "spark"], ["/contents", "Conteúdos", "file"], ["/studio", "Studio", "play"]] },
  { label: "Distribuição", links: [["/calendar", "Calendário", "calendar"], ["/publications", "Publicações", "send"], ["/integrations", "Integrações", "link"]] },
  { label: "Configuração", links: [["/brands", "Marcas", "brand"], ["/sources", "Fontes", "source"]] },
] as const;

export function Sidebar({ provider, available }: { provider: string; available: boolean }) {
  const pathname = usePathname();
  return <aside>
    <div className="brandLockup"><div className="brandOrb">D</div><div><strong>DARK ENGINE</strong><small>COSMIC PURPLE</small></div></div>
    <nav>{groups.map(group => <div key={group.label}><div className="navGroupLabel">{group.label}</div>{group.links.map(([href,label,icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon name={icon}/><span>{label}</span></Link>)}</div>)}</nav>
    <div className="sideFoot"><i className={available ? "online" : "offline"}/><div>{provider}<small>{available ? "Motor de IA disponível" : "Fluxo manual ativo"}</small></div></div>
  </aside>;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>, bolt:<path d="m13 2-9 12h7l-1 8 9-12h-7z"/>, spark:<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/>, file:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>, play:<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></>, calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 2v6M16 2v6M3 10h18"/></>, send:<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>, link:<><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></>, brand:<><path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m8 10 4-2 4 2v5l-4 2-4-2z"/></>, source:<><circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
