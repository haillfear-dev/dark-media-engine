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
