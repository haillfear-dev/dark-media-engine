import { getCreatomateRender } from "@/src/video/creatomate";

export const dynamic = "force-dynamic";

export default async function VideoTest({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const renderId = query.renderId;
  let render: Awaited<ReturnType<typeof getCreatomateRender>> | undefined;
  let statusError: string | undefined;

  if (renderId) {
    try {
      render = await getCreatomateRender(renderId);
    } catch (error) {
      statusError = error instanceof Error ? error.message : "Falha ao consultar render.";
    }
  }

  const configured = Boolean(process.env.CREATOMATE_API_KEY && process.env.CREATOMATE_TEMPLATE_ID);
  const testVideoConfigured = Boolean(process.env.CREATOMATE_TEST_VIDEO_URL);

  return <div className="page">
    <div className="titleRow"><div><div className="eyebrow">VIDEO ENGINE · CREATOMATE</div><h1>Teste de renderização</h1></div><span className="tag">{configured ? "CONFIGURED" : "NOT_CONFIGURED"}</span></div>
    <div className="grid">
      <section className="panel span6">
        <h2>Dark Media → Creatomate → MP4</h2>
        <p>Este teste não publica nada. Ele apenas envia texto e um vídeo de referência para o template configurado no Creatomate.</p>
        {!testVideoConfigured && <div className="notice"><b>Falta CREATOMATE_TEST_VIDEO_URL.</b> Configure uma URL pública de MP4 no .env e reinicie o servidor.</div>}
        {query.error && <div className="notice">{query.error}</div>}
        <form action="/api/video/creatomate/render" method="post" className="formGrid">
          <label className="full">Texto principal<input name="title" defaultValue="Viu Essa? Teste automático do Dark Media" /></label>
          <label className="full">Texto secundário<input name="secondaryText" defaultValue="Primeiro MP4 gerado via API do Creatomate" /></label>
          <button className="full" disabled={!configured || !testVideoConfigured}>GERAR VÍDEO DE TESTE</button>
        </form>
      </section>
      <section className="panel span6">
        <div className="eyebrow">STATUS DO RENDER</div>
        {!renderId && <p className="muted">Nenhum render iniciado ainda.</p>}
        {statusError && <div className="notice">{statusError}</div>}
        {render && <>
          <h2>{render.status.toUpperCase()}</h2>
          <p className="muted">Render ID: {render.id}</p>
          {render.errorMessage && <div className="notice">{render.errorMessage}</div>}
          {render.status !== "succeeded" && render.status !== "failed" && <a className="button" href={`/video-test?renderId=${encodeURIComponent(render.id)}&t=${Date.now()}`}>ATUALIZAR STATUS</a>}
          {render.status === "succeeded" && render.url && <div className="videoAsset"><video controls preload="metadata" src={render.url}/><p><a href={render.url} target="_blank" rel="noreferrer">ABRIR VÍDEO GERADO</a></p></div>}
        </>}
      </section>
    </div>
  </div>;
}
