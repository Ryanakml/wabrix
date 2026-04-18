import { describe, it, expect } from "vitest";
import { assertHasRole, requireOrgContext } from "../convex/rbac";

describe("RBAC Helpers", () => {
  it("throws Unauthenticated if no identity is present", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => null,
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    await expect(assertHasRole(mockCtx, "org:admin")).rejects.toThrow("Unauthorized: Unauthenticated call");
  });

  it("throws No active organization context if org_id is missing", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user_123",
          // missing org_id
        }),
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    await expect(assertHasRole(mockCtx, "org:admin")).rejects.toThrow("Unauthorized: No active organization context");
    await expect(requireOrgContext(mockCtx)).rejects.toThrow("Unauthorized: No active organization context");
  });

  it("throws if orgRole does not match", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user_123",
          org_id: "org_123",
          org_role: "org:member",
        }),
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    await expect(assertHasRole(mockCtx, "org:sys_profile:manage")).rejects.toThrow("Unauthorized: Requires role org:sys_profile:manage, got org:member");
  });

  it("passes if orgRole matches exactly", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user_123",
          org_id: "org_123",
          org_role: "org:member",
        }),
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    const res = await assertHasRole(mockCtx, "org:member");
    expect(res).toEqual({ orgId: "org_123", orgRole: "org:member", clerkUserId: "user_123" });
  });

  it("passes for org:admin even if a different role was required", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user_123",
          org_id: "org_123",
          org_role: "org:admin",
        }),
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    const res = await assertHasRole(mockCtx, "org:editor");
    expect(res).toEqual({ orgId: "org_123", orgRole: "org:admin", clerkUserId: "user_123" });
  });

  it("requireOrgContext returns orgId and clerkUserId without role check", async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user_123",
          org_id: "org_123",
          org_role: "org:member",
        }),
      },
    } as unknown as import("../convex/_generated/server.js").QueryCtx;

    const res = await requireOrgContext(mockCtx);
    expect(res).toEqual({ orgId: "org_123", clerkUserId: "user_123" });
  });
});
