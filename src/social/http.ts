import { SocialProviderError } from "./provider";

export async function providerFetch(url: string | URL, init: RequestInit, provider: string) {
  let response: Response;
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }); }
  catch (error) { throw new SocialProviderError("NETWORK_ERROR", `${provider} indisponível no momento.`, error instanceof Error ? error.message : "Network failure"); }
  if (response.ok) return response;
  const detail = (await response.text()).slice(0, 2000);
  if (response.status === 401) throw new SocialProviderError("TOKEN_EXPIRED", `Reconecte sua conta ${provider}.`, detail);
  if (response.status === 429) throw new SocialProviderError("QUOTA_EXCEEDED", `Limite do ${provider} atingido.`, detail);
  throw new SocialProviderError("PROVIDER_REJECTED", `${provider} recusou a operação.`, detail);
}
