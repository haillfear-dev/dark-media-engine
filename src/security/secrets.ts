import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function key() {
  const configured = process.env.TOKEN_ENCRYPTION_KEY;
  if (!configured) throw new Error("TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
  return createHash("sha256").update(configured).digest();
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptSecret(payload: string) {
  const [version, iv, tag, encrypted] = payload.split("."); if (version !== "v1" || !encrypted) throw new Error("INVALID_ENCRYPTED_SECRET");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
export const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
export function safeEqual(left: string, right: string) { const a = Buffer.from(left), b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
export const randomState = () => randomBytes(32).toString("base64url");
