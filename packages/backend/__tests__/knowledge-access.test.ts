import { describe, expect, it } from "vitest";
import { requireKnowledgeSourceForOrganization } from "../convex/knowledge";

describe("knowledge source access", () => {
  it("rejects cross-tenant document access", async () => {
    const ctx = {
      db: {
        get: async () => ({
          _id: "source_123",
          organizationId: "org_other",
        }),
      },
    } as never;

    await expect(
      requireKnowledgeSourceForOrganization(ctx, "source_123" as never, "org_self" as never),
    ).rejects.toThrow("Knowledge source not found for the active organization.");
  });
});
