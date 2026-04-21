"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import type { ActionCtx } from "./_generated/server.js";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  generateWithPrimaryModel,
  validateDigitalOceanReferenceConfig,
} from "./ai.js";
import type { ClaimBotReplyWorkResult } from "./orchestrator.js";
import { decryptSecret } from "./lib/crypto.js";
import {
  applyPromptInjectionGuard,
  detectLanguage,
} from "./lib/guardrails.js";
import {
  embedTexts,
  selectRelevantKnowledgeChunks,
} from "./lib/knowledge.js";
import {
  buildObservabilityPayload,
  emitObservabilityEvent,
} from "./lib/observability.js";

type DraftHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type RuntimeState = {
  organizationId: Id<"organizations">;
  profile: {
    _id: Id<"botProfiles">;
    defaultLanguage: "auto" | "en" | "id";
    systemPrompt: string;
    localizedPromptTemplates: {
      en?: string;
      id?: string;
    };
  };
  provider: {
    providerType: "google" | "digitalocean_reference";
    modelId: string;
    endpointUrl?: string;
    apiKeyEncrypted?: string;
    temperature: number;
    maxTokens: number;
  };
  promptVersionId: string;
};

type KnowledgeCorpus = {
  chunks: Array<{
    sourceId: Id<"knowledgeSources">;
    title: string;
    text: string;
    embedding: number[];
  }>;
};

type CreateBotReplyDraftResult = {
  content: string;
  outputLanguage: "en" | "id";
  selectedProvider: "google" | "digitalocean_reference";
  selectedModel: string;
  ragContextUsed: boolean;
  ragChunkCount: number;
  knowledgeSourceTitles: string[];
  promptVersionId: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  guardrail: {
    flagged: boolean;
    category: "prompt_injection" | "clean";
    confidence: number;
  };
  observability: ReturnType<typeof buildObservabilityPayload>;
  matchedSourceIds: Id<"knowledgeSources">[];
  sanitizedLatestMessage: string;
};

function resolveOutputLanguage(
  preferredLanguage: "auto" | "en" | "id",
  latestUserMessage: string,
): "en" | "id" {
  if (preferredLanguage === "auto") {
    return detectLanguage(latestUserMessage);
  }

  return preferredLanguage;
}

export async function createBotReplyDraft({
  runtimeState,
  latestUserMessage,
  history,
  knowledgeCorpus,
  providerApiKey,
  embeddingApiKey,
  generateDraft = generateWithPrimaryModel,
  embedQueryTexts = embedTexts,
}: {
  runtimeState: RuntimeState;
  latestUserMessage: string;
  history: DraftHistoryEntry[];
  knowledgeCorpus: KnowledgeCorpus;
  providerApiKey: string;
  embeddingApiKey?: string;
  generateDraft?: typeof generateWithPrimaryModel;
  embedQueryTexts?: typeof embedTexts;
}): Promise<CreateBotReplyDraftResult> {
  validateDigitalOceanReferenceConfig({
    endpointUrl: runtimeState.provider.endpointUrl,
    modelId:
      runtimeState.provider.providerType === "digitalocean_reference"
        ? runtimeState.provider.modelId
        : null,
  });

  const outputLanguage = resolveOutputLanguage(
    runtimeState.profile.defaultLanguage,
    latestUserMessage,
  );
  const guardrail = applyPromptInjectionGuard(latestUserMessage);
  const sanitizedLatestMessage = guardrail.sanitizedText;
  let knowledgeMatches: ReturnType<typeof selectRelevantKnowledgeChunks> = [];

  if (knowledgeCorpus.chunks.length > 0) {
    if (!embeddingApiKey) {
      throw new Error("Knowledge retrieval requires a Google AI API key. Please configure GOOGLE_GENERATIVE_AI_API_KEY in the environment.");
    }
    const queryEmbeddings = await embedQueryTexts({
      texts: [sanitizedLatestMessage],
      apiKey: embeddingApiKey,
    });
    const queryEmbedding = queryEmbeddings[0];
    if (!queryEmbedding) {
      throw new Error("Knowledge retrieval could not generate a query embedding.");
    }

    knowledgeMatches = selectRelevantKnowledgeChunks(
      queryEmbedding,
      knowledgeCorpus.chunks,
      {
        topK: 4,
        minimumScore: 0.2,
      },
    );
  }

  const ragContext = knowledgeMatches.map(
    (match) => `Source: ${match.title}\n${match.text}`,
  );
  const matchedSourceIds = [
    ...new Set(
      knowledgeMatches.map((match) => match.sourceId as Id<"knowledgeSources">),
    ),
  ];
  const knowledgeSourceTitles = [
    ...new Set(knowledgeMatches.map((match) => match.title)),
  ];

  const draft = await generateDraft({
    organizationId: runtimeState.organizationId,
    botId: runtimeState.profile._id.toString(),
    providerType: runtimeState.provider.providerType as "google" | "digitalocean_reference",
    endpointUrl: runtimeState.provider.endpointUrl,
    providerApiKey,
    selectedModel: runtimeState.provider.modelId,
    messages: [...history, { role: "user", content: sanitizedLatestMessage }],
    systemPrompt:
      runtimeState.profile.localizedPromptTemplates[outputLanguage] ??
      runtimeState.profile.systemPrompt,
    ragContext,
    timeoutMs: 15_000,
    temperature: runtimeState.provider.temperature,
    maxTokens: runtimeState.provider.maxTokens,
  });

  const observability = buildObservabilityPayload({
    organizationId: runtimeState.organizationId,
    provider: draft.selectedProvider,
    model: draft.selectedModel,
    promptVersionId: runtimeState.promptVersionId,
    guardrailTriggered: guardrail.flagged,
    ragChunkCount: knowledgeMatches.length,
    promptPreview: sanitizedLatestMessage,
    responsePreview: draft.content,
  });

  return {
    content: draft.content,
    outputLanguage,
    selectedProvider: draft.selectedProvider,
    selectedModel: draft.selectedModel,
    ragContextUsed: knowledgeMatches.length > 0,
    ragChunkCount: knowledgeMatches.length,
    knowledgeSourceTitles,
    promptVersionId: runtimeState.promptVersionId,
    usage: draft.usage,
    guardrail: {
      flagged: guardrail.flagged,
      category: guardrail.category,
      confidence: guardrail.confidence,
    },
    observability,
    matchedSourceIds,
    sanitizedLatestMessage,
  };
}

async function runBotReplyOrchestratorHandler(
  ctx: ActionCtx,
  args: {
    conversationId: Id<"conversations">;
  },
): Promise<unknown> {
  const claim = (await ctx.runMutation(
      internal.orchestrator.claimBotReplyWorkMutation,
      {
        conversationId: args.conversationId,
      },
    )) as ClaimBotReplyWorkResult;

  if (claim.status !== "ready") {
    return claim;
  }

  let runtimeState: RuntimeState | null = null;

  try {
    runtimeState = await ctx.runQuery(
      internal.configuration.getBotStudioRuntimeStateForOrganization,
      {
        organizationId: claim.organizationId,
        botId: claim.botId,
      },
    );

    if (!runtimeState) {
      throw new Error("Bot Studio runtime is not configured for this conversation.");
    }

    const fallbackGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const isGoogleProvider = runtimeState.provider.providerType === "google";

    const providerApiKey =
      (await decryptSecret(runtimeState.provider.apiKeyEncrypted)) ??
      (isGoogleProvider ? fallbackGoogleKey : undefined);

    if (!providerApiKey) {
      throw new Error(
        "No API key is configured for the selected model provider. Save an API key in Bot Studio first.",
      );
    }

    const embeddingApiKey = isGoogleProvider ? providerApiKey : fallbackGoogleKey;

    const knowledgeCorpus = await ctx.runQuery(
      internal.knowledge.getKnowledgeRetrievalCorpusForOrganization,
      {
        organizationId: claim.organizationId,
        botId: claim.botId,
      },
    );

    const draft = await createBotReplyDraft({
      runtimeState,
      latestUserMessage: claim.latestUserMessage,
      history: claim.history,
      knowledgeCorpus,
      providerApiKey,
      embeddingApiKey,
    });

    await ctx.runMutation(internal.knowledge.logKnowledgeUsage, {
      organizationId: claim.organizationId,
      botId: claim.botId,
      sourceIds: draft.matchedSourceIds,
      query: draft.sanitizedLatestMessage,
      queryLanguage: draft.outputLanguage,
      matchedChunkCount: draft.ragChunkCount,
      retrievalStrategy: "cosine_similarity_gemini_embedding_001",
    });

    await ctx.runMutation(internal.configuration.logAiRun, {
      botId: claim.botId,
      promptVersionId: draft.promptVersionId,
      selectedProvider: draft.selectedProvider,
      selectedModel: draft.selectedModel,
      outputLanguage: draft.outputLanguage,
      attempts: [
        {
          provider: draft.selectedProvider,
          model: draft.selectedModel,
          status: "success",
        },
      ],
      ragContextUsed: draft.ragContextUsed,
      ragChunkCount: draft.ragChunkCount,
      promptTokens: draft.usage.promptTokens,
      completionTokens: draft.usage.completionTokens,
      totalTokens: draft.usage.totalTokens,
      estimatedCostUsd: undefined,
      guardrailTriggered: draft.guardrail.flagged,
      guardrailCategory: draft.guardrail.flagged
        ? draft.guardrail.category
        : undefined,
    });

    await emitObservabilityEvent({
      organizationId: claim.organizationId,
      provider: draft.selectedProvider,
      model: draft.selectedModel,
      promptVersionId: draft.promptVersionId,
      guardrailTriggered: draft.guardrail.flagged,
      ragChunkCount: draft.ragChunkCount,
      promptPreview: draft.sanitizedLatestMessage,
      responsePreview: draft.content,
    });

    return ctx.runMutation(internal.orchestrator.finalizeBotReplyDraftMutation, {
      conversationId: claim.conversationId,
      generationToken: claim.generationToken,
      claimedLastInboundAt: claim.claimedLastInboundAt,
      content: draft.content,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown bot reply generation error";

    if (runtimeState) {
      await ctx.runMutation(internal.configuration.logAiRun, {
        botId: claim.botId,
        promptVersionId: runtimeState.promptVersionId,
        selectedProvider: "google",
        selectedModel: runtimeState.provider.modelId,
        outputLanguage: "id",
        attempts: [
          {
            provider: "google",
            model: runtimeState.provider.modelId,
            status: "failed",
            errorCode: "bot_reply_generation_failed",
          },
        ],
        ragContextUsed: false,
        ragChunkCount: 0,
        estimatedCostUsd: undefined,
        guardrailTriggered: false,
      });
    }

    await ctx.runMutation(internal.orchestrator.markBotReplyFailureMutation, {
      conversationId: claim.conversationId,
      generationToken: claim.generationToken,
      claimedLastInboundAt: claim.claimedLastInboundAt,
      errorMessage,
    });

    return {
      status: "failed",
      reason: errorMessage,
    };
  }
}

export const runBotReplyOrchestrator = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: runBotReplyOrchestratorHandler,
});
