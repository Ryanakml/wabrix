import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimBotReplyWork,
  finalizeBotReplyDraft,
  flagServiceWindowExpiringSoonNow,
  isServiceWindowOpen,
  markConversationPendingBotReply,
} from "../convex/orchestrator";
import { createBotReplyDraft } from "../convex/orchestratorAction";

type FakeDoc = Record<string, unknown> & { _id: string };

function createFakeDb(initial?: Partial<Record<string, FakeDoc[]>>) {
  const tables: Record<string, FakeDoc[]> = {
    conversations: initial?.conversations ?? [],
    messages: initial?.messages ?? [],
    whatsappContacts: initial?.whatsappContacts ?? [],
    whatsappMessages: initial?.whatsappMessages ?? [],
    outboundQueue: initial?.outboundQueue ?? [],
    dashboardNotifications: initial?.dashboardNotifications ?? [],
    auditLogs: initial?.auditLogs ?? [],
  };
  const scheduled: Array<{
    delayMs: number;
    ref: unknown;
    args: Record<string, unknown>;
  }> = [];

  return {
    tables,
    scheduled,
    query(tableName: string) {
      return {
        withIndex(
          _indexName: string,
          builder: (query: {
            eq: (
              field: string,
              value: unknown,
            ) => {
              clauses: Array<{ field: string; value: unknown }>;
              eq: (
                field: string,
                value: unknown,
              ) => {
                clauses: Array<{ field: string; value: unknown }>;
                eq: never;
              };
            };
          }) => { clauses: Array<{ field: string; value: unknown }> },
        ) {
          const firstClause = (field: string, value: unknown) => {
            const clauses = [{ field, value }];

            return {
              clauses,
              eq(nextField: string, nextValue: unknown) {
                clauses.push({ field: nextField, value: nextValue });
                return {
                  clauses,
                  eq: undefined as never,
                };
              },
            };
          };

          const clauses = builder({ eq: firstClause }).clauses;
          const matches = tables[tableName].filter((doc) =>
            clauses.every((clause) => doc[clause.field] === clause.value),
          );

          return {
            async first() {
              return matches[0] ?? null;
            },
            order(direction: "asc" | "desc" = "asc") {
              const sorted = [...matches].sort(
                (left, right) =>
                  Number(left.createdAt ?? left.lastMessageAt ?? 0) -
                  Number(right.createdAt ?? right.lastMessageAt ?? 0),
              );
              const ordered = direction === "desc" ? sorted.reverse() : sorted;

              return {
                async take(limit: number) {
                  return ordered.slice(0, limit);
                },
                async collect() {
                  return ordered;
                },
              };
            },
          };
        },
      };
    },
    async insert(tableName: string, value: Record<string, unknown>) {
      const _id = `${tableName}_${tables[tableName].length + 1}`;
      const doc = {
        _id,
        _creationTime: Date.now(),
        ...value,
      };
      tables[tableName].push(doc);
      return _id;
    },
    async patch(id: string, patch: Record<string, unknown>) {
      for (const docs of Object.values(tables)) {
        const found = docs.find((doc) => doc._id === id);
        if (found) {
          Object.keys(patch).forEach((key) => {
            if (patch[key] === undefined) {
              delete found[key];
            } else {
              found[key] = patch[key];
            }
          });
          return;
        }
      }
    },
    async get(id: string) {
      for (const docs of Object.values(tables)) {
        const found = docs.find((doc) => doc._id === id);
        if (found) {
          return found;
        }
      }

      return null;
    },
    scheduler: {
      async runAfter(
        delayMs: number,
        ref: unknown,
        args: Record<string, unknown>,
      ) {
        scheduled.push({ delayMs, ref, args });
      },
    },
  };
}

function buildConversation({
  botPaused = false,
  handoffRequested = false,
  serviceWindowExpiresAt = 1_710_000_000_000 + 2 * 60 * 60 * 1000,
  lastInboundAt = 1_710_000_000_000,
  botReplyState = "pending",
}: {
  botPaused?: boolean;
  handoffRequested?: boolean;
  serviceWindowExpiresAt?: number;
  lastInboundAt?: number;
  botReplyState?: string;
} = {}) {
  return {
    _id: "conversation_1",
    organizationId: "org_1",
    channel: "whatsapp",
    contactId: "contact_1",
    status: "open",
    handoffRequested,
    botPaused,
    botReplyState,
    serviceWindowExpiresAt,
    serviceWindowExpiringSoon: false,
    lastMessageAt: lastInboundAt,
    lastInboundAt,
    lastMessagePreview: "halo",
    createdAt: lastInboundAt,
    updatedAt: lastInboundAt,
  };
}

function buildContact() {
  return {
    _id: "contact_1",
    organizationId: "org_1",
    integrationId: "integration_1",
    botId: "bot_1",
    waId: "628111111111",
    profileName: "Ryan",
    lastInboundAt: 1_710_000_000_000,
    serviceWindowExpiresAt: 1_710_000_000_000 + 2 * 60 * 60 * 1000,
    createdAt: 1_710_000_000_000,
    updatedAt: 1_710_000_000_000,
  };
}

describe("phase 8 orchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_710_000_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("open service window allows a bot reply claim", async () => {
    const db = createFakeDb({
      conversations: [buildConversation()],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    expect(
      isServiceWindowOpen(1_710_000_000_000 + 60_000, 1_710_000_000_000),
    ).toBe(true);

    const result = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: 1_710_000_000_000 + 5_000,
    });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.latestUserMessage).toBe("Halo bot");
    }
  });

  it("bot pause prevents reply generation", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({ botPaused: true })],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: 1_710_000_000_000 + 5_000,
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "bot_paused",
    });
  });

  it("human handoff prevents reply generation", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({ handoffRequested: true })],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: 1_710_000_000_000 + 5_000,
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "handoff_requested",
    });
  });

  it("closed service window prevents freeform AI reply", async () => {
    const expiredAt = 1_710_000_000_000 - 60_000;
    const db = createFakeDb({
      conversations: [buildConversation({ serviceWindowExpiresAt: expiredAt })],
      whatsappContacts: [
        {
          ...buildContact(),
          serviceWindowExpiresAt: expiredAt,
        },
      ],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: 1_710_000_000_000,
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "service_window_closed",
    });
  });

  it("flags conversations whose service window is about to expire", async () => {
    const soon = 1_710_000_000_000 + 10 * 60 * 1000;
    const db = createFakeDb({
      conversations: [buildConversation({ serviceWindowExpiresAt: soon })],
      whatsappContacts: [
        {
          ...buildContact(),
          serviceWindowExpiresAt: soon,
        },
      ],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: 1_710_000_000_000,
    });

    expect(db.tables.conversations[0]?.serviceWindowExpiringSoon).toBe(true);
    expect(db.tables.dashboardNotifications).toHaveLength(1);
  });

  it("expiry scheduler creates one dashboard notification", async () => {
    const soon = 1_710_000_000_000 + 10 * 60 * 1000;
    const db = createFakeDb({
      conversations: [buildConversation({ serviceWindowExpiresAt: soon })],
    });

    const result = await flagServiceWindowExpiringSoonNow({ db } as never, {
      conversationId: "conversation_1" as never,
      expectedServiceWindowExpiresAt: soon,
    });

    expect(result.flagged).toBe(true);
    expect(db.tables.dashboardNotifications).toHaveLength(1);
  });

  it("creates one assistant message and one outbound queue job", async () => {
    const db = createFakeDb({
      conversations: [
        {
          ...buildConversation({ botReplyState: "generating" }),
          replyGenerationToken: "token_1",
        },
      ],
      whatsappContacts: [buildContact()],
    });

    const result = await finalizeBotReplyDraft(
      { db, scheduler: db.scheduler } as never,
      {
        conversationId: "conversation_1" as never,
        generationToken: "token_1",
        claimedLastInboundAt: 1_710_000_000_000,
        content: "Halo, ada yang bisa saya bantu?",
      },
    );

    expect(result.status).toBe("queued");
    expect(db.tables.messages).toHaveLength(1);
    expect(db.tables.whatsappMessages).toHaveLength(1);
    expect(db.tables.outboundQueue).toHaveLength(1);
  });

  it("concurrency-safe finalize does not duplicate the AI reply", async () => {
    const db = createFakeDb({
      conversations: [
        {
          ...buildConversation({ botReplyState: "generating" }),
          replyGenerationToken: "token_1",
        },
      ],
      whatsappContacts: [buildContact()],
    });

    const first = await finalizeBotReplyDraft(
      { db, scheduler: db.scheduler } as never,
      {
        conversationId: "conversation_1" as never,
        generationToken: "token_1",
        claimedLastInboundAt: 1_710_000_000_000,
        content: "First reply",
      },
    );
    const second = await finalizeBotReplyDraft(
      { db, scheduler: db.scheduler } as never,
      {
        conversationId: "conversation_1" as never,
        generationToken: "token_1",
        claimedLastInboundAt: 1_710_000_000_000,
        content: "Second reply",
      },
    );

    expect(first.status).toBe("queued");
    expect(second).toEqual({
      status: "noop",
      reason: "stale_generation_token",
    });
    expect(db.tables.messages).toHaveLength(1);
    expect(db.tables.outboundQueue).toHaveLength(1);
  });

  it("debounce coalesces spammy user bursts into one generation pass", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({ botReplyState: "idle" })],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "user",
          source: "whatsapp_inbound",
          content: "Halo bot",
          contentType: "text",
          deliveryState: "received",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const first = await markConversationPendingBotReply(
      { db, scheduler: db.scheduler } as never,
      {
        conversationId: "conversation_1" as never,
        lastInboundAt: 1_710_000_000_000,
        serviceWindowExpiresAt: 1_710_000_000_000 + 2 * 60 * 60 * 1000,
      },
    );

    await db.patch("conversation_1", {
      lastInboundAt: 1_710_000_002_000,
    });

    const second = await markConversationPendingBotReply(
      { db, scheduler: db.scheduler } as never,
      {
        conversationId: "conversation_1" as never,
        lastInboundAt: 1_710_000_002_000,
        serviceWindowExpiresAt: 1_710_000_000_000 + 2 * 60 * 60 * 1000,
      },
    );

    const beforeSecondDebounce = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: (first.debounceUntilAt ?? 0) + 1,
    });
    const afterSecondDebounce = await claimBotReplyWork({ db } as never, {
      conversationId: "conversation_1" as never,
      now: (second.debounceUntilAt ?? 0) + 1,
    });

    expect(db.scheduled).toHaveLength(4);
    expect(beforeSecondDebounce).toEqual({
      status: "debounced",
      reason: "waiting_for_debounce_window",
    });
    expect(afterSecondDebounce.status).toBe("ready");
  });

  it("passes RAG context into the AI draft call", async () => {
    const generateDraft = vi.fn(async () => ({
      content: "Drafted reply",
      selectedProvider: "google" as const,
      selectedModel: "gemini-2.5-flash",
      latencyMs: 50,
      usage: {
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25,
      },
    }));
    const embedQueryTexts = vi.fn(async () => [[1, 0]]);

    await createBotReplyDraft({
      runtimeState: {
        organizationId: "org_1" as never,
        profile: {
          _id: "bot_1" as never,
          defaultLanguage: "id",
          systemPrompt: "Base prompt",
          localizedPromptTemplates: {
            id: "Prompt ID",
          },
        },
        provider: {
          providerType: "google",
          modelId: "gemini-2.5-flash",
          temperature: 0.4,
          maxTokens: 256,
        },
        promptVersionId: "prompt_1",
      },
      latestUserMessage: "Apa jam operasionalnya?",
      history: [],
      knowledgeCorpus: {
        chunks: [
          {
            sourceId: "source_1" as never,
            title: "FAQ",
            text: "Jam operasional kami 09.00-17.00 WIB.",
            embedding: [1, 0],
          },
        ],
      },
      providerApiKey: "api-key",
      embeddingApiKey: "embedding-key",
      generateDraft,
      embedQueryTexts,
    });

    expect(generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        ragContext: [expect.stringContaining("Jam operasional kami")],
      }),
    );
  });
});
