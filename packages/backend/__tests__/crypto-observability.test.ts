import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  redactSecret,
} from "../convex/lib/crypto";
import { buildObservabilityPayload } from "../convex/lib/observability";

describe("crypto and observability helpers", () => {
  it("encrypts and decrypts provider secrets", async () => {
    process.env.ENCRYPTION_SECRET = "phase-3-test-secret";

    const encrypted = await encryptSecret("secret-value-123");
    const decrypted = await decryptSecret(encrypted);

    expect(encrypted).not.toContain("secret-value-123");
    expect(decrypted).toBe("secret-value-123");
    expect(redactSecret("secret-value-123")).toBe("secr••••23");
  });

  it("redacts long numeric identifiers from observability previews", () => {
    const payload = buildObservabilityPayload({
      organizationId: "org_doc_123",
      provider: "google",
      model: "gemini-2.5-flash",
      promptVersionId: "prompt_123",
      guardrailTriggered: false,
      ragChunkCount: 0,
      promptPreview: "Customer phone 6281234567890 asked for an update",
      responsePreview: "Reply sent to 6281234567890",
    });

    expect(payload.promptPreview).not.toContain("6281234567890");
    expect(payload.responsePreview).not.toContain("6281234567890");
  });
});
