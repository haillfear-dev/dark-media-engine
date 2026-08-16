import "./styles.css";
import { getAIProvider } from "@/src/ai/provider";
import { Sidebar } from "@/app/components/Sidebar";

export const metadata = { title: "Dark Media Engine", description: "Content Operating System com inteligência artificial" };

export default function Layout({children}:{children:React.ReactNode}) {
  const ai=getAIProvider();
  return <html lang="pt-BR"><body><Sidebar provider={ai.name} available={ai.available}/><main><header><div><b>RADAR POP</b><small>Workspace / operação editorial</small></div><div className="mode">● ASSISTED MODE</div></header>{children}</main></body></html>;
}
