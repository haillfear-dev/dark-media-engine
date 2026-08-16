"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["/", "Visão geral", "◇"], ["/hot-queue", "Hot Queue", "◉"],
  ["/studio", "Studio", "✦"], ["/ideas", "Ideias", "⌁"],
  ["/contents", "Conteúdos", "▣"], ["/calendar", "Calendário", "□"],
  ["/publications", "Publicações", "↗"], ["/integrations", "Integrações", "⌘"],
  ["/brands", "Marcas", "◎"], ["/sources", "Fontes", "⌕"],
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal">{navigation.map(([href, label, icon]) => {
    const active = href === "/" ? pathname === href : pathname.startsWith(href);
    return <Link href={href} key={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
      <span className="navIcon" aria-hidden="true">{icon}</span><span>{label}</span>
    </Link>;
  })}</nav>;
}
