import { createCreatomateRender } from "@/src/video/creatomate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const title = String(form.get("title") ?? "Teste Dark Media").trim();
  const secondaryText = String(form.get("secondaryText") ?? "Render automático via Creatomate").trim();
  const videoUrl = process.env.CREATOMATE_TEST_VIDEO_URL ?? "";

  try {
    const render = await createCreatomateRender({ title, secondaryText, videoUrl });
    const url = new URL("/video-test", request.url);
    url.searchParams.set("renderId", render.id);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL("/video-test", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "Falha ao criar render no Creatomate.");
    return NextResponse.redirect(url, 303);
  }
}
