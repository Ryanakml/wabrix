"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { v, ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import { action, type ActionCtx } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { decryptSecret } from "./lib/crypto.js";
import { applyPromptInjectionGuard, detectLanguage } from "./lib/guardrails.js";
import { embedTexts, selectRelevantKnowledgeChunks } from "./lib/knowledge.js";
import {
  buildObservabilityPayload,
  emitObservabilityEvent,
} from "./lib/observability.js";

type DraftHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type GenerateWithPrimaryModelInput = {
  organizationId: Id<"organizations">;
  botId: string;
  conversationId?: string;
  providerApiKey: string;
  selectedModel: string;
  messages: DraftHistoryEntry[];
  systemPrompt: string;
  ragContext: string[];
  timeoutMs: number;
  temperature: number;
  maxTokens: number;
};

type OutputLanguage = "en" | "id";

type RuntimeBotStudioState = {
  organizationId: Id<"organizations">;
  clerkOrgId: string;
  profile: Doc<"botProfiles">;
  provider: Doc<"modelProviderSettings">;
  promptVersionId: string;
} | null;

type PreviewBotReplyArgs = {
  latestUserMessage: string;
  history?: DraftHistoryEntry[];
};

type PreviewBotReplyResult = {
  content: string;
  modelProvider: "google";
  modelId: string;
  outputLanguage: OutputLanguage;
  promptVersionId: string;
  ragContextUsed: boolean;
  ragChunkCount: number;
  knowledgeSourceTitles: string[];
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
};

export function validateDigitalOceanReferenceConfig(config: {
  endpointUrl?: string | null;
  modelId?: string | null;
}) {
  if (!config.endpointUrl && !config.modelId) {
    return { valid: true };
  }

  if (!config.endpointUrl || !config.modelId) {
    throw new Error(
      "DigitalOcean reference config requires both endpointUrl and modelId",
    );
  }

  try {
    const parsed = new URL(config.endpointUrl);
    if (!/^https:$/.test(parsed.protocol)) {
      throw new Error("DigitalOcean reference endpoint must use https");
    }
  } catch {
    throw new Error("DigitalOcean reference endpointUrl must be a valid URL");
  }

  return { valid: true };
}

function buildPrompt(
  systemPrompt: string,
  history: DraftHistoryEntry[],
  latestUserMessage: string,
  ragContext: string[],
  outputLanguage: string,
) {
  const historyText = history
    .map(
      (entry) =>
        `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`,
    )
    .join("\n");

  const ragBlock =
    ragContext.length > 0
      ? `\nRelevant business knowledge:\n${ragContext.join("\n")}`
      : "";

  return [
    systemPrompt,
    `Reply in ${outputLanguage} unless the business policy explicitly requires a different language.`,
    historyText ? `Conversation history:\n${historyText}` : "",
    ragBlock,
    `Latest user message:\n${latestUserMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateWithPrimaryModel(
  input: GenerateWithPrimaryModelInput,
) {
  const provider = createGoogleGenerativeAI({
    apiKey: input.providerApiKey,
  });

  const startedAt = Date.now();
  const result = await generateText({
    model: provider(input.selectedModel),
    prompt: buildPrompt(
      input.systemPrompt,
      input.messages.slice(0, -1),
      input.messages[input.messages.length - 1]?.content ?? "",
      input.ragContext,
      detectLanguage(input.messages[input.messages.length - 1]?.content ?? ""),
    ),
    temperature: input.temperature,
    maxOutputTokens: input.maxTokens,
    abortSignal: AbortSignal.timeout(input.timeoutMs),
  });

  return {
    content: result.text,
    selectedProvider: "google" as const,
    selectedModel: input.selectedModel,
    latencyMs: Date.now() - startedAt,
    usage: {
      promptTokens: result.usage?.inputTokens,
      completionTokens: result.usage?.outputTokens,
      totalTokens: result.usage?.totalTokens,
    },
  };
}

function resolveOutputLanguage(
  preferredLanguage: "auto" | "en" | "id",
  latestUserMessage: string,
): OutputLanguage {
  if (preferredLanguage === "auto") {
    return detectLanguage(latestUserMessage);
  }

  return preferredLanguage;
}

async function previewBotReplyHandler(
  ctx: ActionCtx,
  args: PreviewBotReplyArgs,
): Promise<PreviewBotReplyResult> {
  const runtimeState: RuntimeBotStudioState = await ctx.runQuery(
    internal.configuration.getBotStudioRuntimeState,
    {},
  );

  if (!runtimeState) {
    throw new Error("Bot Studio is not configured for the active organization");
  }

  validateDigitalOceanReferenceConfig({
    endpointUrl: runtimeState.provider.endpointUrl,
    modelId:
      runtimeState.provider.providerType === "digitalocean_reference"
        ? runtimeState.provider.modelId
        : null,
  });

  const decryptedApiKey =
    (await decryptSecret(runtimeState.provider.apiKeyEncrypted)) ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!decryptedApiKey) {
    throw new Error(
      "No Google AI API key is configured. Save an API key in Bot Studio first.",
    );
  }

  const outputLanguage = resolveOutputLanguage(
    runtimeState.profile.defaultLanguage,
    args.latestUserMessage,
  );

  const guardrail = applyPromptInjectionGuard(args.latestUserMessage);
  const sanitizedLatestMessage = guardrail.sanitizedText;
  const knowledgeCorpus = await ctx.runQuery(
    internal.knowledge.getKnowledgeRetrievalCorpus,
    {},
  );
  let knowledgeMatches: ReturnType<typeof selectRelevantKnowledgeChunks> = [];

  if (knowledgeCorpus.chunks.length > 0) {
    const queryEmbeddings = await embedTexts({
      texts: [sanitizedLatestMessage],
      apiKey: decryptedApiKey,
    });
    const queryEmbedding = queryEmbeddings[0];
    if (!queryEmbedding) {
      throw new Error(
        "Knowledge retrieval could not generate a query embedding.",
      );
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

  await ctx.runMutation(internal.knowledge.logKnowledgeUsage, {
    organizationId: runtimeState.organizationId,
    botId: runtimeState.profile._id,
    sourceIds: matchedSourceIds,
    query: sanitizedLatestMessage,
    queryLanguage: outputLanguage,
    matchedChunkCount: knowledgeMatches.length,
    retrievalStrategy: "cosine_similarity_gemini_embedding_001",
  });

  const draft = await generateWithPrimaryModel({
    organizationId: runtimeState.organizationId,
    botId: runtimeState.profile._id.toString(),
    providerApiKey: decryptedApiKey,
    selectedModel: runtimeState.provider.modelId,
    messages: [
      ...(args.history ?? []),
      { role: "user", content: sanitizedLatestMessage },
    ],
    systemPrompt:
      runtimeState.profile.localizedPromptTemplates[outputLanguage] ??
      runtimeState.profile.systemPrompt,
    ragContext,
    timeoutMs: 8_000,
    temperature: runtimeState.provider.temperature,
    maxTokens: runtimeState.provider.maxTokens,
  });

  await ctx.runMutation(internal.configuration.logAiRun, {
    botId: runtimeState.profile._id,
    promptVersionId: runtimeState.promptVersionId,
    selectedProvider: draft.selectedProvider,
    selectedModel: draft.selectedModel,
    outputLanguage,
    attempts: [
      {
        provider: draft.selectedProvider,
        model: draft.selectedModel,
        status: "success",
        latencyMs: draft.latencyMs,
      },
    ],
    ragContextUsed: knowledgeMatches.length > 0,
    ragChunkCount: knowledgeMatches.length,
    promptTokens: draft.usage?.promptTokens,
    completionTokens: draft.usage?.completionTokens,
    totalTokens: draft.usage?.totalTokens,
    estimatedCostUsd: undefined,
    guardrailTriggered: guardrail.flagged,
    guardrailCategory: guardrail.flagged ? guardrail.category : undefined,
  });

  const observabilityPayload = buildObservabilityPayload({
    organizationId: runtimeState.organizationId,
    provider: draft.selectedProvider,
    model: draft.selectedModel,
    promptVersionId: runtimeState.promptVersionId,
    guardrailTriggered: guardrail.flagged,
    ragChunkCount: knowledgeMatches.length,
    promptPreview: sanitizedLatestMessage,
    responsePreview: draft.content,
  });
  await emitObservabilityEvent({
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
    modelProvider: draft.selectedProvider,
    modelId: draft.selectedModel,
    outputLanguage,
    promptVersionId: runtimeState.promptVersionId,
    ragContextUsed: knowledgeMatches.length > 0,
    ragChunkCount: knowledgeMatches.length,
    knowledgeSourceTitles,
    usage: draft.usage,
    guardrail: {
      flagged: guardrail.flagged,
      category: guardrail.category,
      confidence: guardrail.confidence,
    },
    observability: observabilityPayload,
  };
}

export const previewBotReply = action({
  args: {
    latestUserMessage: v.string(),
    history: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    try {
      return await previewBotReplyHandler(ctx, args);
    } catch (e) {
      throw new ConvexError(e instanceof Error ? e.message : String(e));
    }
  },
});
