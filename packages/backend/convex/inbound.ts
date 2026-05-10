import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  internalMutation,
  query,
  type MutationCtx,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { markConversationPendingBotReply } from "./orchestrator.js";
import { upsertInboundMessageDashboardNotification } from "./notifications.js";
import { requireOrgContext } from "./rbac.js";

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MEDIA_DOWNLOAD_DEADLINE_MS = 4 * 60 * 1000;
const OPT_OUT_KEYWORDS = new Set(["stop", "unsubscribe", "opt out", "quit"]);
const OPT_IN_KEYWORDS = new Set(["start", "unstop", "subscribe"]);

type RawWhatsappPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        contacts?: Array<{
          wa_id?: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
          audio?: {
            id?: string;
            voice?: boolean;
          };
          image?: {
            id?: string;
            caption?: string;
          };
          sticker?: {
            id?: string;
          };
          document?: {
            id?: string;
            filename?: string;
            caption?: string;
          };
        }>;
      };
    }>;
  }>;
};

type RawWhatsappInboundMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  audio?: {
    id?: string;
    voice?: boolean;
  };
  image?: {
    id?: string;
    caption?: string;
  };
  sticker?: {
    id?: string;
  };
  document?: {
    id?: string;
    filename?: string;
    caption?: string;
  };
};

export type NormalizedInboundMessage = {
  providerMessageId: string;
  waId: string;
  profileName?: string;
  messageType: "text" | "audio" | "image" | "document" | "unsupported";
  contentType: "text" | "audio" | "image" | "document" | "unsupported";
  content: string;
  receivedAt: number;
  providerMediaId?: string;
  mediaType?: "audio" | "image" | "document";
  mediaRequiresTranscript: boolean;
  mediaRequiresSummary: boolean;
  mediaRequiresStorage: boolean;
};

function safeParseJson(rawPayload: string) {
  return JSON.parse(rawPayload) as RawWhatsappPayload;
}

function normalizeReceivedAt(value?: string, fallback?: number) {
  const seconds = Number(value ?? "");

  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  return fallback ?? Date.now();
}

function normalizeInboundMessageType(message: RawWhatsappInboundMessage) {
  switch (message.type) {
    case "text":
      return {
        messageType: "text" as const,
        contentType: "text" as const,
        content:
          message.text?.body?.trim() || "[Empty WhatsApp text payload received]",
        providerMediaId: undefined,
        mediaType: undefined,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: false,
        mediaRequiresStorage: false,
      };
    case "audio":
      return {
        messageType: "audio" as const,
        contentType: "audio" as const,
        content: "[Voice note received]",
        providerMediaId: message.audio?.id,
        mediaType: "audio" as const,
        mediaRequiresTranscript: true,
        mediaRequiresSummary: false,
        mediaRequiresStorage: false,
      };
    case "image":
      return {
        messageType: "image" as const,
        contentType: "image" as const,
        content: message.image?.caption?.trim() || "[Image received]",
        providerMediaId: message.image?.id,
        mediaType: "image" as const,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: true,
        mediaRequiresStorage: true,
      };
    case "sticker":
      return {
        messageType: "image" as const,
        contentType: "image" as const,
        content: "[Sticker received]",
        providerMediaId: message.sticker?.id,
        mediaType: "image" as const,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: true,
        mediaRequiresStorage: true,
      };
    case "document":
      return {
        messageType: "document" as const,
        contentType: "document" as const,
        content:
          message.document?.caption?.trim() ||
          message.document?.filename?.trim() ||
          "[Document received]",
        providerMediaId: message.document?.id,
        mediaType: "document" as const,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: true,
        mediaRequiresStorage: true,
      };
    default:
      return {
        messageType: "unsupported" as const,
        contentType: "unsupported" as const,
        content: `[Unsupported WhatsApp payload: ${message.type ?? "unknown"}]`,
        providerMediaId: undefined,
        mediaType: undefined,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: false,
        mediaRequiresStorage: false,
      };
  }
}

function normalizeKeyword(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isOptOutMessage(text: string) {
  return OPT_OUT_KEYWORDS.has(normalizeKeyword(text));
}

function isOptInMessage(text: string) {
  return OPT_IN_KEYWORDS.has(normalizeKeyword(text));
}

export function normalizeInboundWhatsappMessages({
  rawPayload,
  fallbackReceivedAt,
}: {
  rawPayload: string;
  fallbackReceivedAt?: number;
}) {
  const payload = safeParseJson(rawPayload);
  const normalized: NormalizedInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const contacts = change.value?.contacts ?? [];
      const contactByWaId = new Map(
        contacts
          .filter((contact) => contact.wa_id)
          .map((contact) => [
            contact.wa_id as string,
            contact.profile?.name?.trim() || undefined,
          ]),
      );

      for (const message of change.value?.messages ?? []) {
        if (!message.id || !message.from) {
          continue;
        }

        const normalizedType = normalizeInboundMessageType(message);
        normalized.push({
          providerMessageId: message.id,
          waId: message.from,
          profileName: contactByWaId.get(message.from),
          receivedAt: normalizeReceivedAt(message.timestamp, fallbackReceivedAt),
          ...normalizedType,
        });
      }
    }
  }

  return normalized;
}

type ContactUpsertResult = Doc<"whatsappContacts">;

export async function upsertWhatsappContact(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    integrationId,
    botId,
    waId,
    profileName,
    receivedAt,
  }: {
    organizationId: Id<"organizations">;
    integrationId: Id<"whatsappIntegrations">;
    botId: Id<"botProfiles">;
    waId: string;
    profileName?: string;
    receivedAt: number;
  },
): Promise<ContactUpsertResult> {
  const existing = await ctx.db
    .query("whatsappContacts")
    .withIndex("by_org_wa_id", (q) =>
      q.eq("organizationId", organizationId).eq("waId", waId),
    )
    .first();
  const now = Date.now();
  const serviceWindowExpiresAt = receivedAt + SERVICE_WINDOW_MS;

  if (existing) {
    await ctx.db.patch(existing._id, {
      integrationId,
      botId,
      profileName: profileName ?? existing.profileName,
      lastInboundAt: Math.max(existing.lastInboundAt, receivedAt),
      serviceWindowExpiresAt: Math.max(
        existing.serviceWindowExpiresAt,
        serviceWindowExpiresAt,
      ),
      updatedAt: now,
    });

    return {
      ...existing,
      integrationId,
      botId,
      profileName: profileName ?? existing.profileName,
      optOut: existing.optOut,
      optOutReason: existing.optOutReason,
      optOutUpdatedAt: existing.optOutUpdatedAt,
      lastInboundAt: Math.max(existing.lastInboundAt, receivedAt),
      serviceWindowExpiresAt: Math.max(
        existing.serviceWindowExpiresAt,
        serviceWindowExpiresAt,
      ),
      updatedAt: now,
    };
  }

  const contactId = await ctx.db.insert("whatsappContacts", {
    organizationId,
    integrationId,
    botId,
    waId,
    profileName,
    optOut: false,
    optOutReason: undefined,
    optOutUpdatedAt: undefined,
    lastInboundAt: receivedAt,
    serviceWindowExpiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    _id: contactId,
    _creationTime: now,
    organizationId,
    integrationId,
    botId,
    waId,
    profileName,
    optOut: false,
    optOutReason: undefined,
    optOutUpdatedAt: undefined,
    lastInboundAt: receivedAt,
    serviceWindowExpiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

export async function findOrCreateActiveConversation(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    contact,
    receivedAt,
    preview,
  }: {
    organizationId: Id<"organizations">;
    contact: Doc<"whatsappContacts">;
    receivedAt: number;
    preview: string;
  },
) {
  const now = Date.now();

  if (contact.activeConversationId) {
    const existingConversation = await ctx.db.get(contact.activeConversationId);
    if (existingConversation && existingConversation.status === "open") {
      await ctx.db.patch(existingConversation._id, {
        lastMessageAt: Math.max(existingConversation.lastMessageAt, receivedAt),
        lastInboundAt: Math.max(existingConversation.lastInboundAt, receivedAt),
        serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
        serviceWindowExpiringSoon: false,
        lastMessagePreview: preview,
        updatedAt: now,
      });

      return {
        ...existingConversation,
        botReplyState: existingConversation.botReplyState,
        botReplyError: existingConversation.botReplyError,
        botReplyDebounceUntilAt: existingConversation.botReplyDebounceUntilAt,
        replyGenerationToken: existingConversation.replyGenerationToken,
        replyGenerationStartedAt: existingConversation.replyGenerationStartedAt,
        lastAutoReplyAt: existingConversation.lastAutoReplyAt,
        lastAutoReplyMessageId: existingConversation.lastAutoReplyMessageId,
        lastAutoReplyInboundAt: existingConversation.lastAutoReplyInboundAt,
        lastMessageAt: Math.max(existingConversation.lastMessageAt, receivedAt),
        lastInboundAt: Math.max(existingConversation.lastInboundAt, receivedAt),
        serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
        serviceWindowExpiringSoon: false,
        lastMessagePreview: preview,
        updatedAt: now,
      };
    }
  }

  const conversationId = await ctx.db.insert("conversations", {
    organizationId,
    channel: "whatsapp",
    contactId: contact._id,
    status: "open",
    handoffRequested: false,
    botPaused: false,
    botReplyState: "idle",
    botReplyError: undefined,
    botReplyDebounceUntilAt: undefined,
    replyGenerationToken: undefined,
    replyGenerationStartedAt: undefined,
    lastAutoReplyAt: undefined,
    lastAutoReplyMessageId: undefined,
    lastAutoReplyInboundAt: undefined,
    serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
    serviceWindowExpiringSoon: false,
    lastMessageAt: receivedAt,
    lastInboundAt: receivedAt,
    lastMessagePreview: preview,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(contact._id, {
    activeConversationId: conversationId,
    updatedAt: now,
  });

  return {
    _id: conversationId,
    _creationTime: now,
    organizationId,
    channel: "whatsapp" as const,
    contactId: contact._id,
    status: "open" as const,
    handoffRequested: false,
    botPaused: false,
    botReplyState: "idle" as const,
    botReplyError: undefined,
    botReplyDebounceUntilAt: undefined,
    replyGenerationToken: undefined,
    replyGenerationStartedAt: undefined,
    lastAutoReplyAt: undefined,
    lastAutoReplyMessageId: undefined,
    lastAutoReplyInboundAt: undefined,
    serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
    serviceWindowExpiringSoon: false,
    lastMessageAt: receivedAt,
    lastInboundAt: receivedAt,
    lastMessagePreview: preview,
    createdAt: now,
    updatedAt: now,
  };
}

async function findWhatsappMessageByProviderId(
  ctx: Pick<MutationCtx, "db">,
  providerMessageId: string,
) {
  return ctx.db
    .query("whatsappMessages")
    .withIndex("by_provider_message_id", (q) =>
      q.eq("providerMessageId", providerMessageId),
    )
    .first();
}

async function createWhatsappMediaRecord(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    integrationId,
    conversationId,
    contactId,
    whatsappMessageId,
    transcriptMessageId,
    providerMessageId,
    providerMediaId,
    mediaType,
    receivedAt,
    mediaRequiresTranscript,
    mediaRequiresSummary,
    mediaRequiresStorage,
  }: {
    organizationId: Id<"organizations">;
    integrationId: Id<"whatsappIntegrations">;
    conversationId: Id<"conversations">;
    contactId: Id<"whatsappContacts">;
    whatsappMessageId: Id<"whatsappMessages">;
    transcriptMessageId: Id<"messages">;
    providerMessageId: string;
    providerMediaId: string;
    mediaType: "audio" | "image" | "document";
    receivedAt: number;
    mediaRequiresTranscript: boolean;
    mediaRequiresSummary: boolean;
    mediaRequiresStorage: boolean;
  },
) {
  const now = Date.now();
  return ctx.db.insert("whatsappMedia", {
    organizationId,
    integrationId,
    conversationId,
    contactId,
    whatsappMessageId,
    transcriptMessageId,
    providerMessageId,
    providerMediaId,
    mediaType,
    downloadStatus: "queued",
    transcriptStatus: mediaRequiresTranscript ? "queued" : "not_applicable",
    summaryStatus: mediaRequiresSummary ? "queued" : "not_applicable",
    storageStatus: mediaRequiresStorage ? "queued" : "not_applicable",
    processingStatus: "pending",
    lastError: undefined,
    downloadDeadlineAt: receivedAt + MEDIA_DOWNLOAD_DEADLINE_MS,
    createdAt: now,
    updatedAt: now,
  });
}

export async function processStoredWhatsappWebhookEvent(
  ctx: Pick<MutationCtx, "db" | "scheduler" | "runMutation">,
  webhookEvent: Doc<"whatsappWebhookEvents">,
) {
  if (!webhookEvent.organizationId || !webhookEvent.integrationId || !webhookEvent.botId) {
    await ctx.db.patch(webhookEvent._id, {
      processingStatus: "ignored",
      normalizedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      ignored: true,
      processedMessages: 0,
    };
  }

  const normalizedMessages = normalizeInboundWhatsappMessages({
    rawPayload: webhookEvent.rawPayload,
    fallbackReceivedAt: webhookEvent.receivedAt,
  });

  if (normalizedMessages.length === 0) {
    await ctx.db.patch(webhookEvent._id, {
      processingStatus: "ignored",
      normalizedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      ignored: true,
      processedMessages: 0,
    };
  }

  let processedMessages = 0;
  let createdMediaRecords = 0;

  for (const normalizedMessage of normalizedMessages) {
    const existingTransportMessage = await findWhatsappMessageByProviderId(
      ctx,
      normalizedMessage.providerMessageId,
    );
    if (existingTransportMessage) {
      continue;
    }

    const contact = await upsertWhatsappContact(ctx, {
      organizationId: webhookEvent.organizationId,
      integrationId: webhookEvent.integrationId,
      botId: webhookEvent.botId,
      waId: normalizedMessage.waId,
      profileName: normalizedMessage.profileName,
      receivedAt: normalizedMessage.receivedAt,
    });

    const conversation = await findOrCreateActiveConversation(ctx, {
      organizationId: webhookEvent.organizationId,
      contact,
      receivedAt: normalizedMessage.receivedAt,
      preview: normalizedMessage.content,
    });

    const now = Date.now();
    const normalizedContent = normalizedMessage.content.trim();
    const shouldOptOut =
      normalizedMessage.messageType === "text" && isOptOutMessage(normalizedContent);
    const shouldOptIn =
      normalizedMessage.messageType === "text" && isOptInMessage(normalizedContent);
    const effectiveOptOut = shouldOptOut ? true : shouldOptIn ? false : contact.optOut;

    if (shouldOptOut || shouldOptIn) {
      await ctx.db.patch(contact._id, {
        optOut: shouldOptOut,
        optOutReason: shouldOptOut ? "customer_opt_out_keyword" : undefined,
        optOutUpdatedAt: now,
        updatedAt: now,
      });
    }

    const transcriptMessageId = await ctx.db.insert("messages", {
      organizationId: webhookEvent.organizationId,
      conversationId: conversation._id,
      role: "user",
      source: "whatsapp_inbound",
      content: normalizedMessage.content,
      contentType: normalizedMessage.contentType,
      deliveryState: "received",
      createdAt: normalizedMessage.receivedAt,
      updatedAt: now,
    });

    if (ctx.runMutation) {
      await ctx.runMutation(internal.billing.incrementUsageCountersMutation, {
        organizationId: webhookEvent.organizationId,
        inboundMessageCount: 1,
      });
    }

    const whatsappMessageId = await ctx.db.insert("whatsappMessages", {
      organizationId: webhookEvent.organizationId,
      integrationId: webhookEvent.integrationId,
      conversationId: conversation._id,
      contactId: contact._id,
      transcriptMessageId,
      providerMessageId: normalizedMessage.providerMessageId,
      waId: normalizedMessage.waId,
      direction: "inbound",
      messageType: normalizedMessage.messageType,
      transportStatus: "received",
      rawSummary: normalizedMessage.content,
      createdAt: normalizedMessage.receivedAt,
      updatedAt: now,
    });

    await ctx.db.patch(transcriptMessageId, {
      transportMessageId: whatsappMessageId,
    });

    await ctx.db.patch(conversation._id, {
      lastMessageAt: normalizedMessage.receivedAt,
      lastInboundAt: normalizedMessage.receivedAt,
      serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
      serviceWindowExpiringSoon: false,
      lastMessagePreview: normalizedMessage.content,
      updatedAt: now,
    });

    await upsertInboundMessageDashboardNotification(ctx, {
      organizationId: webhookEvent.organizationId,
      conversationId: conversation._id,
      focusMessageId: transcriptMessageId,
      providerMessageId: normalizedMessage.providerMessageId,
      profileName: normalizedMessage.profileName,
      waId: normalizedMessage.waId,
      messageType: normalizedMessage.messageType,
      content: normalizedMessage.content,
    });

    if (normalizedMessage.providerMediaId && normalizedMessage.mediaType) {
      const mediaId = await createWhatsappMediaRecord(ctx, {
        organizationId: webhookEvent.organizationId,
        integrationId: webhookEvent.integrationId,
        conversationId: conversation._id,
        contactId: contact._id,
        whatsappMessageId,
        transcriptMessageId,
        providerMessageId: normalizedMessage.providerMessageId,
        providerMediaId: normalizedMessage.providerMediaId,
        mediaType: normalizedMessage.mediaType,
        receivedAt: webhookEvent.receivedAt,
        mediaRequiresTranscript: normalizedMessage.mediaRequiresTranscript,
        mediaRequiresSummary: normalizedMessage.mediaRequiresSummary,
        mediaRequiresStorage: normalizedMessage.mediaRequiresStorage,
      });
      await ctx.db.patch(transcriptMessageId, {
        whatsappMediaId: mediaId,
        updatedAt: now,
      });

      if (ctx.scheduler) {
        await ctx.scheduler.runAfter(0, internal.mediaAction.processWhatsappMedia, {
          mediaId,
        });
      }
      createdMediaRecords += 1;
    }

    if (
      normalizedMessage.messageType === "text" &&
      !effectiveOptOut &&
      !shouldOptOut
    ) {
      await markConversationPendingBotReply(ctx, {
        conversationId: conversation._id,
        lastInboundAt: normalizedMessage.receivedAt,
        serviceWindowExpiresAt: contact.serviceWindowExpiresAt,
      });
    }

    processedMessages += 1;
  }

  await ctx.db.patch(webhookEvent._id, {
    processingStatus:
      createdMediaRecords > 0 ? "normalized_media_queued" : "normalized",
    normalizedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return {
    ignored: false,
    processedMessages,
    createdMediaRecords,
  };
}

export const processStoredWhatsappWebhookEventMutation = internalMutation({
  args: {
    eventId: v.id("whatsappWebhookEvents"),
  },
  handler: async (ctx, args) => {
    const webhookEvent = await ctx.db.get(args.eventId);

    if (!webhookEvent) {
      throw new Error("WhatsApp webhook event not found.");
    }

    return processStoredWhatsappWebhookEvent(ctx, webhookEvent);
  },
});

export const getInboxState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_org_last_message_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(20);

    const conversationSummaries = await Promise.all(
      conversations.map(async (conversation) => {
        const contact = conversation.contactId
          ? await ctx.db.get(conversation.contactId)
          : null;
        const recentMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_created_at", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .order("desc")
          .take(5);

        return {
          id: conversation._id,
          channel: conversation.channel,
          status: conversation.status,
          botReplyState: conversation.botReplyState,
          botReplyError: conversation.botReplyError ?? null,
          botReplyDebounceUntilAt: conversation.botReplyDebounceUntilAt ?? null,
          serviceWindowExpiringSoon: conversation.serviceWindowExpiringSoon,
          waId: contact?.waId ?? null,
          profileName: contact?.profileName ?? null,
          serviceWindowExpiresAt: conversation.serviceWindowExpiresAt ?? null,
          lastInboundAt: conversation.lastInboundAt,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview ?? null,
          recentMessages: recentMessages.reverse().map((message) => ({
            id: message._id,
            role: message.role,
            content: message.content,
            contentType: message.contentType,
            createdAt: message.createdAt,
          })),
        };
      }),
    );

    const mediaRecords = await ctx.db
      .query("whatsappMedia")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(10);
    const outboundQueue = await ctx.db
      .query("outboundQueue")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(10);
    const notifications = await ctx.db
      .query("dashboardNotifications")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(10);

    return {
      role: access.role,
      conversations: conversationSummaries,
      mediaRecords: mediaRecords.map((record) => ({
        id: record._id,
        providerMessageId: record.providerMessageId,
        providerMediaId: record.providerMediaId,
        mediaType: record.mediaType,
        downloadStatus: record.downloadStatus,
        transcriptStatus: record.transcriptStatus,
        summaryStatus: record.summaryStatus,
        storageStatus: record.storageStatus,
        downloadDeadlineAt: record.downloadDeadlineAt,
        createdAt: record.createdAt,
      })),
      outboundQueue: outboundQueue.map((job) => ({
        id: job._id,
        conversationId: job.conversationId,
        messageId: job.messageId,
        status: job.status,
        attemptCount: job.attemptCount,
        nextAttemptAt: job.nextAttemptAt,
        failureCode: job.failureCode ?? null,
        failureMessage: job.failureMessage ?? null,
        createdAt: job.createdAt,
      })),
      notifications: notifications.map((notification) => ({
        id: notification._id,
        conversationId: notification.conversationId ?? null,
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        body: notification.body,
        recommendation: notification.recommendation ?? null,
        status: notification.status,
        createdAt: notification.createdAt,
      })),
    };
  },
});
