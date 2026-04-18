import { internalMutation } from "./_generated/server.js";
import { v } from "convex/values";

// Sync a user profile from Clerk webhook
export const syncUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
      });
    } else {
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
      });
    }
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
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
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
      await ctx.db.insert("auditLogs", {
        orgId: existing._id,
        clerkOrgId: args.clerkOrgId,
        action: "org_updated",
        details: "Organization updated via Webhook",
      });
    } else {
      const orgId = await ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
      await ctx.db.insert("auditLogs", {
        orgId,
        clerkOrgId: args.clerkOrgId,
        action: "org_created",
        details: "Organization created via Webhook",
      });
    }
  },
});

export const deleteOrganization = internalMutation({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
    if (existing) {
      await ctx.db.insert("auditLogs", {
        orgId: existing._id,
        clerkOrgId: args.clerkOrgId,
        action: "org_deleted",
        details: "Organization deleted via Webhook",
      });
      await ctx.db.delete(existing._id);
    }
  },
});

export const syncOrgMembership = internalMutation({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existingRole = await ctx.db
      .query("orgMembers")
      .withIndex("by_clerk_user_and_org", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("clerkOrgId", args.clerkOrgId)
      )
      .first();

    if (existingRole) {
      await ctx.db.patch(existingRole._id, {
        role: args.role,
      });
    } else {
      // Find internal ids
      const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkUserId)).first();
      const org = await ctx.db.query("organizations").withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", args.clerkOrgId)).first();
      
      if (user && org) {
        await ctx.db.insert("orgMembers", {
          userId: user._id,
          clerkUserId: args.clerkUserId,
          orgId: org._id,
          clerkOrgId: args.clerkOrgId,
          role: args.role,
        });
      }
    }
  },
});

export const removeOrgMembership = internalMutation({
  args: { clerkUserId: v.string(), clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_clerk_user_and_org", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("clerkOrgId", args.clerkOrgId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
