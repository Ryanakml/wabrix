import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server.js";

function truncate(value: string, maxLength = 4_000) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function buildTranscriptMessageContent(args: {
  mediaType: "audio" | "image" | "document";
  transcript?: string;
  summary?: string;
  extractedText?: string;
  fallbackContent: string;
}) {
  if (args.mediaType === "audio" && args.transcript?.trim()) {
    return truncate(`[Voice note transcript]: ${args.transcript.trim()}`);
  }

  if (args.mediaType === "image" && args.summary?.trim()) {
    return truncate(`[Image summary]: ${args.summary.trim()}`);
  }

  if (args.mediaType === "document") {
    if (args.extractedText?.trim()) {
      return truncate(`[Document text]: ${args.extractedText.trim()}`);
    }

    if (args.summary?.trim()) {
      return truncate(`[Document summary]: ${args.summary.trim()}`);
    }
  }

  return args.fallbackContent;
}

export const getQueuedWhatsappMediaRuntime = internalQuery({
  args: {
    mediaId: v.id("whatsappMedia"),
  },
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);

    if (!media) {
      return null;
    }

    const integration = await ctx.db.get(media.integrationId);
    const transcriptMessage = await ctx.db.get(media.transcriptMessageId);
    const contact = await ctx.db.get(media.contactId);

    if (!integration || !transcriptMessage || !contact) {
      return null;
    }

    return {
      mediaId: media._id,
      organizationId: media.organizationId,
      integrationId: media.integrationId,
      phoneNumberId: integration.phoneNumberId,
      accessTokenEncrypted: integration.accessTokenEncrypted,
      providerMediaId: media.providerMediaId,
      providerMessageId: media.providerMessageId,
      mediaType: media.mediaType,
      downloadDeadlineAt: media.downloadDeadlineAt,
      transcriptMessageId: media.transcriptMessageId,
      transcriptFallbackContent: transcriptMessage.content,
      fileName: media.fileName,
      contactWaId: contact.waId,
    };
  },
});

export const applyProcessedWhatsappMediaMutation = internalMutation({
  args: {
    mediaId: v.id("whatsappMedia"),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSizeBytes: v.optional(v.number()),
    storageObjectKey: v.optional(v.string()),
    storageProvider: v.optional(v.string()),
    mediaSha256: v.optional(v.string()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    storageConfigured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);

    if (!media) {
      return { status: "noop" as const, reason: "missing_media" };
    }

    const now = Date.now();
    const transcriptMessage = await ctx.db.get(media.transcriptMessageId);
    const nextContent = transcriptMessage
      ? buildTranscriptMessageContent({
          mediaType: media.mediaType,
          transcript: args.transcript,
          summary: args.summary,
          extractedText: args.extractedText,
          fallbackContent: transcriptMessage.content,
        })
      : undefined;

    await ctx.db.patch(media._id, {
      mimeType: args.mimeType,
      fileName: args.fileName,
      fileSizeBytes: args.fileSizeBytes,
      storageObjectKey: args.storageObjectKey,
      storageProvider: args.storageProvider,
      mediaSha256: args.mediaSha256,
      transcript: args.transcript,
      summary: args.summary,
      extractedText: args.extractedText,
      downloadStatus: "downloaded",
      transcriptStatus:
        media.mediaType === "audio"
          ? args.transcript?.trim()
            ? "processed"
            : "failed"
          : "not_applicable",
      summaryStatus:
        media.mediaType === "image" || media.mediaType === "document"
          ? args.summary?.trim() || args.extractedText?.trim()
            ? "processed"
            : "failed"
          : "not_applicable",
      storageStatus:
        media.mediaType === "image" || media.mediaType === "document"
          ? args.storageObjectKey
            ? "stored"
            : args.storageConfigured
              ? "failed"
              : "not_configured"
          : "not_applicable",
      processingStatus: "processed",
      lastError: undefined,
      updatedAt: now,
    });

    if (transcriptMessage && nextContent) {
      await ctx.db.patch(transcriptMessage._id, {
        content: nextContent,
        whatsappMediaId: media._id,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      orgId: media.organizationId,
      action: "whatsapp_media_processed",
      details: {
        mediaId: media._id,
        mediaType: media.mediaType,
        storageObjectKey: args.storageObjectKey,
      },
      createdAt: now,
    });

    return { status: "processed" as const };
  },
});

export const applyFailedWhatsappMediaMutation = internalMutation({
  args: {
    mediaId: v.id("whatsappMedia"),
    error: v.string(),
    expired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);

    if (!media) {
      return { status: "noop" as const, reason: "missing_media" };
    }

    const now = Date.now();
    await ctx.db.patch(media._id, {
      downloadStatus: args.expired ? "expired" : "failed",
      transcriptStatus:
        media.transcriptStatus === "queued" || media.transcriptStatus === "processing"
          ? "failed"
          : media.transcriptStatus,
      summaryStatus:
        media.summaryStatus === "queued" || media.summaryStatus === "processing"
          ? "failed"
          : media.summaryStatus,
      storageStatus:
        media.storageStatus === "queued" || media.storageStatus === "uploading"
          ? "failed"
          : media.storageStatus,
      processingStatus: "failed",
      lastError: args.error,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: media.organizationId,
      action: "whatsapp_media_processing_failed",
      details: {
        mediaId: media._id,
        mediaType: media.mediaType,
        expired: args.expired,
        error: args.error,
      },
      createdAt: now,
    });

    return { status: "failed" as const };
  },
});
