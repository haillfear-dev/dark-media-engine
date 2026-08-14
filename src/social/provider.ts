export const SUPPORTED_PLATFORMS = ["TIKTOK", "INSTAGRAM", "YOUTUBE_SHORTS", "FACEBOOK", "KWAI"] as const;
export type Platform = typeof SUPPORTED_PLATFORMS[number];
export type IntegrationStatus = "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" | "TOKEN_EXPIRED" | "ERROR";
export type PublicationStatus = "READY" | "QUEUED" | "UPLOADING" | "PROCESSING" | "PUBLISHED" | "SENT_FOR_REVIEW" | "FAILED";
export type ProviderErrorCode = "TOKEN_EXPIRED" | "INVALID_VIDEO" | "PROVIDER_REJECTED" | "NETWORK_ERROR" | "QUOTA_EXCEEDED" | "AUTH_REQUIRED" | "NOT_CONFIGURED";

export class SocialProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly technicalDetail?: string;
  constructor(code: ProviderErrorCode, message: string, technicalDetail?: string) { super(message); this.name = "SocialProviderError"; this.code = code; this.technicalDetail = technicalDetail; }
}

export type ProviderConnection = { accessToken: string; refreshToken?: string; expiresAt?: string };
export type UploadInput = { bytes: Buffer; mimeType: "video/mp4"; title: string; description: string };
export type UploadResult = { externalPostId: string; status: "PROCESSING" | "PUBLISHED" | "SENT_FOR_REVIEW"; metadata?: Record<string, unknown> };

export interface SocialProvider {
  readonly id: "TIKTOK" | "YOUTUBE";
  configurationStatus(): IntegrationStatus;
  authorizationUrl(state: string): URL;
  exchangeCode(code: string): Promise<ProviderConnection>;
  getAccountIdentity(connection: ProviderConnection): Promise<{ externalAccountId: string; displayName: string; username?: string }>;
  refresh(connection: ProviderConnection): Promise<ProviderConnection>;
  revoke(connection: ProviderConnection): Promise<void>;
  upload(connection: ProviderConnection, input: UploadInput): Promise<UploadResult>;
}

export function providerConfigurationStatus(provider: "TIKTOK" | "YOUTUBE", env: NodeJS.ProcessEnv = process.env): IntegrationStatus {
  const required = provider === "TIKTOK" ? ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"] : ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];
  return [...required, "TOKEN_ENCRYPTION_KEY"].every((key) => Boolean(env[key])) ? "CONFIGURED" : "NOT_CONFIGURED";
}
