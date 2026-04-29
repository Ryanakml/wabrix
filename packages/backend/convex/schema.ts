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
      v.literal("document"),
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
      v.literal("markitdown"),
    ),
    originalFormat: v.union(
      v.literal("markdown"),
      v.literal("html"),
      v.literal("plain_text"),
      v.literal("pdf"),
      v.literal("docx"),
      v.literal("xlsx"),
      v.literal("csv"),
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
    approvalStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("action_required"),
      ),
    ),
    phoneVerificationStatus: v.optional(
      v.union(
        v.literal("missing"),
        v.literal("pending"),
        v.literal("verified"),
        v.literal("failed"),
      ),
    ),
    businessProfileStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("synced"),
        v.literal("failed"),
      ),
    ),
    displayNameReviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
    messagingLimitTier: v.optional(v.string()),
    businessProfile: v.optional(
      v.object({
        about: v.optional(v.string()),
        address: v.optional(v.string()),
        description: v.optional(v.string()),
        email: v.optional(v.string()),
        vertical: v.optional(v.string()),
        websites: v.optional(v.array(v.string())),
      }),
    ),
    lastWebhookVerifiedAt: v.optional(v.number()),
    lastWebhookEventAt: v.optional(v.number()),
    lastTemplateSyncAt: v.optional(v.number()),
    lastTemplateSyncError: v.optional(v.string()),
    lastLifecycleRefreshAt: v.optional(v.number()),
    lastLifecycleError: v.optional(v.string()),
    lastPhoneVerificationAt: v.optional(v.number()),
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
      v.literal("normalized"),
      v.literal("normalized_media_queued"),
      v.literal("status_processed"),
      v.literal("template_processed"),
      v.literal("lifecycle_processed"),
      v.literal("ignored"),
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
    normalizedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event_key", ["eventKey"])
    .index("by_org_received_at", ["organizationId", "receivedAt"])
    .index("by_phone_number_id_received_at", ["phoneNumberId", "receivedAt"]),

  whatsappContacts: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    botId: v.id("botProfiles"),
    waId: v.string(),
    profileName: v.optional(v.string()),
    activeConversationId: v.optional(v.id("conversations")),
    optOut: v.boolean(),
    optOutReason: v.optional(v.string()),
    optOutUpdatedAt: v.optional(v.number()),
    lastInboundAt: v.number(),
    serviceWindowExpiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_wa_id", ["organizationId", "waId"])
    .index("by_active_conversation", ["activeConversationId"]),

  conversations: defineTable({
    organizationId: v.id("organizations"),
    channel: v.union(v.literal("whatsapp")),
    contactId: v.optional(v.id("whatsappContacts")),
    assignedUserId: v.optional(v.id("users")),
    assignedClerkUserId: v.optional(v.string()),
    assignedUserName: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    handoffRequested: v.boolean(),
    botPaused: v.boolean(),
    botReplyState: v.union(
      v.literal("idle"),
      v.literal("pending"),
      v.literal("generating"),
      v.literal("queued"),
      v.literal("blocked"),
      v.literal("failed"),
    ),
    botReplyError: v.optional(v.string()),
    botReplyDebounceUntilAt: v.optional(v.number()),
    replyGenerationToken: v.optional(v.string()),
    replyGenerationStartedAt: v.optional(v.number()),
    lastAutoReplyAt: v.optional(v.number()),
    lastAutoReplyMessageId: v.optional(v.id("messages")),
    lastAutoReplyInboundAt: v.optional(v.number()),
    serviceWindowExpiresAt: v.optional(v.number()),
    serviceWindowExpiringSoon: v.boolean(),
    lastMessageAt: v.number(),
    lastInboundAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_last_message_at", ["organizationId", "lastMessageAt"])
    .index("by_contact", ["contactId"]),

  conversationNotes: defineTable({
    organizationId: v.id("organizations"),
    conversationId: v.id("conversations"),
    authorUserId: v.id("users"),
    authorClerkUserId: v.string(),
    authorDisplayName: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation_created_at", ["conversationId", "createdAt"])
    .index("by_org_created_at", ["organizationId", "createdAt"]),

  messages: defineTable({
    organizationId: v.id("organizations"),
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("agent"),
      v.literal("system"),
    ),
    source: v.string(),
    content: v.string(),
    contentType: v.union(
      v.literal("text"),
      v.literal("audio"),
      v.literal("image"),
      v.literal("document"),
      v.literal("template"),
      v.literal("unsupported"),
    ),
    transportMessageId: v.optional(v.id("whatsappMessages")),
    whatsappMediaId: v.optional(v.id("whatsappMedia")),
    templateId: v.optional(v.id("whatsappTemplates")),
    deliveryState: v.union(
      v.literal("received"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation_created_at", ["conversationId", "createdAt"])
    .index("by_org_created_at", ["organizationId", "createdAt"]),

  whatsappMessages: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    conversationId: v.id("conversations"),
    contactId: v.id("whatsappContacts"),
    transcriptMessageId: v.id("messages"),
    providerMessageId: v.string(),
    waId: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    messageType: v.union(
      v.literal("text"),
      v.literal("audio"),
      v.literal("image"),
      v.literal("document"),
      v.literal("template"),
      v.literal("unsupported"),
    ),
    templateId: v.optional(v.id("whatsappTemplates")),
    templateName: v.optional(v.string()),
    templateLanguageCode: v.optional(v.string()),
    transportStatus: v.union(
      v.literal("received"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    providerStatus: v.optional(v.string()),
    providerStatusAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    rawSummary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider_message_id", ["providerMessageId"])
    .index("by_conversation_created_at", ["conversationId", "createdAt"])
    .index("by_contact", ["contactId"]),

  whatsappMedia: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    conversationId: v.id("conversations"),
    contactId: v.id("whatsappContacts"),
    whatsappMessageId: v.id("whatsappMessages"),
    transcriptMessageId: v.id("messages"),
    providerMessageId: v.string(),
    providerMediaId: v.string(),
    mediaType: v.union(
      v.literal("audio"),
      v.literal("image"),
      v.literal("document"),
    ),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSizeBytes: v.optional(v.number()),
    storageObjectKey: v.optional(v.string()),
    storageProvider: v.optional(v.string()),
    mediaSha256: v.optional(v.string()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    downloadStatus: v.union(
      v.literal("queued"),
      v.literal("downloading"),
      v.literal("downloaded"),
      v.literal("failed"),
      v.literal("expired"),
      v.literal("not_required"),
    ),
    transcriptStatus: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("not_applicable"),
    ),
    summaryStatus: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("not_applicable"),
    ),
    storageStatus: v.union(
      v.literal("queued"),
      v.literal("uploading"),
      v.literal("stored"),
      v.literal("failed"),
      v.literal("not_configured"),
      v.literal("not_applicable"),
    ),
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("unsupported"),
    ),
    lastError: v.optional(v.string()),
    downloadDeadlineAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_whatsapp_message", ["whatsappMessageId"])
    .index("by_org_created_at", ["organizationId", "createdAt"]),

  outboundQueue: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    conversationId: v.id("conversations"),
    contactId: v.id("whatsappContacts"),
    channel: v.union(v.literal("whatsapp")),
    messageId: v.id("messages"),
    whatsappMessageId: v.id("whatsappMessages"),
    idempotencyKey: v.string(),
    payloadType: v.union(v.literal("text"), v.literal("template")),
    templateId: v.optional(v.id("whatsappTemplates")),
    templateName: v.optional(v.string()),
    templateLanguageCode: v.optional(v.string()),
    templateComponents: v.optional(v.array(v.any())),
    requiresOpenServiceWindow: v.boolean(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    attemptCount: v.number(),
    maxAttempts: v.number(),
    nextAttemptAt: v.number(),
    claimToken: v.optional(v.string()),
    lastAttemptAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_provider_message_id", ["providerMessageId"])
    .index("by_status_next_attempt_at", ["status", "nextAttemptAt"])
    .index("by_org_created_at", ["organizationId", "createdAt"]),

  dashboardNotifications: defineTable({
    organizationId: v.id("organizations"),
    conversationId: v.optional(v.id("conversations")),
    type: v.union(
      v.literal("service_window_expiring"),
      v.literal("bot_reply_failed"),
      v.literal("outbound_send_failed"),
      v.literal("template_rejected"),
      v.literal("waba_action_required"),
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
    ),
    title: v.string(),
    body: v.string(),
    recommendation: v.optional(v.string()),
    dedupeKey: v.string(),
    readByUserIds: v.optional(v.array(v.id("users"))),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_dedupe_key", ["dedupeKey"])
    .index("by_conversation", ["conversationId"]),

  dashboardNotificationFeedStates: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    lastReadAllAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org_user", ["organizationId", "userId"]),

  whatsappTemplates: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    metaTemplateId: v.optional(v.string()),
    name: v.string(),
    languageCode: v.string(),
    category: v.union(
      v.literal("marketing"),
      v.literal("utility"),
      v.literal("authentication"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("paused"),
      v.literal("disabled"),
      v.literal("archived"),
    ),
    rejectionReason: v.optional(v.string()),
    components: v.array(v.any()),
    lastSyncedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_status", ["organizationId", "status"])
    .index("by_integration", ["integrationId"])
    .index("by_org_name_language", ["organizationId", "name", "languageCode"])
    .index("by_meta_template_id", ["metaTemplateId"]),

  whatsappTemplateSyncLogs: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    templateId: v.optional(v.id("whatsappTemplates")),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
    ),
    action: v.union(
      v.literal("pull_status"),
      v.literal("push_create"),
      v.literal("push_update"),
    ),
    lastError: v.optional(v.string()),
    metaResponse: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_template_created_at", ["templateId", "createdAt"]),

  wabaLifecycleEvents: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.id("whatsappIntegrations"),
    eventType: v.union(
      v.literal("meta_app_approval"),
      v.literal("phone_verification"),
      v.literal("business_profile_sync"),
      v.literal("display_name_review"),
      v.literal("messaging_tier"),
    ),
    status: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_integration_created_at", ["integrationId", "createdAt"]),

  plans: defineTable({
    key: v.string(),
    name: v.string(),
    monthlyPriceUsdCents: v.number(),
    monthlyPriceIdr: v.number(),
    includedAiTokens: v.number(),
    includedOutboundMessages: v.number(),
    includedSeats: v.number(),
    tagline: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_active", ["active"]),

  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    planId: v.optional(v.id("plans")),
    planKey: v.string(),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
    ),
    gateway: v.union(
      v.literal("polar"),
      v.literal("midtrans"),
      v.literal("manual"),
    ),
    billingCountry: v.string(),
    currency: v.union(v.literal("USD"), v.literal("IDR")),
    amount: v.number(),
    providerCustomerId: v.optional(v.string()),
    providerSubscriptionId: v.optional(v.string()),
    providerCheckoutId: v.optional(v.string()),
    providerOrderId: v.optional(v.string()),
    externalReferenceId: v.optional(v.string()),
    interval: v.union(v.literal("month")),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    entitlements: v.object({
      aiTokens: v.number(),
      outboundMessages: v.number(),
      seats: v.number(),
    }),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_provider_subscription_id", ["providerSubscriptionId"])
    .index("by_provider_checkout_id", ["providerCheckoutId"])
    .index("by_provider_order_id", ["providerOrderId"]),

  usageCounters: defineTable({
    organizationId: v.id("organizations"),
    periodKey: v.string(),
    periodStart: v.number(),
    aiRunCount: v.number(),
    aiPromptTokens: v.number(),
    aiCompletionTokens: v.number(),
    aiTotalTokens: v.number(),
    aiEstimatedCostUsd: v.number(),
    inboundMessageCount: v.number(),
    outboundMessageCount: v.number(),
    outboundTemplateMessageCount: v.number(),
    deliverySentCount: v.number(),
    deliveryDeliveredCount: v.number(),
    deliveryReadCount: v.number(),
    deliveryFailedCount: v.number(),
    queueFailureCount: v.number(),
    mediaProcessedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_period_key", ["organizationId", "periodKey"])
    .index("by_org_period_start", ["organizationId", "periodStart"]),

  billingEvents: defineTable({
    organizationId: v.optional(v.id("organizations")),
    subscriptionId: v.optional(v.id("subscriptions")),
    gateway: v.union(v.literal("polar"), v.literal("midtrans")),
    providerEventId: v.string(),
    eventType: v.string(),
    externalReferenceId: v.optional(v.string()),
    providerCustomerId: v.optional(v.string()),
    providerSubscriptionId: v.optional(v.string()),
    providerCheckoutId: v.optional(v.string()),
    providerOrderId: v.optional(v.string()),
    currency: v.optional(v.union(v.literal("USD"), v.literal("IDR"))),
    amount: v.optional(v.number()),
    status: v.string(),
    rawPayload: v.string(),
    idempotencyKey: v.string(),
    processedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_org_created_at", ["organizationId", "createdAt"])
    .index("by_provider_subscription_id", ["providerSubscriptionId"])
    .index("by_provider_order_id", ["providerOrderId"]),
});
