import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { hashSecret } from "./lib/crypto.js";

export type StoredWebhookEventInput = {
  receivedAt: number;
  eventKey: string;
  eventType: string;
  rawPayload: string;
  signatureValid: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  providerEventId?: string;
  mediaDownloadEnqueued: boolean;
  mediaDownloadPriority: "normal" | "high";
  mediaDownloadDeadlineAt?: number;
};

type IntegrationLookup = Pick<
  Doc<"whatsappIntegrations">,
  | "_id"
  | "organizationId"
  | "botId"
  | "phoneNumberId"
  | "businessAccountId"
  | "webhookStatus"
>;

type EventLookup = Pick<
  Doc<"whatsappWebhookEvents">,
  | "_id"
  | "eventKey"
  | "attemptCount"
  | "processingStatus"
  | "mediaDownloadStatus"
>;

export async function requireWebhookEventForOrganization(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  eventId: Id<"whatsappWebhookEvents">,
  organizationId: Id<"organizations">,
) {
  const event = await ctx.db.get(eventId);

  if (!event || event.organizationId !== organizationId) {
    throw new Error("WhatsApp webhook event not found for the active organization.");
  }

  return event;
}

async function findIntegrationByPhoneNumberId(
  ctx: Pick<MutationCtx, "db">,
  phoneNumberId?: string,
) {
  if (!phoneNumberId) {
    return null;
  }

  return (await ctx.db
    .query("whatsappIntegrations")
    .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", phoneNumberId))
    .first()) as IntegrationLookup | null;
}

async function findEventByEventKey(
  ctx: Pick<MutationCtx, "db">,
  eventKey: string,
) {
  return (await ctx.db
    .query("whatsappWebhookEvents")
    .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
    .first()) as EventLookup | null;
}

export async function persistWhatsappWebhookEvent(
  ctx: Pick<MutationCtx, "db">,
  args: StoredWebhookEventInput,
) {
  const existing = await findEventByEventKey(ctx, args.eventKey);
  const integration = await findIntegrationByPhoneNumberId(ctx, args.phoneNumberId);
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      attemptCount: existing.attemptCount + 1,
      lastReceivedAt: args.receivedAt,
      updatedAt: now,
    });

    if (integration) {
      await ctx.db.patch(integration._id, {
        webhookStatus: "receiving",
        lastWebhookEventAt: args.receivedAt,
        updatedAt: now,
      });
    }

    return {
      eventId: existing._id,
      duplicate: true,
      mediaWorkEnqueued: false,
      processingStatus: existing.processingStatus,
    };
  }

  const processingStatus = args.mediaDownloadEnqueued
    ? "media_download_queued"
    : "received";
  const mediaDownloadStatus = args.mediaDownloadEnqueued
    ? "queued"
    : "not_applicable";

  const eventId = await ctx.db.insert("whatsappWebhookEvents", {
    organizationId: integration?.organizationId,
    integrationId: integration?._id,
    botId: integration?.botId,
    phoneNumberId: args.phoneNumberId ?? integration?.phoneNumberId,
    businessAccountId: args.businessAccountId ?? integration?.businessAccountId,
    eventKey: args.eventKey,
    eventType: args.eventType,
    providerEventId: args.providerEventId,
    signatureValid: args.signatureValid,
    processingStatus,
    attemptCount: 1,
    mediaDownloadStatus,
    mediaDownloadPriority: args.mediaDownloadPriority,
    mediaDownloadDeadlineAt: args.mediaDownloadDeadlineAt,
    rawPayload: args.rawPayload,
    receivedAt: args.receivedAt,
    lastReceivedAt: args.receivedAt,
    createdAt: now,
    updatedAt: now,
  });

  if (integration) {
    await ctx.db.patch(integration._id, {
      webhookStatus: "receiving",
      lastWebhookEventAt: args.receivedAt,
      updatedAt: now,
    });
  }

  return {
    eventId,
    duplicate: false,
    mediaWorkEnqueued: args.mediaDownloadEnqueued,
    processingStatus,
  };
}

export async function markWhatsappWebhookVerifiedByToken(
  ctx: Pick<MutationCtx, "db">,
  {
    verifyToken,
    verifiedAt,
  }: {
    verifyToken: string;
    verifiedAt: number;
  },
) {
  const verifyTokenHash = await hashSecret(verifyToken);
  const integration = await ctx.db
    .query("whatsappIntegrations")
    .withIndex("by_verify_token_hash", (q) =>
      q.eq("verifyTokenHash", verifyTokenHash),
    )
    .first();

  if (!integration) {
    return {
      matched: false,
    };
  }

  await ctx.db.patch(integration._id, {
    webhookStatus: "verified",
    lastWebhookVerifiedAt: verifiedAt,
    updatedAt: Date.now(),
  });

  return {
    matched: true,
    integrationId: integration._id,
  };
}

export const storeRawWhatsappEvent = internalMutation({
  args: {
    receivedAt: v.number(),
    eventKey: v.string(),
    eventType: v.string(),
    rawPayload: v.string(),
    signatureValid: v.boolean(),
    phoneNumberId: v.optional(v.string()),
    businessAccountId: v.optional(v.string()),
    providerEventId: v.optional(v.string()),
    mediaDownloadEnqueued: v.boolean(),
    mediaDownloadPriority: v.union(v.literal("normal"), v.literal("high")),
    mediaDownloadDeadlineAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await persistWhatsappWebhookEvent(ctx, args);

    if (!result.duplicate) {
      await ctx.scheduler.runAfter(
        0,
        internal.inbound.processStoredWhatsappWebhookEventMutation,
        {
          eventId: result.eventId,
        },
      );
    }

    return result;
  },
});

export const markWebhookVerified = internalMutation({
  args: {
    verifyToken: v.string(),
    verifiedAt: v.number(),
  },
  handler: async (ctx, args) => markWhatsappWebhookVerifiedByToken(ctx, args),
});
