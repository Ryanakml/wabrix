import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { encryptSecret } from "./lib/crypto.js";
import {
  backendDefaultBotName,
  backendDefaultPromptTemplates,
} from "./lib/defaults.js";
import { assertHasRole, requireOrgContext } from "./rbac.js";

const localizedPromptTemplatesValidator = v.object({
  en: v.optional(v.string()),
  id: v.optional(v.string()),
});

const providerTypeValidator = v.union(
  v.literal("google"),
  v.literal("digitalocean_reference"),
);

const defaultLanguageValidator = v.union(
  v.literal("auto"),
  v.literal("en"),
  v.literal("id"),
);

const historyEntryValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

function buildFallbackState() {
  return {
    name: backendDefaultBotName,
    defaultLanguage: "auto" as const,
    systemPrompt: backendDefaultPromptTemplates.id,
    localizedPromptTemplates: {
      en: backendDefaultPromptTemplates.en,
      id: backendDefaultPromptTemplates.id,
    },
    providerType: "google" as const,
    modelId: "gemini-2.5-flash",
    endpointUrl: null,
    temperature: 0.4,
    maxTokens: 512,
    hasApiKey: false,
    escalationEnabled: true,
    escalationMessage:
      "If the user needs a human agent, collect the key details and offer handoff.",
  };
}

export const getBotStudioState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const fallback = buildFallbackState();

    const profile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const provider = await ctx.db
      .query("modelProviderSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const recentRuns = await ctx.db
      .query("aiRuns")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(5);

    return {
      role: access.role,
      canManage: access.role === "org:admin",
      state: {
        name: profile?.name ?? fallback.name,
        defaultLanguage: profile?.defaultLanguage ?? fallback.defaultLanguage,
        systemPrompt: profile?.systemPrompt ?? fallback.systemPrompt,
        localizedPromptTemplates: {
          en:
            profile?.localizedPromptTemplates.en ??
            fallback.localizedPromptTemplates.en,
          id:
            profile?.localizedPromptTemplates.id ??
            fallback.localizedPromptTemplates.id,
        },
        providerType: provider?.providerType ?? fallback.providerType,
        modelId: provider?.modelId ?? fallback.modelId,
        endpointUrl: provider?.endpointUrl ?? fallback.endpointUrl,
        temperature: provider?.temperature ?? fallback.temperature,
        maxTokens: provider?.maxTokens ?? fallback.maxTokens,
        hasApiKey: Boolean(provider?.apiKeyEncrypted),
        escalationEnabled:
          profile?.escalationSettings.enabled ?? fallback.escalationEnabled,
        escalationMessage:
          profile?.escalationSettings.handoffMessage ??
          fallback.escalationMessage,
      },
      defaultTemplates: backendDefaultPromptTemplates,
      recentRuns: recentRuns.map((run) => ({
        id: run._id,
        selectedProvider: run.selectedProvider,
        selectedModel: run.selectedModel,
        outputLanguage: run.outputLanguage,
        totalTokens: run.totalTokens ?? null,
        guardrailTriggered: run.guardrailTriggered,
        createdAt: run.createdAt,
      })),
    };
  },
});

export const getBotStudioRuntimeState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const profile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const provider = await ctx.db
      .query("modelProviderSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    if (!profile || !provider) {
      return null;
    }

    const promptVersions = await ctx.db
      .query("promptVersions")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(1);

    return {
      organizationId: access.organizationId,
      clerkOrgId: access.clerkOrgId,
      profile,
      provider,
      promptVersionId: String(
        promptVersions[0]?._id ?? `unsaved-${profile._id.toString()}`,
      ),
    };
  },
});

export const getBotStudioRuntimeStateForOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.botId);

    if (!profile || profile.organizationId !== args.organizationId) {
      return null;
    }

    const provider = await ctx.db
      .query("modelProviderSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!provider) {
      return null;
    }

    const promptVersions = await ctx.db
      .query("promptVersions")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(1);

    return {
      organizationId: args.organizationId,
      clerkOrgId: "",
      profile,
      provider,
      promptVersionId: String(
        promptVersions[0]?._id ?? `unsaved-${profile._id.toString()}`,
      ),
    };
  },
});

export const saveBotStudioState = mutation({
  args: {
    name: v.string(),
    defaultLanguage: defaultLanguageValidator,
    systemPrompt: v.string(),
    localizedPromptTemplates: localizedPromptTemplatesValidator,
    providerType: providerTypeValidator,
    modelId: v.string(),
    endpointUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    temperature: v.number(),
    maxTokens: v.number(),
    escalationEnabled: v.boolean(),
    escalationMessage: v.optional(v.string()),
    emulatorHistory: v.optional(v.array(historyEntryValidator)),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:admin");
    const now = Date.now();

    if (!args.modelId || args.modelId.trim() === "") {
      throw new Error("Validation Error: modelId is required.");
    }

    if (
      args.providerType === "digitalocean_reference" &&
      (!args.endpointUrl || args.endpointUrl.trim() === "")
    ) {
      throw new Error(
        "Validation Error: Endpoint URL is required when using DigitalOcean Reference.",
      );
    }

    const existingProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const existingProvider = await ctx.db
      .query("modelProviderSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    const encryptedApiKey =
      args.apiKey && args.apiKey.trim().length > 0
        ? await encryptSecret(args.apiKey.trim())
        : existingProvider?.apiKeyEncrypted;

    const profileId = existingProfile
      ? existingProfile._id
      : await ctx.db.insert("botProfiles", {
          organizationId: access.organizationId,
          name: args.name,
          defaultLanguage: args.defaultLanguage,
          systemPrompt: args.systemPrompt,
          localizedPromptTemplates: args.localizedPromptTemplates,
          modelPolicy: { primaryModel: args.modelId },
          escalationSettings: {
            enabled: args.escalationEnabled,
            handoffMessage: args.escalationMessage,
          },
          createdAt: now,
          updatedAt: now,
        });

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        name: args.name,
        defaultLanguage: args.defaultLanguage,
        systemPrompt: args.systemPrompt,
        localizedPromptTemplates: args.localizedPromptTemplates,
        modelPolicy: { primaryModel: args.modelId },
        escalationSettings: {
          enabled: args.escalationEnabled,
          handoffMessage: args.escalationMessage,
        },
        updatedAt: now,
      });
    }

    if (existingProvider) {
      await ctx.db.patch(existingProvider._id, {
        providerType: args.providerType,
        modelId: args.modelId,
        endpointUrl: args.endpointUrl,
        apiKeyEncrypted: encryptedApiKey,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("modelProviderSettings", {
        organizationId: access.organizationId,
        providerType: args.providerType,
        modelId: args.modelId,
        endpointUrl: args.endpointUrl,
        apiKeyEncrypted: encryptedApiKey,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const promptVersionId = await ctx.db.insert("promptVersions", {
      organizationId: access.organizationId,
      botId: profileId,
      systemPrompt: args.systemPrompt,
      localizedPromptTemplates: args.localizedPromptTemplates,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      clerkOrgId: access.clerkOrgId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "bot_profile_saved",
      details: {
        providerType: args.providerType,
        modelId: args.modelId,
        defaultLanguage: args.defaultLanguage,
        apiKeyUpdated: Boolean(args.apiKey),
        emulatorHistoryLength: args.emulatorHistory?.length ?? 0,
      },
      createdAt: now,
    });

    return {
      botId: profileId,
      promptVersionId,
      hasApiKey: Boolean(encryptedApiKey),
    };
  },
});

export const logAiRun = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const botProfile = await ctx.db.get(args.botId);

    if (!botProfile) {
      throw new Error("Cannot log AI run for missing bot profile");
    }

    return ctx.db.insert("aiRuns", {
      organizationId: botProfile.organizationId,
      botId: args.botId,
      promptVersionId: args.promptVersionId,
      selectedProvider: args.selectedProvider,
      selectedModel: args.selectedModel,
      outputLanguage: args.outputLanguage,
      attempts: args.attempts,
      ragContextUsed: args.ragContextUsed,
      ragChunkCount: args.ragChunkCount,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      guardrailTriggered: args.guardrailTriggered,
      guardrailCategory: args.guardrailCategory,
      createdAt: Date.now(),
    });
  },
});
