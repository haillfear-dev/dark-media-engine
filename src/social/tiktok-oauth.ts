const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";

export type TikTokOAuthConfiguration = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
};

export function tiktokAuthorizationUrl(configuration: TikTokOAuthConfiguration, state: string, challenge: string) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({ client_key: configuration.clientKey, response_type: "code", scope: "user.info.basic,video.upload", redirect_uri: configuration.redirectUri, state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  return url;
}

export function tiktokTokenBody(configuration: TikTokOAuthConfiguration, code: string, codeVerifier: string) {
  return new URLSearchParams({ client_key: configuration.clientKey, client_secret: configuration.clientSecret, code, grant_type: "authorization_code", redirect_uri: configuration.redirectUri, code_verifier: codeVerifier });
}

export function tiktokOAuthErrorDiagnostic(detail?: string, sensitiveValues: string[] = []) {
  if (!detail) return undefined;
  try {
    const payload = JSON.parse(detail) as Record<string, unknown>;
    const redact = (value: string) => sensitiveValues.filter(Boolean).reduce((result, secret) => result.replaceAll(secret, "[REDACTED]"), value);
    const error = typeof payload.error === "string" ? redact(payload.error) : undefined;
    const description = typeof payload.error_description === "string" ? redact(payload.error_description) : undefined;
    return error || description ? { error, error_description: description } : undefined;
  } catch {
    return undefined;
  }
}
