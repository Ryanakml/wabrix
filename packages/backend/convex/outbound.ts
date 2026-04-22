import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { isServiceWindowOpen } from "./orchestrator.js";

const BASE_RETRY_DELAY_MS = 15_000;

type SchedulerLike = Pick<MutationCtx, "scheduler">["scheduler"];
type OutboundCtx = Pick<MutationCtx, "db"> & {
  scheduler?: SchedulerLike;
};

type WhatsappStatusPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          errors?: Array<{
            code?: number;
            title?: string;
            message?: string;
          }>;
        }>;
      };
    }>;
  }>;
};

type QueueReadyClaim = {
  status: "ready";
  queueJobId: Id<"outboundQueue">;
  conversationId: Id<"conversations">;
  integrationId: Id<"whatsappIntegrations">;
  whatsappMessageId: Id<"whatsappMessages">;
  messageId: Id<"messages">;
  contactId: Id<"whatsappContacts">;
  waId: string;
  content: string;
  idempotencyKey: string;
  claimToken: string;
  payloadType: "text" | "template";
  templateId?: Id<"whatsappTemplates">;
  templateName?: string;
  templateLanguageCode?: string;
  templateComponents?: unknown[];
};

type QueueNonReadyClaim = {
  status: "noop" | "failed";
  reason: string;
};

export type ClaimOutboundQueueJobResult = QueueReadyClaim | QueueNonReadyClaim;

export type MetaSendFailure = {
  retryable: boolean;
  errorCode: string;
  errorMessage: string;
};

export type NormalizedWhatsappStatus = {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  recipientWaId?: string;
  errorCode?: string;
  errorMessage?: string;
};

function createClaimToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `queue_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function computeRetryDelayMs(attemptCount: number) {
  return BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attemptCount - 1);
}

export function classifyMetaSendFailure(input: {
  status?: number;
  body?: unknown;
  error?: unknown;
}): MetaSendFailure {
  if (input.error instanceof Error) {
    return {
      retryable: true,
      errorCode: "network_error",
      errorMessage: input.error.message,
    };
  }

  const parsedBody =
    input.body && typeof input.body === "object"
      ? (input.body as {
          error?: {
            code?: number | string;
            message?: string;
            type?: string;
            error_subcode?: number | string;
          };
        })
      : null;
  const status = input.status ?? 500;
  const code = parsedBody?.error?.code;
  const message = parsedBody?.error?.message;

  if (status === 429 || status >= 500) {
    return {
      retryable: true,
      errorCode: String(code ?? status),
      errorMessage: message ?? `Meta send failed with status ${status}`,
    };
  }

  return {
    retryable: false,
    errorCode: String(code ?? status),
    errorMessage: message ?? `Meta send failed with status ${status}`,
  };
}

function mapStatusToDeliveryState(status: "sent" | "delivered" | "read" | "failed") {
  switch (status) {
    case "sent":
      return "sent" as const;
    case "delivered":
      return "delivered" as const;
    case "read":
      return "read" as const;
    case "failed":
      return "failed" as const;
  }
}

async function upsertOutboundFailureNotification(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    conversationId,
    dedupeKey,
    body,
  }: {
    organizationId: Id<"organizations">;
    conversationId: Id<"conversations">;
    dedupeKey: string;
    body: string;
  },
) {
  const existing = await ctx.db
    .query("dashboardNotifications")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
    .first();
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      severity: "error",
      title: "Outbound send failed",
      body,
      recommendation:
        "Review the WhatsApp integration token, queue row, and recent status webhook updates.",
      status: "open",
      updatedAt: now,
    });
    return existing._id;
  }

  return ctx.db.insert("dashboardNotifications", {
    organizationId,
    conversationId,
    type: "outbound_send_failed",
    severity: "error",
    title: "Outbound send failed",
    body,
    recommendation:
      "Review the WhatsApp integration token, queue row, and recent status webhook updates.",
    dedupeKey,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

function buildFailureDedupeKey(queueJobId: string, attemptCount: number) {
  return `outbound-send-failed:${queueJobId}:${attemptCount}`;
}

export function normalizeWhatsappStatusWebhook({
  rawPayload,
  fallbackReceivedAt,
}: {
  rawPayload: string;
  fallbackReceivedAt?: number;
}) {
  const payload = JSON.parse(rawPayload) as WhatsappStatusPayload;
  const normalized: NormalizedWhatsappStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        if (!status.id || !status.status) {
          continue;
        }

        if (
          status.status !== "sent" &&
          status.status !== "delivered" &&
          status.status !== "read" &&
          status.status !== "failed"
        ) {
          continue;
        }

        const timestampSeconds = Number(status.timestamp ?? "");
        const timestamp =
          Number.isFinite(timestampSeconds) && timestampSeconds > 0
            ? timestampSeconds * 1000
            : (fallbackReceivedAt ?? Date.now());
        const firstError = status.errors?.[0];

        normalized.push({
          providerMessageId: status.id,
          status: status.status,
          timestamp,
          recipientWaId: status.recipient_id,
          errorCode:
            typeof firstError?.code === "number" || typeof firstError?.code === "string"
              ? String(firstError.code)
              : undefined,
          errorMessage:
            firstError?.message ??
            firstError?.title ??
            (status.status === "failed" ? "Meta reported delivery failure" : undefined),
        });
      }
    }
  }

  return normalized;
}

export async function claimDueOutboundQueueJob(
  ctx: Pick<MutationCtx, "db">,
  {
    queueJobId,
    now = Date.now(),
  }: {
    queueJobId?: Id<"outboundQueue">;
    now?: number;
  },
): Promise<ClaimOutboundQueueJobResult> {
  const queueJob = queueJobId
    ? await ctx.db.get(queueJobId)
    : (
        await ctx.db
          .query("outboundQueue")
          .withIndex("by_status_next_attempt_at", (q) => q.eq("status", "queued"))
          .order("asc")
          .take(20)
      ).find((candidate) => candidate.nextAttemptAt <= now) ?? null;

  if (!queueJob) {
    return { status: "noop", reason: "no_due_queue_job" };
  }

  if (queueJob.status !== "queued") {
    return { status: "noop", reason: "queue_job_not_queued" };
  }

  if (queueJob.nextAttemptAt > now) {
    return { status: "noop", reason: "queue_job_not_due" };
  }

  const conversation = await ctx.db.get(queueJob.conversationId);
  if (!conversation) {
    return { status: "failed", reason: "missing_conversation" };
  }

  if (
    (queueJob.requiresOpenServiceWindow ?? true) &&
    !isServiceWindowOpen(conversation.serviceWindowExpiresAt, now)
  ) {
    await ctx.db.patch(queueJob._id, {
      status: "failed",
      failureCode: "service_window_closed_before_send",
      failureMessage: "Service window closed before outbound send.",
      lastAttemptAt: now,
      updatedAt: now,
    });

    const whatsappMessage = await ctx.db.get(queueJob.whatsappMessageId);
    if (whatsappMessage) {
      await ctx.db.patch(whatsappMessage._id, {
        transportStatus: "failed",
        providerStatus: "failed",
        providerStatusAt: now,
        failureCode: "service_window_closed_before_send",
        failureMessage: "Service window closed before outbound send.",
        updatedAt: now,
      });
    }

    const transcriptMessage = await ctx.db.get(queueJob.messageId);
    if (transcriptMessage) {
      await ctx.db.patch(transcriptMessage._id, {
        deliveryState: "failed",
        updatedAt: now,
      });
    }

    await ctx.db.patch(queueJob.conversationId, {
      botReplyState: "blocked",
      botReplyError: "service_window_closed_before_send",
      updatedAt: now,
    });

    return { status: "failed", reason: "service_window_closed_before_send" };
  }

  const transcriptMessage = await ctx.db.get(queueJob.messageId);
  const contact = await ctx.db.get(queueJob.contactId);

  if (!transcriptMessage || !contact) {
    await ctx.db.patch(queueJob._id, {
      status: "failed",
      failureCode: "missing_send_dependencies",
      failureMessage: "Missing transcript message or WhatsApp contact for send.",
      lastAttemptAt: now,
      updatedAt: now,
    });
    return { status: "failed", reason: "missing_send_dependencies" };
  }

  const claimToken = createClaimToken();
  await ctx.db.patch(queueJob._id, {
    status: "processing",
    claimToken,
    failureCode: undefined,
    failureMessage: undefined,
    updatedAt: now,
  });

  return {
    status: "ready",
    queueJobId: queueJob._id,
    conversationId: queueJob.conversationId,
    integrationId: queueJob.integrationId,
    whatsappMessageId: queueJob.whatsappMessageId,
    messageId: queueJob.messageId,
    contactId: queueJob.contactId,
    waId: contact.waId,
    content: transcriptMessage.content,
    idempotencyKey: queueJob.idempotencyKey,
    claimToken,
    payloadType: queueJob.payloadType ?? "text",
    templateId: queueJob.templateId,
    templateName: queueJob.templateName,
    templateLanguageCode: queueJob.templateLanguageCode,
    templateComponents: queueJob.templateComponents,
  };
}

export async function finalizeOutboundSendSuccess(
  ctx: Pick<MutationCtx, "db">,
  {
    queueJobId,
    claimToken,
    providerMessageId,
    providerStatusAt = Date.now(),
  }: {
    queueJobId: Id<"outboundQueue">;
    claimToken: string;
    providerMessageId: string;
    providerStatusAt?: number;
  },
) {
  const queueJob = await ctx.db.get(queueJobId);

  if (
    !queueJob ||
    queueJob.status !== "processing" ||
    queueJob.claimToken !== claimToken
  ) {
    return { status: "noop" as const, reason: "stale_queue_claim" };
  }

  const now = Date.now();
  await ctx.db.patch(queueJobId, {
    status: "sent",
    attemptCount: queueJob.attemptCount + 1,
    providerMessageId,
    claimToken: undefined,
    lastAttemptAt: now,
    nextAttemptAt: now,
    failureCode: undefined,
    failureMessage: undefined,
    updatedAt: now,
  });

  const whatsappMessage = await ctx.db.get(queueJob.whatsappMessageId);
  if (whatsappMessage) {
    await ctx.db.patch(whatsappMessage._id, {
      providerMessageId,
      transportStatus: "sent",
      providerStatus: "sent",
      providerStatusAt,
      failureCode: undefined,
      failureMessage: undefined,
      updatedAt: now,
    });
  }

  const transcriptMessage = await ctx.db.get(queueJob.messageId);
  if (transcriptMessage) {
    await ctx.db.patch(transcriptMessage._id, {
      deliveryState: "sent",
      updatedAt: now,
    });
  }

  const conversation = await ctx.db.get(queueJob.conversationId);
  if (conversation) {
    await ctx.db.patch(conversation._id, {
      botReplyState: "idle",
      botReplyError: undefined,
      updatedAt: now,
    });
  }

  await ctx.db.insert("auditLogs", {
    orgId: queueJob.organizationId,
    action: "outbound_message_sent",
    details: {
      queueJobId,
      providerMessageId,
      messageId: queueJob.messageId,
    },
    createdAt: now,
  });

  return {
    status: "sent" as const,
    providerMessageId,
  };
}

export async function finalizeOutboundSendFailure(
  ctx: OutboundCtx,
  {
    queueJobId,
    claimToken,
    errorCode,
    errorMessage,
    retryable,
  }: {
    queueJobId: Id<"outboundQueue">;
    claimToken: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
  },
) {
  const queueJob = await ctx.db.get(queueJobId);

  if (
    !queueJob ||
    queueJob.status !== "processing" ||
    queueJob.claimToken !== claimToken
  ) {
    return { status: "noop" as const, reason: "stale_queue_claim" };
  }

  const now = Date.now();
  const nextAttemptCount = queueJob.attemptCount + 1;
  const shouldRetry = retryable && nextAttemptCount < queueJob.maxAttempts;

  if (shouldRetry) {
    const nextAttemptAt = now + computeRetryDelayMs(nextAttemptCount);
    await ctx.db.patch(queueJobId, {
      status: "queued",
      attemptCount: nextAttemptCount,
      claimToken: undefined,
      lastAttemptAt: now,
      nextAttemptAt,
      failureCode: errorCode,
      failureMessage: errorMessage,
      updatedAt: now,
    });

    if (ctx.scheduler) {
      await ctx.scheduler.runAfter(
        Math.max(0, nextAttemptAt - now),
        internal.outboundAction.processOutboundQueueJob,
        {
          queueJobId,
        },
      );
    }

    return {
      status: "retry_scheduled" as const,
      nextAttemptAt,
      attemptCount: nextAttemptCount,
    };
  }

  await ctx.db.patch(queueJobId, {
    status: "failed",
    attemptCount: nextAttemptCount,
    claimToken: undefined,
    lastAttemptAt: now,
    nextAttemptAt: now,
    failureCode: errorCode,
    failureMessage: errorMessage,
    updatedAt: now,
  });

  const whatsappMessage = await ctx.db.get(queueJob.whatsappMessageId);
  if (whatsappMessage) {
    await ctx.db.patch(whatsappMessage._id, {
      transportStatus: "failed",
      providerStatus: "failed",
      providerStatusAt: now,
      failureCode: errorCode,
      failureMessage: errorMessage,
      updatedAt: now,
    });
  }

  const transcriptMessage = await ctx.db.get(queueJob.messageId);
  if (transcriptMessage) {
    await ctx.db.patch(transcriptMessage._id, {
      deliveryState: "failed",
      updatedAt: now,
    });
  }

  const conversation = await ctx.db.get(queueJob.conversationId);
  if (conversation) {
    await ctx.db.patch(conversation._id, {
      botReplyState: "failed",
      botReplyError: errorMessage,
      updatedAt: now,
    });
  }

  const notificationId = await upsertOutboundFailureNotification(ctx, {
    organizationId: queueJob.organizationId,
    conversationId: queueJob.conversationId,
    dedupeKey: buildFailureDedupeKey(queueJobId, nextAttemptCount),
    body: errorMessage,
  });

  await ctx.db.insert("auditLogs", {
    orgId: queueJob.organizationId,
    action: "outbound_send_failed",
    details: {
      queueJobId,
      errorCode,
      errorMessage,
      attemptCount: nextAttemptCount,
      notificationId,
    },
    createdAt: now,
  });

  return {
    status: "failed" as const,
    notificationId,
    attemptCount: nextAttemptCount,
  };
}

export async function processWhatsappStatusWebhookEvent(
  ctx: Pick<MutationCtx, "db">,
  webhookEvent: Doc<"whatsappWebhookEvents">,
) {
  const normalizedStatuses = normalizeWhatsappStatusWebhook({
    rawPayload: webhookEvent.rawPayload,
    fallbackReceivedAt: webhookEvent.receivedAt,
  });

  for (const status of normalizedStatuses) {
    const whatsappMessage = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_provider_message_id", (q) =>
        q.eq("providerMessageId", status.providerMessageId),
      )
      .first();

    if (!whatsappMessage) {
      continue;
    }

    await ctx.db.patch(whatsappMessage._id, {
      transportStatus: status.status,
      providerStatus: status.status,
      providerStatusAt: status.timestamp,
      failureCode: status.errorCode,
      failureMessage: status.errorMessage,
      updatedAt: Date.now(),
    });

    const transcriptMessage = await ctx.db.get(whatsappMessage.transcriptMessageId);
    if (transcriptMessage) {
      await ctx.db.patch(transcriptMessage._id, {
        deliveryState: mapStatusToDeliveryState(status.status),
        updatedAt: Date.now(),
      });
    }

    const queueJob = await ctx.db
      .query("outboundQueue")
      .withIndex("by_provider_message_id", (q) =>
        q.eq("providerMessageId", status.providerMessageId),
      )
      .first();

    if (queueJob) {
      await ctx.db.patch(queueJob._id, {
        status: status.status === "failed" ? "failed" : "sent",
        failureCode: status.errorCode,
        failureMessage: status.errorMessage,
        updatedAt: Date.now(),
      });
    }

    const conversation = await ctx.db.get(whatsappMessage.conversationId);
    if (conversation) {
      await ctx.db.patch(conversation._id, {
        botReplyState: status.status === "failed" ? "failed" : "idle",
        botReplyError:
          status.status === "failed" ? status.errorMessage ?? "Meta send failed" : undefined,
        updatedAt: Date.now(),
      });
    }
  }

  await ctx.db.patch(webhookEvent._id, {
    processingStatus: "status_processed",
    updatedAt: Date.now(),
  });

  return {
    processedStatuses: normalizedStatuses.length,
  };
}

export const claimDueOutboundQueueJobMutation = internalMutation({
  args: {
    queueJobId: v.optional(v.id("outboundQueue")),
  },
  handler: async (ctx, args) => claimDueOutboundQueueJob(ctx, args),
});

export const finalizeOutboundSendSuccessMutation = internalMutation({
  args: {
    queueJobId: v.id("outboundQueue"),
    claimToken: v.string(),
    providerMessageId: v.string(),
    providerStatusAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => finalizeOutboundSendSuccess(ctx, args),
});

export const finalizeOutboundSendFailureMutation = internalMutation({
  args: {
    queueJobId: v.id("outboundQueue"),
    claimToken: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
    retryable: v.boolean(),
  },
  handler: async (ctx, args) => finalizeOutboundSendFailure(ctx, args),
});

export const processWhatsappStatusWebhookEventMutation = internalMutation({
  args: {
    eventId: v.id("whatsappWebhookEvents"),
  },
  handler: async (ctx, args) => {
    const webhookEvent = await ctx.db.get(args.eventId);

    if (!webhookEvent) {
      throw new Error("WhatsApp webhook event not found.");
    }

    return processWhatsappStatusWebhookEvent(ctx, webhookEvent);
  },
});
