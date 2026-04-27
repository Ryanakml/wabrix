import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";

type AuthDbContext = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

export type OrgAccessContext = {
  organizationId: Id<"organizations">;
  clerkOrgId: string;
  clerkUserId: string;
  role: string;
  userId: Id<"users">;
};

async function getMembershipContext(ctx: AuthDbContext): Promise<OrgAccessContext> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized: Unauthenticated call");
  }

  const clerkOrgId = (identity as Record<string, unknown>).org_id;

  if (typeof clerkOrgId !== "string" || clerkOrgId.length === 0) {
    throw new Error("Unauthorized: No active organization context");
  }

  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_clerk_user_and_org", (q) =>
      q.eq("clerkUserId", identity.subject).eq("clerkOrgId", clerkOrgId),
    )
    .first();

  if (!membership) {
    throw new Error("Unauthorized: Membership not found for active organization");
  }

  return {
    organizationId: membership.orgId,
    clerkOrgId: membership.clerkOrgId,
    clerkUserId: membership.clerkUserId,
    role: membership.role,
    userId: membership.userId,
  };
}

export async function assertHasRole(
  ctx: AuthDbContext,
  requiredRole: string,
): Promise<OrgAccessContext> {
  const access = await getMembershipContext(ctx);

  if (access.role !== requiredRole && access.role !== "org:admin") {
    throw new Error(
      `Unauthorized: Requires role ${requiredRole}, got ${access.role || "none"}`,
    );
  }

  return access;
}

export async function requireOrgContext(
  ctx: AuthDbContext,
): Promise<OrgAccessContext> {
  return getMembershipContext(ctx);
}
