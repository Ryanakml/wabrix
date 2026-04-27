import { describe, expect, it } from "vitest";
import { decryptSecret } from "../convex/lib/crypto";
import {
  buildWhatsAppIntegrationWritePayload,
  deriveWhatsAppConnectionStatus,
  requireWhatsAppIntegrationForOrganization,
  sanitizeWhatsAppIntegrationForFrontend,
} from "../convex/whatsapp";

describe("whatsapp integration helpers", () => {
  it("encrypts secrets, hashes the verify token, and derives a configured status", async () => {
    process.env.ENCRYPTION_SECRET = "phase-5-test-secret";

    const payload = await buildWhatsAppIntegrationWritePayload({
      phoneNumberId: " 123456789 ",
      businessAccountId: " 987654321 ",
      accessToken: "meta-access-token",
      appSecret: "meta-app-secret",
      verifyToken: "meta-verify-token",
      enabled: true,
    });

    expect(payload.phoneNumberId).toBe("123456789");
    expect(payload.businessAccountId).toBe("987654321");
    expect(payload.connectionStatus).toBe("configured");
    expect(payload.accessTokenEncrypted).not.toContain("meta-access-token");
    expect(payload.appSecretEncrypted).not.toContain("meta-app-secret");
    expect(payload.verifyTokenHash).not.toBe("meta-verify-token");
    await expect(decryptSecret(payload.accessTokenEncrypted)).resolves.toBe(
      "meta-access-token",
    );
    await expect(decryptSecret(payload.appSecretEncrypted)).resolves.toBe(
      "meta-app-secret",
    );
  });

  it("redacts secret fields in the frontend state shape", () => {
    const sanitized = sanitizeWhatsAppIntegrationForFrontend({
      _id: "integration_123",
      _creationTime: Date.now(),
      organizationId: "org_123",
      botId: "bot_123",
      phoneNumberId: "123456789",
      businessAccountId: "987654321",
      accessTokenEncrypted: "encrypted-access-token",
      appSecretEncrypted: "encrypted-app-secret",
      verifyTokenHash: "hashed-verify-token",
      enabled: true,
      connectionStatus: "configured",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as never);

    expect(sanitized).toEqual(
      expect.objectContaining({
        integrationId: "integration_123",
        phoneNumberId: "123456789",
        businessAccountId: "987654321",
        enabled: true,
        connectionStatus: "configured",
        hasAccessToken: true,
        hasAppSecret: true,
        hasVerifyToken: true,
        approvalStatus: "pending",
        phoneVerificationStatus: "missing",
        businessProfileStatus: "pending",
      }),
    );
    expect("accessTokenEncrypted" in sanitized).toBe(false);
    expect("appSecretEncrypted" in sanitized).toBe(false);
    expect("verifyTokenHash" in sanitized).toBe(false);
  });

  it("rejects cross-tenant integration access", async () => {
    const ctx = {
      db: {
        get: async () => ({
          _id: "integration_123",
          organizationId: "org_other",
        }),
      },
    } as never;

    await expect(
      requireWhatsAppIntegrationForOrganization(
        ctx,
        "integration_123" as never,
        "org_self" as never,
      ),
    ).rejects.toThrow("WhatsApp integration not found for the active organization.");
  });

  it("derives the expected connection status values", () => {
    expect(
      deriveWhatsAppConnectionStatus({
        enabled: false,
        phoneNumberId: "123",
        businessAccountId: "456",
        hasAccessToken: true,
        hasAppSecret: true,
        hasVerifyToken: true,
      }),
    ).toBe("disabled");

    expect(
      deriveWhatsAppConnectionStatus({
        enabled: true,
        phoneNumberId: "123",
        businessAccountId: "",
        hasAccessToken: true,
        hasAppSecret: true,
        hasVerifyToken: true,
      }),
    ).toBe("not_connected");
  });
});
