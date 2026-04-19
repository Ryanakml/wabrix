import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_org_id", ["clerkOrgId"]),

  orgMembers: defineTable({
    userId: v.id("users"),
    clerkUserId: v.string(),
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    role: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_clerk_user_and_org", ["clerkUserId", "clerkOrgId"]),

  auditLogs: defineTable({
    orgId: v.optional(v.id("organizations")),
    clerkOrgId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    clerkUserId: v.optional(v.string()),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_clerk_user", ["clerkUserId"]),

  botProfiles: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    defaultLanguage: v.union(v.literal("auto"), v.literal("en"), v.literal("id")),
    systemPrompt: v.string(),
    localizedPromptTemplates: v.object({
      en: v.optional(v.string()),
      id: v.optional(v.string()),
    }),
    modelPolicy: v.object({
      primaryModel: v.string(),
    }),
    escalationSettings: v.object({
      enabled: v.boolean(),
      handoffMessage: v.optional(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  modelProviderSettings: defineTable({
    organizationId: v.id("organizations"),
    providerType: v.union(
      v.literal("google"),
      v.literal("digitalocean_reference"),
    ),
    modelId: v.string(),
    endpointUrl: v.optional(v.string()),
    apiKeyEncrypted: v.optional(v.string()),
    temperature: v.number(),
    maxTokens: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  promptVersions: defineTable({
    organizationId: v.id("organizations"),
    botId: v.optional(v.id("botProfiles")),
    systemPrompt: v.string(),
    localizedPromptTemplates: v.object({
      en: v.optional(v.string()),
      id: v.optional(v.string()),
    }),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_created_at", ["organizationId", "createdAt"]),

  aiRuns: defineTable({
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    promptVersionId: v.string(),
    selectedProvider: v.string(),
    selectedModel: v.string(),
    outputLanguage: v.string(),
    attempts: v.array(
      v.object({
        provider: v.string(),
        model: v.string(),
        status: v.union(
          v.literal("success"),
          v.literal("failed"),
          v.literal("skipped"),
        ),
        latencyMs: v.optional(v.number()),
        errorCode: v.optional(v.string()),
      }),
    ),
    ragContextUsed: v.boolean(),
    ragChunkCount: v.number(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    guardrailTriggered: v.boolean(),
    guardrailCategory: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_bot", ["botId"]),
});
