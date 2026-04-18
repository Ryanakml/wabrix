import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_clerk_org_id", ["clerkOrgId"]),

  orgMembers: defineTable({
    userId: v.id("users"),
    clerkUserId: v.string(),
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    role: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_clerk_user_and_org", ["clerkUserId", "clerkOrgId"]),

  auditLogs: defineTable({
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    userId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string()),
    action: v.string(),
    details: v.any(),
  }).index("by_org", ["orgId"]),
});
