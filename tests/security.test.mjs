import test from "node:test";
import assert from "node:assert/strict";
import { decryptSecret, encryptSecret, hashValue, randomState, safeEqual } from "../src/security/secrets.ts";
import { validateMp4Header } from "../src/assets/storage.ts";

test("OAuth state is random, hashable and timing-safe comparable", () => { const first = randomState(), second = randomState(); assert.notEqual(first, second); assert.equal(hashValue(first).length, 64); assert.equal(safeEqual(first, first), true); assert.equal(safeEqual(first, second), false); });
test("backend tokens are encrypted at rest", () => { process.env.TOKEN_ENCRYPTION_KEY = "test-only-key"; const encrypted = encryptSecret("access-token"); assert.doesNotMatch(encrypted, /access-token/); assert.equal(decryptSecret(encrypted), "access-token"); });
test("MP4 validation checks the file signature instead of extension only", () => { assert.equal(validateMp4Header(Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109])), true); assert.equal(validateMp4Header(new TextEncoder().encode("not-an-mp4-file")), false); });
