import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { assertHasRole, requireOrgContext } from "./rbac.js";

function mapKnowledgeSource(source: {
  _id: Id<"knowledgeSources">;
  title: string;
  sourceType: "inline" | "website" | "pdf";
  status: "ready" | "processing" | "failed" | "deferred";
  sourceUrl?: string;
  sourceVendor:
    | "inline"
    | "jina_reader"
    | "firecrawl"
    | "cheerio"
    | "pdf_deferred";
  originalFormat: "markdown" | "html" | "plain_text" | "pdf";
  markdownContent: string;
  chunkCount: number;
  embeddingModel?: string;
  createdAt: number;
}) {
  return {
    id: source._id,
    title: source.title,
    sourceType: source.sourceType,
    status: source.status,
    sourceUrl: source.sourceUrl ?? null,
    sourceVendor: source.sourceVendor,
    originalFormat: source.originalFormat,
    chunkCount: source.chunkCount,
    embeddingModel: source.embeddingModel ?? null,
    previewMarkdown: source.markdownContent.slice(0, 600),
    markdownContent: source.markdownContent,
    createdAt: source.createdAt,
  };
}

export async function requireKnowledgeSourceForOrganization(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  sourceId: Id<"knowledgeSources">,
  organizationId: Id<"organizations">,
) {
  const source = await ctx.db.get(sourceId);

  if (!source || source.organizationId !== organizationId) {
    throw new Error("Knowledge source not found for the active organization.");
  }

  return source;
}

export const getKnowledgeAccessState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const botProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    return {
      ...access,
      botId: botProfile?._id ?? null,
    };
  },
});

export const getKnowledgeBaseState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const botProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const sources = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .collect();
    const usageLogs = await ctx.db
      .query("knowledgeUsageLogs")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(5);

    return {
      role: access.role,
      canManage: access.role === "org:admin",
      botConfigured: Boolean(botProfile),
      sources: sources.map(mapKnowledgeSource),
      recentUsageLogs: usageLogs.map((log) => ({
        id: log._id,
        matchedChunkCount: log.matchedChunkCount,
        queryLanguage: log.queryLanguage,
        retrievalStrategy: log.retrievalStrategy,
        createdAt: log.createdAt,
      })),
    };
  },
});

export const storeKnowledgeSource = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    clerkOrgId: v.string(),
    userId: v.id("users"),
    clerkUserId: v.string(),
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
    errorMessage: v.optional(v.string()),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        text: v.string(),
        embedding: v.array(v.number()),
        tokenEstimate: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sourceId = await ctx.db.insert("knowledgeSources", {
      organizationId: args.organizationId,
      botId: args.botId,
      title: args.title,
      sourceType: args.sourceType,
      status: args.status,
      sourceUrl: args.sourceUrl,
      sourceVendor: args.sourceVendor,
      originalFormat: args.originalFormat,
      markdownContent: args.markdownContent,
      chunkCount: args.chunkCount,
      embeddingModel: args.embeddingModel,
      lastIngestedAt: now,
      errorMessage: args.errorMessage,
      createdAt: now,
      updatedAt: now,
    });

    for (const chunk of args.chunks) {
      await ctx.db.insert("knowledgeChunks", {
        organizationId: args.organizationId,
        botId: args.botId,
        sourceId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: chunk.embedding,
        tokenEstimate: chunk.tokenEstimate,
        createdAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      orgId: args.organizationId,
      clerkOrgId: args.clerkOrgId,
      userId: args.userId,
      clerkUserId: args.clerkUserId,
      action: "knowledge_source_saved",
      details: {
        sourceId,
        title: args.title,
        sourceType: args.sourceType,
        sourceVendor: args.sourceVendor,
        chunkCount: args.chunkCount,
        sourceUrl: args.sourceUrl,
        status: args.status,
      },
      createdAt: now,
    });

    return sourceId;
  },
});

export const deleteKnowledgeSource = mutation({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:admin");
    const source = await requireKnowledgeSourceForOrganization(
      ctx,
      args.sourceId,
      access.organizationId,
    );

    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    await ctx.db.delete(args.sourceId);
    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      clerkOrgId: access.clerkOrgId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "knowledge_source_deleted",
      details: {
        sourceId: args.sourceId,
        title: source.title,
        sourceType: source.sourceType,
      },
      createdAt: Date.now(),
    });

    return { deleted: true };
  },
});

export const getKnowledgeRetrievalCorpus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const botProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    if (!botProfile) {
      return {
        botId: null,
        chunks: [],
      };
    }

    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_bot", (q) => q.eq("botId", botProfile._id))
      .collect();

    const sourcesById = new Map<
      Id<"knowledgeSources">,
      Doc<"knowledgeSources"> | null
    >();
    for (const chunk of chunks) {
      if (!sourcesById.has(chunk.sourceId)) {
        const source = await ctx.db.get(chunk.sourceId);
        sourcesById.set(chunk.sourceId, source);
      }
    }

    return {
      botId: botProfile._id,
      chunks: chunks.flatMap((chunk) => {
        const source = sourcesById.get(chunk.sourceId);
        if (
          !source ||
          source.organizationId !== access.organizationId ||
          source.status !== "ready"
        ) {
          return [];
        }

        return [
          {
            sourceId: chunk.sourceId,
            title: source.title,
            text: chunk.text,
            embedding: chunk.embedding,
          },
        ];
      }),
    };
  },
});

export const logKnowledgeUsage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
    sourceIds: v.array(v.id("knowledgeSources")),
    query: v.string(),
    queryLanguage: v.string(),
    matchedChunkCount: v.number(),
    retrievalStrategy: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("knowledgeUsageLogs", {
      organizationId: args.organizationId,
      botId: args.botId,
      sourceIds: args.sourceIds,
      query: args.query,
      queryLanguage: args.queryLanguage,
      matchedChunkCount: args.matchedChunkCount,
      retrievalStrategy: args.retrievalStrategy,
      createdAt: Date.now(),
    });
  },
});
