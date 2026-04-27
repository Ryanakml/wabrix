import { describe, expect, it } from "vitest";
import { assertHasRole, requireOrgContext } from "../convex/rbac";

function createMockCtx({
  identity,
  membership,
}: {
  identity: Record<string, unknown> | null;
  membership?: Record<string, unknown> | null;
}): Parameters<typeof requireOrgContext>[0] {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
    db: {
      query: () => ({
        withIndex: () => ({
          first: async () => membership ?? null,
        }),
      }),
    },
  } as Parameters<typeof requireOrgContext>[0];
}

describe("RBAC helpers", () => {
  it("throws when no identity is present", async () => {
    const ctx = createMockCtx({ identity: null });

    await expect(assertHasRole(ctx, "org:admin")).rejects.toThrow(
      "Unauthorized: Unauthenticated call",
    );
  });

  it("throws when there is no active organization claim", async () => {
    const ctx = createMockCtx({
      identity: {
        subject: "user_123",
      },
    });

    await expect(requireOrgContext(ctx)).rejects.toThrow(
      "Unauthorized: No active organization context",
    );
  });

  it("throws when synced membership is missing", async () => {
    const ctx = createMockCtx({
      identity: {
        subject: "user_123",
        org_id: "org_clerk_123",
      },
      membership: null,
    });

    await expect(requireOrgContext(ctx)).rejects.toThrow(
      "Unauthorized: Membership not found for active organization",
    );
  });

  it("returns the internal org context from synced membership", async () => {
    const ctx = createMockCtx({
      identity: {
        subject: "user_123",
        org_id: "org_clerk_123",
      },
      membership: {
        orgId: "org_doc_123",
        clerkOrgId: "org_clerk_123",
        clerkUserId: "user_123",
        role: "org:member",
        userId: "user_doc_123",
      },
    });

    await expect(requireOrgContext(ctx)).resolves.toEqual({
      organizationId: "org_doc_123",
      clerkOrgId: "org_clerk_123",
      clerkUserId: "user_123",
      role: "org:member",
      userId: "user_doc_123",
    });
  });

  it("allows admin to satisfy stricter role requirements", async () => {
    const ctx = createMockCtx({
      identity: {
        subject: "user_123",
        org_id: "org_clerk_123",
      },
      membership: {
        orgId: "org_doc_123",
        clerkOrgId: "org_clerk_123",
        clerkUserId: "user_123",
        role: "org:admin",
        userId: "user_doc_123",
      },
    });

    await expect(assertHasRole(ctx, "org:manager")).resolves.toEqual({
      organizationId: "org_doc_123",
      clerkOrgId: "org_clerk_123",
      clerkUserId: "user_123",
      role: "org:admin",
      userId: "user_doc_123",
    });
  });

  it("rejects when the synced role is insufficient", async () => {
    const ctx = createMockCtx({
      identity: {
        subject: "user_123",
        org_id: "org_clerk_123",
      },
      membership: {
        orgId: "org_doc_123",
        clerkOrgId: "org_clerk_123",
        clerkUserId: "user_123",
        role: "org:member",
        userId: "user_doc_123",
      },
    });

    await expect(assertHasRole(ctx, "org:admin")).rejects.toThrow(
      "Unauthorized: Requires role org:admin, got org:member",
    );
  });
});
