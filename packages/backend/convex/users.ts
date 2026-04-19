import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { internalMutation, type MutationCtx } from "./_generated/server.js";

async function writeAuditLog(
  ctx: MutationCtx,
  {
    orgId,
    clerkOrgId,
    userId,
    clerkUserId,
    action,
    details,
  }: {
    orgId?: Id<"organizations">;
    clerkOrgId?: string;
    userId?: Id<"users">;
    clerkUserId?: string;
    action: string;
    details: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditLogs", {
    orgId,
    clerkOrgId,
    userId,
    clerkUserId,
    action,
    details,
    createdAt: Date.now(),
  });
}

export const syncUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!existing) {
      return;
    }

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", existing._id))
      .collect();

    for (const membership of memberships) {
      await writeAuditLog(ctx, {
        orgId: membership.orgId,
        clerkOrgId: membership.clerkOrgId,
        userId: existing._id,
        clerkUserId: args.clerkId,
        action: "org_membership_removed",
        details: {
          source: "clerk_webhook",
          reason: "user_deleted",
          role: membership.role,
        },
      });
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(existing._id);
  },
});

export const syncOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      await writeAuditLog(ctx, {
        orgId: existing._id,
        clerkOrgId: args.clerkOrgId,
        action: "org_updated",
        details: { source: "clerk_webhook" },
      });
      return existing._id;
    }

    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      orgId,
      clerkOrgId: args.clerkOrgId,
      action: "org_created",
      details: { source: "clerk_webhook" },
    });

    return orgId;
  },
});

export const deleteOrganization = internalMutation({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!existing) {
      return;
    }

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", existing._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await writeAuditLog(ctx, {
      orgId: existing._id,
      clerkOrgId: args.clerkOrgId,
      action: "org_deleted",
      details: { source: "clerk_webhook" },
    });

    await ctx.db.delete(existing._id);
  },
});

export const syncOrgMembership = internalMutation({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingMembership = await ctx.db
      .query("orgMembers")
      .withIndex("by_clerk_user_and_org", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("clerkOrgId", args.clerkOrgId),
      )
      .first();

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (!user || !org) {
      throw new Error("Webhook processing error: user or organization not synced yet");
    }

    if (existingMembership) {
      if (existingMembership.role !== args.role) {
        await ctx.db.patch(existingMembership._id, {
          role: args.role,
          updatedAt: now,
        });
        await writeAuditLog(ctx, {
          orgId: org._id,
          clerkOrgId: args.clerkOrgId,
          userId: user._id,
          clerkUserId: args.clerkUserId,
          action: "org_membership_role_updated",
          details: {
            source: "clerk_webhook",
            previousRole: existingMembership.role,
            nextRole: args.role,
          },
        });
      }
      return existingMembership._id;
    }

    const membershipId = await ctx.db.insert("orgMembers", {
      userId: user._id,
      clerkUserId: args.clerkUserId,
      orgId: org._id,
      clerkOrgId: args.clerkOrgId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      orgId: org._id,
      clerkOrgId: args.clerkOrgId,
      userId: user._id,
      clerkUserId: args.clerkUserId,
      action: "org_membership_created",
      details: {
        source: "clerk_webhook",
        role: args.role,
      },
    });

    return membershipId;
  },
});

export const removeOrgMembership = internalMutation({
  args: { clerkUserId: v.string(), clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_clerk_user_and_org", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("clerkOrgId", args.clerkOrgId),
      )
      .first();

    if (!existing) {
      return;
    }

    await writeAuditLog(ctx, {
      orgId: existing.orgId,
      clerkOrgId: existing.clerkOrgId,
      userId: existing.userId,
      clerkUserId: existing.clerkUserId,
      action: "org_membership_removed",
      details: {
        source: "clerk_webhook",
        role: existing.role,
      },
    });

    await ctx.db.delete(existing._id);
  },
});
