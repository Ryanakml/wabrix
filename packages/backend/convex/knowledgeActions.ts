"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { action, type ActionCtx } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { decryptSecret } from "./lib/crypto.js";
import { prepareKnowledgeSourceDraft } from "./lib/knowledge.js";

type KnowledgeActionAccessState = {
  organizationId: Id<"organizations">;
  clerkOrgId: string;
  userId: Id<"users">;
  clerkUserId: string;
  role: string;
  botId: Id<"botProfiles"> | null;
};

type IngestKnowledgeSourceArgs = {
  sourceType: "inline" | "website" | "pdf" | "document";
  title?: string;
  content?: string;
  url?: string;
  storageId?: Id<"_storage">;
  fileName?: string;
  mimeType?: string;
};

type IngestKnowledgeSourceResult = {
  sourceId: Id<"knowledgeSources">;
  title: string;
  chunkCount: number;
  sourceVendor:
    | "inline"
    | "jina_reader"
    | "firecrawl"
    | "cheerio"
    | "pdf_deferred"
    | "markitdown";
  status: "ready" | "deferred";
  pdfDeferred: boolean;
};

async function ingestKnowledgeSourceHandler(
  ctx: ActionCtx,
  args: IngestKnowledgeSourceArgs,
): Promise<IngestKnowledgeSourceResult> {
  const access: KnowledgeActionAccessState = await ctx.runQuery(
    internal.knowledge.getKnowledgeAccessState,
    {},
  );
  if (access.role !== "org:admin") {
    throw new Error(
      `Unauthorized: Requires role org:admin, got ${access.role || "none"}`,
    );
  }

  if (!access.botId) {
    throw new Error("Configure Bot Studio before adding knowledge sources.");
  }

  const runtimeState = await ctx.runQuery(
    internal.configuration.getBotStudioRuntimeState,
    {},
  );
  const providerApiKey = runtimeState?.provider.apiKeyEncrypted
    ? await decryptSecret(runtimeState.provider.apiKeyEncrypted)
    : null;
  
  // Use the provider's API key only if it's a Google provider,
  // otherwise fallback to the system's Google API key for embeddings.
  const embeddingApiKey =
    runtimeState?.provider.providerType === "google" && providerApiKey
      ? providerApiKey
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const sourceDraft = await prepareKnowledgeSourceDraft({
    sourceType: args.sourceType,
    title: args.title,
    content: args.content,
    url: args.url,
    storageId: args.storageId,
    fileName: args.fileName,
    mimeType: args.mimeType,
    storage: ctx.storage,
    embeddingApiKey,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
  });

  const sourceId: Id<"knowledgeSources"> = await ctx.runMutation(
    internal.knowledge.storeKnowledgeSource,
    {
      organizationId: access.organizationId,
      clerkOrgId: access.clerkOrgId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      botId: access.botId,
      title: sourceDraft.title,
      sourceType: sourceDraft.sourceType,
      status: sourceDraft.status,
      sourceUrl: sourceDraft.sourceUrl,
      sourceVendor: sourceDraft.sourceVendor,
      originalFormat: sourceDraft.originalFormat,
      markdownContent: sourceDraft.markdownContent,
      chunkCount: sourceDraft.chunkCount,
      embeddingModel: sourceDraft.embeddingModel,
      errorMessage: sourceDraft.errorMessage,
      chunks: sourceDraft.chunks,
    },
  );

  return {
    sourceId,
    title: sourceDraft.title,
    chunkCount: sourceDraft.chunkCount,
    sourceVendor: sourceDraft.sourceVendor,
    status: sourceDraft.status,
    pdfDeferred: sourceDraft.status === "deferred",
  };
}

export const ingestKnowledgeSource = action({
  args: {
    sourceType: v.union(
      v.literal("inline"),
      v.literal("website"),
      v.literal("pdf"),
      v.literal("document"),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: ingestKnowledgeSourceHandler,
});
