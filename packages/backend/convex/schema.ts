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

  knowledgeSources: defineTable({
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    title: v.string(),
    sourceType: v.union(
      v.literal("inline"),
      v.literal("website"),
      v.literal("pdf"),
    ),
    status: v.union(
      v.literal("ready"),
      v.literal("processing"),
      v.literal("failed"),
      v.literal("deferred"),
    ),
    sourceUrl: v.optional(v.string()),
    sourceVendor: v.union(
      v.literal("inline"),
      v.literal("jina_reader"),
      v.literal("firecrawl"),
      v.literal("cheerio"),
      v.literal("pdf_deferred"),
    ),
    originalFormat: v.union(
      v.literal("markdown"),
      v.literal("html"),
      v.literal("plain_text"),
      v.literal("pdf"),
    ),
    markdownContent: v.string(),
    chunkCount: v.number(),
    embeddingModel: v.optional(v.string()),
    lastIngestedAt: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_bot", ["botId"]),

  knowledgeChunks: defineTable({
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    sourceId: v.id("knowledgeSources"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.number()),
    tokenEstimate: v.number(),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceId"])
    .index("by_bot", ["botId"])
    .index("by_org", ["organizationId"]),

  knowledgeUsageLogs: defineTable({
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    sourceIds: v.array(v.id("knowledgeSources")),
    query: v.string(),
    queryLanguage: v.string(),
    matchedChunkCount: v.number(),
    retrievalStrategy: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_bot_created_at", ["botId", "createdAt"]),

  whatsappIntegrations: defineTable({
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    phoneNumberId: v.string(),
    businessAccountId: v.string(),
    accessTokenEncrypted: v.optional(v.string()),
    appSecretEncrypted: v.optional(v.string()),
    verifyTokenHash: v.optional(v.string()),
    enabled: v.boolean(),
    connectionStatus: v.union(
      v.literal("not_connected"),
      v.literal("configured"),
      v.literal("disabled"),
    ),
    webhookStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("verified"),
        v.literal("receiving"),
      ),
    ),
    lastWebhookVerifiedAt: v.optional(v.number()),
    lastWebhookEventAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_bot", ["botId"])
    .index("by_phone_number_id", ["phoneNumberId"])
    .index("by_verify_token_hash", ["verifyTokenHash"]),

  whatsappWebhookEvents: defineTable({
    organizationId: v.optional(v.id("organizations")),
    integrationId: v.optional(v.id("whatsappIntegrations")),
    botId: v.optional(v.id("botProfiles")),
    phoneNumberId: v.optional(v.string()),
    businessAccountId: v.optional(v.string()),
    eventKey: v.string(),
    eventType: v.string(),
    providerEventId: v.optional(v.string()),
    signatureValid: v.boolean(),
    processingStatus: v.union(
      v.literal("received"),
      v.literal("media_download_queued"),
    ),
    attemptCount: v.number(),
    mediaDownloadStatus: v.union(
      v.literal("not_applicable"),
      v.literal("queued"),
    ),
    mediaDownloadPriority: v.union(v.literal("normal"), v.literal("high")),
    mediaDownloadDeadlineAt: v.optional(v.number()),
    rawPayload: v.string(),
    receivedAt: v.number(),
    lastReceivedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event_key", ["eventKey"])
    .index("by_org_received_at", ["organizationId", "receivedAt"])
    .index("by_phone_number_id_received_at", ["phoneNumberId", "receivedAt"]),
});
