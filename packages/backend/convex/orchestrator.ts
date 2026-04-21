import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

export const BOT_REPLY_DEBOUNCE_MS = 3_500;
export const SERVICE_WINDOW_EXPIRING_SOON_MS = 30 * 60 * 1_000;
const OUTBOUND_QUEUE_MAX_ATTEMPTS = 5;

type ConversationHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type SchedulerLike = Pick<MutationCtx, "scheduler">["scheduler"];
type OrchestratorCtx = Pick<MutationCtx, "db"> & {
  scheduler?: SchedulerLike;
};

type ReadyClaim = {
  status: "ready";
  conversationId: Id<"conversations">;
  organizationId: Id<"organizations">;
  integrationId: Id<"whatsappIntegrations">;
  contactId: Id<"whatsappContacts">;
  botId: Id<"botProfiles">;
  waId: string;
  generationToken: string;
  claimedLastInboundAt: number;
  latestUserMessage: string;
  history: ConversationHistoryEntry[];
};

type NonReadyClaim = {
  status: "debounced" | "blocked" | "noop";
  reason: string;
};

export type ClaimBotReplyWorkResult = ReadyClaim | NonReadyClaim;

function createGenerationToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `reply_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isServiceWindowOpen(
  serviceWindowExpiresAt: number | null | undefined,
  now: number,
) {
  return typeof serviceWindowExpiresAt === "number" && serviceWindowExpiresAt > now;
}

export function isServiceWindowExpiringSoon(
  serviceWindowExpiresAt: number | null | undefined,
  now: number,
) {
  if (!isServiceWindowOpen(serviceWindowExpiresAt, now)) {
    return false;
  }

  return (serviceWindowExpiresAt ?? 0) - now <= SERVICE_WINDOW_EXPIRING_SOON_MS;
}

export function buildOutboundQueueIdempotencyKey(messageId: string) {
  return `whatsapp:${messageId}`;
}

function buildServiceWindowNotificationDedupeKey(
  conversationId: string,
  serviceWindowExpiresAt: number,
) {
  return `service-window-expiring:${conversationId}:${serviceWindowExpiresAt}`;
}

function buildBotReplyFailureNotificationDedupeKey(
  conversationId: string,
  claimedLastInboundAt: number,
) {
  return `bot-reply-failed:${conversationId}:${claimedLastInboundAt}`;
}

async function upsertDashboardNotification(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    conversationId,
    dedupeKey,
    type,
    severity,
    title,
    body,
    recommendation,
  }: {
    organizationId: Id<"organizations">;
    conversationId?: Id<"conversations">;
    dedupeKey: string;
    type: "service_window_expiring" | "bot_reply_failed";
    severity: "info" | "warning" | "error";
    title: string;
    body: string;
    recommendation?: string;
  },
) {
  const existing = await ctx.db
    .query("dashboardNotifications")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
    .first();
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      severity,
      title,
      body,
      recommendation,
      status: "open",
      updatedAt: now,
    });

    return existing._id;
  }

  return ctx.db.insert("dashboardNotifications", {
    organizationId,
    conversationId,
    type,
    severity,
    title,
    body,
    recommendation,
    dedupeKey,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

async function flagServiceWindowExpiringSoonInternal(
  ctx: Pick<MutationCtx, "db">,
  conversation: Doc<"conversations">,
) {
  if (
    !conversation.serviceWindowExpiresAt ||
    !isServiceWindowExpiringSoon(conversation.serviceWindowExpiresAt, Date.now())
  ) {
    return { flagged: false };
  }

  await ctx.db.patch(conversation._id, {
    serviceWindowExpiringSoon: true,
    updatedAt: Date.now(),
  });

  const notificationId = await upsertDashboardNotification(ctx, {
    organizationId: conversation.organizationId,
    conversationId: conversation._id,
    dedupeKey: buildServiceWindowNotificationDedupeKey(
      conversation._id,
      conversation.serviceWindowExpiresAt,
    ),
    type: "service_window_expiring",
    severity: "warning",
    title: "Service window expires soon",
    body:
      "This WhatsApp conversation is approaching the 24-hour cutoff for freeform replies.",
    recommendation:
      "If the customer does not reply again, prepare a pre-approved re-engagement template.",
  });

  return {
    flagged: true,
    notificationId,
  };
}

function buildReplyHistory(
  messages: Array<Doc<"messages">>,
  latestUserMessageId: Id<"messages">,
) {
  return messages
    .filter(
      (message) =>
        message._id !== latestUserMessageId &&
        (message.role === "user" || message.role === "assistant"),
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    })) as ConversationHistoryEntry[];
}

export async function markConversationPendingBotReply(
  ctx: OrchestratorCtx,
  {
    conversationId,
    lastInboundAt,
    serviceWindowExpiresAt,
  }: {
    conversationId: Id<"conversations">;
    lastInboundAt: number;
    serviceWindowExpiresAt?: number | null;
  },
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    return { scheduled: false, reason: "missing_conversation" as const };
  }

  const now = Date.now();
  const debounceUntilAt = Math.max(
    lastInboundAt + BOT_REPLY_DEBOUNCE_MS,
    now + BOT_REPLY_DEBOUNCE_MS,
  );

  await ctx.db.patch(conversationId, {
    botReplyState: "pending",
    botReplyError: undefined,
    botReplyDebounceUntilAt: debounceUntilAt,
    replyGenerationToken: undefined,
    replyGenerationStartedAt: undefined,
    updatedAt: now,
  });

  if (ctx.scheduler) {
    await ctx.scheduler.runAfter(
      Math.max(0, debounceUntilAt - now),
      internal.orchestratorAction.runBotReplyOrchestrator,
      {
        conversationId,
      },
    );

    if (serviceWindowExpiresAt) {
      const expiringAt = serviceWindowExpiresAt - SERVICE_WINDOW_EXPIRING_SOON_MS;
      await ctx.scheduler.runAfter(
        Math.max(0, expiringAt - now),
        internal.orchestrator.flagServiceWindowExpiringSoon,
        {
          conversationId,
          expectedServiceWindowExpiresAt: serviceWindowExpiresAt,
        },
      );
    }
  }

  return {
    scheduled: true,
    debounceUntilAt,
  };
}

export async function claimBotReplyWork(
  ctx: Pick<MutationCtx, "db">,
  {
    conversationId,
    now = Date.now(),
  }: {
    conversationId: Id<"conversations">;
    now?: number;
  },
): Promise<ClaimBotReplyWorkResult> {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    return { status: "noop", reason: "missing_conversation" };
  }

  if (conversation.status !== "open") {
    await ctx.db.patch(conversationId, {
      botReplyState: "blocked",
      botReplyError: "conversation_closed",
      updatedAt: now,
    });
    return { status: "blocked", reason: "conversation_closed" };
  }

  if (conversation.botPaused) {
    await ctx.db.patch(conversationId, {
      botReplyState: "blocked",
      botReplyError: "bot_paused",
      updatedAt: now,
    });
    return { status: "blocked", reason: "bot_paused" };
  }

  if (conversation.handoffRequested) {
    await ctx.db.patch(conversationId, {
      botReplyState: "blocked",
      botReplyError: "handoff_requested",
      updatedAt: now,
    });
    return { status: "blocked", reason: "handoff_requested" };
  }

  if (!isServiceWindowOpen(conversation.serviceWindowExpiresAt, now)) {
    await ctx.db.patch(conversationId, {
      botReplyState: "blocked",
      botReplyError: "service_window_closed",
      updatedAt: now,
    });
    return { status: "blocked", reason: "service_window_closed" };
  }

  if (
    conversation.botReplyDebounceUntilAt &&
    conversation.botReplyDebounceUntilAt > now
  ) {
    return { status: "debounced", reason: "waiting_for_debounce_window" };
  }

  if (conversation.botReplyState === "generating") {
    return { status: "noop", reason: "already_generating" };
  }

  if (
    typeof conversation.lastAutoReplyInboundAt === "number" &&
    conversation.lastAutoReplyInboundAt >= conversation.lastInboundAt
  ) {
    await ctx.db.patch(conversationId, {
      botReplyState: "idle",
      botReplyError: undefined,
      updatedAt: now,
    });
    return { status: "noop", reason: "latest_inbound_already_processed" };
  }

  if (isServiceWindowExpiringSoon(conversation.serviceWindowExpiresAt, now)) {
    await flagServiceWindowExpiringSoonInternal(ctx, conversation);
  }

  if (!conversation.contactId) {
    await ctx.db.patch(conversationId, {
      botReplyState: "failed",
      botReplyError: "missing_contact",
      updatedAt: now,
    });
    return { status: "blocked", reason: "missing_contact" };
  }

  const contact = await ctx.db.get(conversation.contactId);
  if (!contact) {
    await ctx.db.patch(conversationId, {
      botReplyState: "failed",
      botReplyError: "missing_contact",
      updatedAt: now,
    });
    return { status: "blocked", reason: "missing_contact" };
  }

  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_created_at", (q) =>
      q.eq("conversationId", conversationId),
    )
    .order("desc")
    .take(12);
  const orderedMessages = messages.reverse();
  const latestUserMessage = [...orderedMessages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    await ctx.db.patch(conversationId, {
      botReplyState: "idle",
      botReplyError: undefined,
      updatedAt: now,
    });
    return { status: "noop", reason: "no_user_message_found" };
  }

  const generationToken = createGenerationToken();
  await ctx.db.patch(conversationId, {
    botReplyState: "generating",
    botReplyError: undefined,
    replyGenerationToken: generationToken,
    replyGenerationStartedAt: now,
    updatedAt: now,
  });

  return {
    status: "ready",
    conversationId,
    organizationId: conversation.organizationId,
    integrationId: contact.integrationId,
    contactId: contact._id,
    botId: contact.botId,
    waId: contact.waId,
    generationToken,
    claimedLastInboundAt: conversation.lastInboundAt,
    latestUserMessage: latestUserMessage.content,
    history: buildReplyHistory(orderedMessages, latestUserMessage._id),
  };
}

export async function finalizeBotReplyDraft(
  ctx: OrchestratorCtx,
  {
    conversationId,
    generationToken,
    claimedLastInboundAt,
    content,
  }: {
    conversationId: Id<"conversations">;
    generationToken: string;
    claimedLastInboundAt: number;
    content: string;
  },
) {
  const conversation = await ctx.db.get(conversationId);
  const now = Date.now();

  if (!conversation) {
    return { status: "noop" as const, reason: "missing_conversation" };
  }

  if (
    conversation.replyGenerationToken !== generationToken ||
    conversation.botReplyState !== "generating"
  ) {
    return { status: "noop" as const, reason: "stale_generation_token" };
  }

  if (conversation.lastInboundAt > claimedLastInboundAt) {
    const debounceUntilAt = Math.max(
      conversation.lastInboundAt + BOT_REPLY_DEBOUNCE_MS,
      now + BOT_REPLY_DEBOUNCE_MS,
    );

    await ctx.db.patch(conversationId, {
      botReplyState: "pending",
      botReplyError: undefined,
      botReplyDebounceUntilAt: debounceUntilAt,
      replyGenerationToken: undefined,
      replyGenerationStartedAt: undefined,
      updatedAt: now,
    });

    if (ctx.scheduler) {
      await ctx.scheduler.runAfter(
        Math.max(0, debounceUntilAt - now),
        internal.orchestratorAction.runBotReplyOrchestrator,
        {
          conversationId,
        },
      );
    }

    return { status: "rescheduled" as const, reason: "newer_inbound_detected" };
  }

  if (
    conversation.botPaused ||
    conversation.handoffRequested ||
    !isServiceWindowOpen(conversation.serviceWindowExpiresAt, now)
  ) {
    const reason = conversation.botPaused
      ? "bot_paused"
      : conversation.handoffRequested
        ? "handoff_requested"
        : "service_window_closed";
    await ctx.db.patch(conversationId, {
      botReplyState: "blocked",
      botReplyError: reason,
      replyGenerationToken: undefined,
      replyGenerationStartedAt: undefined,
      updatedAt: now,
    });
    return { status: "blocked" as const, reason };
  }

  if (!conversation.contactId) {
    await ctx.db.patch(conversationId, {
      botReplyState: "failed",
      botReplyError: "missing_contact",
      replyGenerationToken: undefined,
      replyGenerationStartedAt: undefined,
      updatedAt: now,
    });
    return { status: "failed" as const, reason: "missing_contact" };
  }

  const contact = await ctx.db.get(conversation.contactId);
  if (!contact) {
    await ctx.db.patch(conversationId, {
      botReplyState: "failed",
      botReplyError: "missing_contact",
      replyGenerationToken: undefined,
      replyGenerationStartedAt: undefined,
      updatedAt: now,
    });
    return { status: "failed" as const, reason: "missing_contact" };
  }

  const assistantMessageId = await ctx.db.insert("messages", {
    organizationId: conversation.organizationId,
    conversationId,
    role: "assistant",
    source: "bot_orchestrator",
    content,
    contentType: "text",
    deliveryState: "queued",
    createdAt: now,
    updatedAt: now,
  });

  const whatsappMessageId = await ctx.db.insert("whatsappMessages", {
    organizationId: conversation.organizationId,
    integrationId: contact.integrationId,
    conversationId,
    contactId: contact._id,
    transcriptMessageId: assistantMessageId,
    providerMessageId: `queued:${assistantMessageId}`,
    waId: contact.waId,
    direction: "outbound",
    messageType: "text",
    transportStatus: "queued",
    rawSummary: content,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(assistantMessageId, {
    transportMessageId: whatsappMessageId,
    updatedAt: now,
  });

  const existingQueueJob = await ctx.db
    .query("outboundQueue")
    .withIndex("by_message_id", (q) => q.eq("messageId", assistantMessageId))
    .first();
  const outboundQueueId =
    existingQueueJob?._id ??
    (await ctx.db.insert("outboundQueue", {
      organizationId: conversation.organizationId,
      integrationId: contact.integrationId,
      conversationId,
      contactId: contact._id,
      channel: "whatsapp",
      messageId: assistantMessageId,
      whatsappMessageId,
      idempotencyKey: buildOutboundQueueIdempotencyKey(assistantMessageId),
      status: "queued",
      attemptCount: 0,
      maxAttempts: OUTBOUND_QUEUE_MAX_ATTEMPTS,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    }));

  await ctx.db.patch(conversationId, {
    botReplyState: "queued",
    botReplyError: undefined,
    botReplyDebounceUntilAt: undefined,
    replyGenerationToken: undefined,
    replyGenerationStartedAt: undefined,
    lastAutoReplyAt: now,
    lastAutoReplyMessageId: assistantMessageId,
    lastAutoReplyInboundAt: claimedLastInboundAt,
    lastMessageAt: now,
    lastMessagePreview: content,
    updatedAt: now,
  });

  await ctx.db.insert("auditLogs", {
    orgId: conversation.organizationId,
    action: "bot_reply_queued",
    details: {
      conversationId,
      assistantMessageId,
      whatsappMessageId,
      outboundQueueId,
    },
    createdAt: now,
  });

  return {
    status: "queued" as const,
    assistantMessageId,
    whatsappMessageId,
    outboundQueueId,
  };
}

export async function markBotReplyFailure(
  ctx: Pick<MutationCtx, "db">,
  {
    conversationId,
    generationToken,
    claimedLastInboundAt,
    errorMessage,
  }: {
    conversationId: Id<"conversations">;
    generationToken: string;
    claimedLastInboundAt: number;
    errorMessage: string;
  },
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation || conversation.replyGenerationToken !== generationToken) {
    return { status: "noop" as const };
  }

  const now = Date.now();
  await ctx.db.patch(conversationId, {
    botReplyState: "failed",
    botReplyError: errorMessage,
    replyGenerationToken: undefined,
    replyGenerationStartedAt: undefined,
    updatedAt: now,
  });

  const notificationId = await upsertDashboardNotification(ctx, {
    organizationId: conversation.organizationId,
    conversationId,
    dedupeKey: buildBotReplyFailureNotificationDedupeKey(
      conversationId,
      claimedLastInboundAt,
    ),
    type: "bot_reply_failed",
    severity: "error",
    title: "Bot reply generation failed",
    body: errorMessage,
    recommendation: "Review the queue state, AI provider config, and recent inbound transcript.",
  });

  await ctx.db.insert("auditLogs", {
    orgId: conversation.organizationId,
    action: "bot_reply_failed",
    details: {
      conversationId,
      claimedLastInboundAt,
      errorMessage,
      notificationId,
    },
    createdAt: now,
  });

  return {
    status: "failed" as const,
    notificationId,
  };
}

export async function flagServiceWindowExpiringSoonNow(
  ctx: Pick<MutationCtx, "db">,
  {
    conversationId,
    expectedServiceWindowExpiresAt,
  }: {
    conversationId: Id<"conversations">;
    expectedServiceWindowExpiresAt: number;
  },
) {
  const conversation = await ctx.db.get(conversationId);

  if (
    !conversation ||
    conversation.status !== "open" ||
    conversation.serviceWindowExpiresAt !== expectedServiceWindowExpiresAt
  ) {
    return { flagged: false };
  }

  return flagServiceWindowExpiringSoonInternal(ctx, conversation);
}

export const claimBotReplyWorkMutation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => claimBotReplyWork(ctx, args),
});

export const finalizeBotReplyDraftMutation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    generationToken: v.string(),
    claimedLastInboundAt: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args) => finalizeBotReplyDraft(ctx, args),
});

export const markBotReplyFailureMutation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    generationToken: v.string(),
    claimedLastInboundAt: v.number(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => markBotReplyFailure(ctx, args),
});

export const flagServiceWindowExpiringSoon = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    expectedServiceWindowExpiresAt: v.number(),
  },
  handler: async (ctx, args) => flagServiceWindowExpiringSoonNow(ctx, args),
});
