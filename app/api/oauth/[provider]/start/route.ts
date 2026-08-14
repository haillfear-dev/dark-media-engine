import { beginOAuth, ProviderId } from "@/src/social/connections";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = (await params).provider.toUpperCase() as ProviderId;
  if (!(["TIKTOK", "YOUTUBE"] as string[]).includes(provider)) return new Response("Provider inválido", { status: 404 });
  try { const { state, url } = beginOAuth(provider, "brand-radar"); const response = NextResponse.redirect(url); response.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/api/oauth" }); return response; }
  catch { return NextResponse.redirect(new URL(`/integrations?error=${provider}_NOT_CONFIGURED`, request.url)); }
}
