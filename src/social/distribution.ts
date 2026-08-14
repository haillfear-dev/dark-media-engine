import { createHash } from "node:crypto";
import { getAssetStorage } from "@/src/assets/storage";
import { db, one, Row } from "@/src/db";
import { loadConnection, ProviderId, providerFor } from "./connections";
import { SocialProviderError } from "./provider";

export function distributionKey(variantId: string, assetId: string, provider: ProviderId) { return createHash("sha256").update(`${provider}:${variantId}:${assetId}`).digest("hex"); }
export async function distribute(input: { brandId: string; variantId: string; assetId: string; providerId: ProviderId }) {
  const idempotencyKey = distributionKey(input.variantId, input.assetId, input.providerId);
  const existing = one<Row>("SELECT * FROM publications WHERE idempotency_key=?", idempotencyKey);
  if (existing) return { publicationId: String(existing.id), status: String(existing.status), duplicate: true };
  const variant = one<Row>("SELECT * FROM content_variants WHERE id=?", input.variantId), asset = one<Row>("SELECT * FROM assets WHERE id=? AND content_variant_id=? AND status='READY'", input.assetId, input.variantId);
  if (!variant || !asset) throw new SocialProviderError("INVALID_VIDEO", "Variante e vídeo aprovado são obrigatórios.");
  const expectedPlatform = input.providerId === "YOUTUBE" ? "YOUTUBE_SHORTS" : "TIKTOK";
  if (variant.platform !== expectedPlatform) throw new SocialProviderError("INVALID_VIDEO", "A variante não corresponde ao canal selecionado.");
  const publicationId = `publication-${crypto.randomUUID()}`;
  try { db().prepare(`INSERT INTO publications(id,content_variant_id,asset_id,provider,status,idempotency_key,provider_status) VALUES(?,?,?,?,?,?,?)`).run(publicationId, input.variantId, input.assetId, input.providerId, "UPLOADING", idempotencyKey, "UPLOADING"); }
  catch { const duplicate = one<Row>("SELECT * FROM publications WHERE idempotency_key=?", idempotencyKey); if (duplicate) return { publicationId: String(duplicate.id), status: String(duplicate.status), duplicate: true }; throw new Error("PUBLICATION_CREATE_FAILED"); }
  try {
    const { tokens, row } = loadConnection(input.providerId, input.brandId), provider = providerFor(input.providerId);
    const bytes = await getAssetStorage().read(String(asset.storage_location));
    const result = await provider.upload(tokens, { bytes, mimeType: "video/mp4", title: String(variant.title), description: String(variant.description || variant.caption) });
    const publishedAt = result.status === "PUBLISHED" ? new Date().toISOString() : null;
    db().prepare("UPDATE publications SET social_account_id=(SELECT id FROM social_accounts WHERE brand_id=? AND platform=? LIMIT 1),status=?,provider_status=?,external_post_id=?,published_at=?,metadata=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.brandId, expectedPlatform, result.status, result.status, result.externalPostId, publishedAt, JSON.stringify(result.metadata ?? {}), publicationId);
    return { publicationId, status: result.status, duplicate: false };
  } catch (error) {
    const code = error instanceof SocialProviderError ? error.code : error instanceof Error && error.message === "AUTH_REQUIRED" ? "AUTH_REQUIRED" : "NETWORK_ERROR";
    const operatorMessage = error instanceof SocialProviderError ? error.message : "Não foi possível concluir o envio.";
    const technical = error instanceof SocialProviderError ? error.technicalDetail : error instanceof Error ? error.message : "Unknown failure";
    db().prepare("UPDATE publications SET status='FAILED',provider_status='FAILED',error=?,metadata=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(code, JSON.stringify({ operatorMessage, technicalDetail: technical }), publicationId);
    if (code === "TOKEN_EXPIRED") db().prepare("UPDATE social_connections SET status='TOKEN_EXPIRED',error_code=?,updated_at=CURRENT_TIMESTAMP WHERE brand_id=? AND provider=?").run(code, input.brandId, input.providerId);
    return { publicationId, status: "FAILED", duplicate: false, errorCode: code, operatorMessage };
  }
}
