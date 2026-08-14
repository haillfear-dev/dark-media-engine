import test from "node:test";
import assert from "node:assert/strict";
import { providerConfigurationStatus, SocialProviderError } from "../src/social/provider.ts";

test("providers remain NOT_CONFIGURED without every backend credential", () => { assert.equal(providerConfigurationStatus("TIKTOK", {}), "NOT_CONFIGURED"); assert.equal(providerConfigurationStatus("YOUTUBE", { GOOGLE_CLIENT_ID: "id" }), "NOT_CONFIGURED"); });
test("provider configuration never requires or stores a social password", () => { const env = { TIKTOK_CLIENT_KEY: "key", TIKTOK_CLIENT_SECRET: "secret", TIKTOK_REDIRECT_URI: "http://localhost/callback", TOKEN_ENCRYPTION_KEY: "encryption" }; assert.equal(providerConfigurationStatus("TIKTOK", env), "CONFIGURED"); assert.equal("TIKTOK_PASSWORD" in env, false); });
test("provider errors expose safe operator codes", () => { const error = new SocialProviderError("QUOTA_EXCEEDED", "Limite atingido.", "technical-provider-payload"); assert.equal(error.code, "QUOTA_EXCEEDED"); assert.equal(error.message, "Limite atingido."); });
