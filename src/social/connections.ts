import { db, one, Row } from "@/src/db";
import { codeChallenge, decryptSecret, encryptSecret, hashValue, randomCodeVerifier, randomState } from "@/src/security/secrets";
import { ProviderConnection, SocialProvider } from "./provider";
import { TikTokProvider } from "./tiktok-provider";
import { YouTubeProvider } from "./youtube-provider";

export type ProviderId = "TIKTOK" | "YOUTUBE";
export function providerFor(id: ProviderId): SocialProvider { return id === "TIKTOK" ? new TikTokProvider() : new YouTubeProvider(); }

export function integrationState(providerId: ProviderId, brandId = "brand-radar") {
  const provider = providerFor(providerId);
  const connection = one<Row>("SELECT * FROM social_connections WHERE brand_id=? AND provider=?", brandId, providerId);
  return { provider: providerId, configured: provider.configurationStatus() === "CONFIGURED", status: connection ? String(connection.status) : provider.configurationStatus(), displayName: connection?.display_name ? String(connection.display_name) : null, externalAccountId: connection?.external_account_id ? String(connection.external_account_id) : null, errorCode: connection?.error_code ? String(connection.error_code) : null };
}

export function beginOAuth(providerId: ProviderId, brandId: string) {
  const provider = providerFor(providerId), state = randomState(), expires = new Date(Date.now() + 10 * 60_000).toISOString();
  const codeVerifier = providerId === "TIKTOK" ? randomCodeVerifier() : undefined;
  db().prepare("INSERT INTO oauth_states(state_hash,provider,brand_id,code_verifier_encrypted,expires_at) VALUES(?,?,?,?,?)").run(hashValue(state), providerId, brandId, codeVerifier ? encryptSecret(codeVerifier) : null, expires);
  return { state, url: provider.authorizationUrl(state, codeVerifier ? codeChallenge(codeVerifier) : undefined) };
}

export function consumeOAuthState(providerId: ProviderId, state: string) {
  const hash = hashValue(state), row = one<Row>("SELECT * FROM oauth_states WHERE state_hash=? AND provider=?", hash, providerId);
  if (!row || row.consumed_at || Date.parse(String(row.expires_at)) <= Date.now()) throw new Error("INVALID_OAUTH_STATE");
  const result = db().prepare("UPDATE oauth_states SET consumed_at=CURRENT_TIMESTAMP WHERE state_hash=? AND consumed_at IS NULL").run(hash);
  if (Number(result.changes) !== 1) throw new Error("INVALID_OAUTH_STATE");
  return { brandId: String(row.brand_id), codeVerifier: row.code_verifier_encrypted ? decryptSecret(String(row.code_verifier_encrypted)) : undefined };
}

export async function finishOAuth(providerId: ProviderId, brandId: string, code: string, codeVerifier?: string) {
  const provider = providerFor(providerId), tokens = await provider.exchangeCode(code, codeVerifier), identity = await provider.getAccountIdentity(tokens);
  db().prepare(`INSERT INTO social_connections(id,brand_id,provider,status,external_account_id,display_name,username,access_token_encrypted,refresh_token_encrypted,token_expires_at,scopes,error_code,error_detail) VALUES(?,?,?,?,?,?,?,?,?,?,? ,NULL,NULL) ON CONFLICT(brand_id,provider) DO UPDATE SET status='CONNECTED',external_account_id=excluded.external_account_id,display_name=excluded.display_name,username=excluded.username,access_token_encrypted=excluded.access_token_encrypted,refresh_token_encrypted=excluded.refresh_token_encrypted,token_expires_at=excluded.token_expires_at,error_code=NULL,error_detail=NULL,updated_at=CURRENT_TIMESTAMP`).run(`connection-${crypto.randomUUID()}`, brandId, providerId, "CONNECTED", identity.externalAccountId, identity.displayName, identity.username ?? null, encryptSecret(tokens.accessToken), tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null, tokens.expiresAt ?? null, providerId === "TIKTOK" ? "user.info.basic,video.upload" : "youtube.upload,youtube.readonly");
  const platform = providerId === "YOUTUBE" ? "YOUTUBE_SHORTS" : "TIKTOK";
  db().prepare(`INSERT INTO social_accounts(id,brand_id,platform,username,display_name,external_account_id,connection_status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,display_name=excluded.display_name,external_account_id=excluded.external_account_id,connection_status='CONNECTED'`).run(`account-${brandId}-${platform.toLowerCase()}`, brandId, platform, identity.username ?? identity.displayName, identity.displayName, identity.externalAccountId, "CONNECTED");
}

export function loadConnection(providerId: ProviderId, brandId: string): { row: Row; tokens: ProviderConnection } {
  const row = one<Row>("SELECT * FROM social_connections WHERE brand_id=? AND provider=? AND status='CONNECTED'", brandId, providerId);
  if (!row?.access_token_encrypted) throw new Error("AUTH_REQUIRED");
  return { row, tokens: { accessToken: decryptSecret(String(row.access_token_encrypted)), refreshToken: row.refresh_token_encrypted ? decryptSecret(String(row.refresh_token_encrypted)) : undefined, expiresAt: row.token_expires_at ? String(row.token_expires_at) : undefined } };
}

export async function revokeConnection(providerId: ProviderId, brandId: string) {
  const provider = providerFor(providerId), connection = loadConnection(providerId, brandId);
  await provider.revoke(connection.tokens);
  db().prepare("UPDATE social_connections SET status='CONFIGURED',access_token_encrypted=NULL,refresh_token_encrypted=NULL,token_expires_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(connection.row.id);
}
