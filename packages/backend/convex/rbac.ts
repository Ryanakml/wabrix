import { QueryCtx } from "./_generated/server.js";

/**
 * Validates whether the currently authenticated user possesses a specific role 
 * for their currently active organization, derived via Clerk JWT claims.
 */
export async function assertHasRole(ctx: QueryCtx, requiredRole: string) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized: Unauthenticated call");
  }

  // Next.js Clerk integration normally passes the active Organization in JWT
  // But strictly, we check custom claims or the 'org_role' if provided by a template.
  
  // NOTE: This assumes the Clerk JWT Template includes standard org_id and org_role, 
  // or that we verify via our synced tables. Since webhooks were skipped, 
  // we assume JWT passing.
  
  const orgRole = (identity as any).org_role;
  const orgId = (identity as any).org_id;

  if (!orgId) {
    throw new Error("Unauthorized: No active organization context");
  }

  if (orgRole !== requiredRole && orgRole !== "org:admin") {
    throw new Error(`Unauthorized: Requires role ${requiredRole}, got ${orgRole || 'none'}`);
  }

  return { orgId, orgRole, clerkUserId: identity.subject };
}

/**
 * Retrieves the current organization context, throwing if none.
 */
export async function requireOrgContext(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const orgId = (identity as any).org_id;
  if (!orgId) {
    throw new Error("Unauthorized: No active organization context");
  }

  return { orgId, clerkUserId: identity.subject };
}
