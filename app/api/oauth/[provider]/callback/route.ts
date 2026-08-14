import { consumeOAuthState, finishOAuth, ProviderId } from "@/src/social/connections";
import { safeEqual } from "@/src/security/secrets";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const provider = (await params).provider.toUpperCase() as ProviderId, code = request.nextUrl.searchParams.get("code"), state = request.nextUrl.searchParams.get("state"), cookieState = request.cookies.get("oauth_state")?.value;
  if (!(["TIKTOK", "YOUTUBE"] as string[]).includes(provider)) return new Response("Provider inválido", { status: 404 });
  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) return NextResponse.redirect(new URL("/integrations?error=INVALID_OAUTH_STATE", request.url));
  try { const { brandId, codeVerifier } = consumeOAuthState(provider, state); await finishOAuth(provider, brandId, code, codeVerifier); const response = NextResponse.redirect(new URL(`/integrations?connected=${provider}`, request.url)); response.cookies.set("oauth_state", "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/api/oauth" }); return response; }
  catch { return NextResponse.redirect(new URL(`/integrations?error=${provider}_OAUTH_FAILED`, request.url)); }
}
