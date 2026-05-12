import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimDueOutboundQueueJob,
  classifyMetaSendFailure,
  computeRetryDelayMs,
  finalizeOutboundSendFailure,
  finalizeOutboundSendSuccess,
  normalizeWhatsappStatusWebhook,
  processWhatsappStatusWebhookEvent,
} from "../convex/outbound";
import { finalizeBotReplyDraft } from "../convex/orchestrator";
import {
  sanitizeTemplateSendComponents,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "../convex/outboundAction";

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
    whatsappWebhookEvents: initial?.whatsappWebhookEvents ?? [],
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
          indexName: string,
          builder: (query: {
            eq: (field: string, value: unknown) => {
              clauses: Array<{ field: string; value: unknown }>;
              eq: (field: string, value: unknown) => {
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
                  Number(left.nextAttemptAt ?? left.createdAt ?? 0) -
                  Number(right.nextAttemptAt ?? right.createdAt ?? 0),
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
      tables[tableName].push({
        _id,
        _creationTime: Date.now(),
        ...value,
      });
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
      async runAfter(delayMs: number, ref: unknown, args: Record<string, unknown>) {
        scheduled.push({ delayMs, ref, args });
      },
    },
  };
}

function buildConversation({
  serviceWindowExpiresAt = 1_710_000_000_000 + 2 * 60 * 60 * 1000,
}: {
  serviceWindowExpiresAt?: number;
} = {}) {
  return {
    _id: "conversation_1",
    organizationId: "org_1",
    channel: "whatsapp",
    contactId: "contact_1",
    status: "open",
    handoffRequested: false,
    botPaused: false,
    botReplyState: "generating",
    serviceWindowExpiresAt,
    serviceWindowExpiringSoon: false,
    lastMessageAt: 1_710_000_000_000,
    lastInboundAt: 1_710_000_000_000,
    lastMessagePreview: "halo",
    createdAt: 1_710_000_000_000,
    updatedAt: 1_710_000_000_000,
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(1_710_000_000_000));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("phase 9 outbound sender", () => {
  it("successful send marks the queue job sent and stores the provider id", async () => {
    const db = createFakeDb({
      conversations: [buildConversation()],
      whatsappContacts: [buildContact()],
    });

    const queued = await finalizeBotReplyDraft({ db, scheduler: db.scheduler } as never, {
      conversationId: "conversation_1" as never,
      generationToken: undefined as never,
      claimedLastInboundAt: 1_710_000_000_000,
      content: "Halo dari bot",
    });

    // Seed the claimable state directly for this phase-9 test.
    await db.patch("conversation_1", {
      botReplyState: "idle",
      replyGenerationToken: undefined,
    });

    const queueJob = db.tables.outboundQueue[0];
    expect(queued.status).toBe("queued");

    const claim = await claimDueOutboundQueueJob({ db } as never, {
      queueJobId: queueJob?._id as never,
      now: 1_710_000_000_000,
    });

    expect(claim.status).toBe("ready");
    if (claim.status !== "ready") {
      return;
    }

    const result = await finalizeOutboundSendSuccess({ db } as never, {
      queueJobId: claim.queueJobId,
      claimToken: claim.claimToken,
      providerMessageId: "wamid.outbound.123",
      providerStatusAt: 1_710_000_001_000,
    });

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "wamid.outbound.123",
    });
    expect(db.tables.outboundQueue[0]).toEqual(
      expect.objectContaining({
        status: "sent",
        providerMessageId: "wamid.outbound.123",
        attemptCount: 1,
      }),
    );
    expect(db.tables.whatsappMessages[0]).toEqual(
      expect.objectContaining({
        providerMessageId: "wamid.outbound.123",
        transportStatus: "sent",
      }),
    );
  });

  it("retryable error schedules retry and reuses the same idempotency key", async () => {
    const db = createFakeDb({
      conversations: [
        {
          ...buildConversation(),
          botReplyState: "idle",
        },
      ],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "queued",
          transportMessageId: "whatsapp_message_1",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappMessages: [
        {
          _id: "whatsapp_message_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          transcriptMessageId: "message_1",
          providerMessageId: "queued:message_1",
          waId: "628111111111",
          direction: "outbound",
          messageType: "text",
          transportStatus: "queued",
          rawSummary: "Halo dari bot",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "queued",
          attemptCount: 0,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const claim = await claimDueOutboundQueueJob({ db } as never, {
      queueJobId: "queue_1" as never,
      now: 1_710_000_000_000,
    });
    expect(claim.status).toBe("ready");
    if (claim.status !== "ready") {
      return;
    }

    const result = await finalizeOutboundSendFailure(
      { db, scheduler: db.scheduler } as never,
      {
        queueJobId: claim.queueJobId,
        claimToken: claim.claimToken,
        errorCode: "429",
        errorMessage: "rate limited",
        retryable: true,
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "retry_scheduled",
        attemptCount: 1,
      }),
    );
    expect(db.tables.outboundQueue[0]).toEqual(
      expect.objectContaining({
        status: "queued",
        idempotencyKey: "whatsapp:message_1",
        attemptCount: 1,
      }),
    );
    expect(db.scheduled).toHaveLength(1);
    expect(computeRetryDelayMs(1)).toBe(15_000);
  });

  it("permanent error marks the queue job failed and surfaces the reason", async () => {
    const db = createFakeDb({
      conversations: [
        {
          ...buildConversation(),
          botReplyState: "idle",
        },
      ],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "queued",
          transportMessageId: "whatsapp_message_1",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappMessages: [
        {
          _id: "whatsapp_message_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          transcriptMessageId: "message_1",
          providerMessageId: "queued:message_1",
          waId: "628111111111",
          direction: "outbound",
          messageType: "text",
          transportStatus: "queued",
          rawSummary: "Halo dari bot",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "processing",
          attemptCount: 0,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          claimToken: "claim_1",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await finalizeOutboundSendFailure({ db } as never, {
      queueJobId: "queue_1" as never,
      claimToken: "claim_1",
      errorCode: "131000",
      errorMessage: "invalid recipient",
      retryable: false,
    });

    expect(result.status).toBe("failed");
    expect(db.tables.outboundQueue[0]).toEqual(
      expect.objectContaining({
        status: "failed",
        failureCode: "131000",
        failureMessage: "invalid recipient",
      }),
    );
    expect(db.tables.messages[0]?.deliveryState).toBe("failed");
    expect(db.tables.dashboardNotifications).toHaveLength(1);
  });

  it("max attempts stops retrying even for retryable failures", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({})],
      whatsappContacts: [buildContact()],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "processing",
          attemptCount: 4,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          claimToken: "claim_1",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "queued",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappMessages: [
        {
          _id: "whatsapp_message_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          transcriptMessageId: "message_1",
          providerMessageId: "queued:message_1",
          waId: "628111111111",
          direction: "outbound",
          messageType: "text",
          transportStatus: "queued",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await finalizeOutboundSendFailure({ db } as never, {
      queueJobId: "queue_1" as never,
      claimToken: "claim_1",
      errorCode: "500",
      errorMessage: "server error",
      retryable: true,
    });

    expect(result.status).toBe("failed");
    expect(db.tables.outboundQueue[0]?.status).toBe("failed");
  });

  it("duplicate dispatcher cannot claim the same queue job twice", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({})],
      whatsappContacts: [buildContact()],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "queued",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "queued",
          attemptCount: 0,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const first = await claimDueOutboundQueueJob({ db } as never, {
      queueJobId: "queue_1" as never,
      now: 1_710_000_000_000,
    });
    const second = await claimDueOutboundQueueJob({ db } as never, {
      queueJobId: "queue_1" as never,
      now: 1_710_000_000_000,
    });

    expect(first.status).toBe("ready");
    expect(second).toEqual({
      status: "noop",
      reason: "queue_job_not_queued",
    });
  });

  it("service window is revalidated immediately before send", async () => {
    const expired = 1_710_000_000_000 - 1;
    const db = createFakeDb({
      conversations: [buildConversation({ serviceWindowExpiresAt: expired })],
      whatsappContacts: [buildContact()],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "queued",
          attemptCount: 0,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "queued",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappMessages: [
        {
          _id: "whatsapp_message_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          transcriptMessageId: "message_1",
          providerMessageId: "queued:message_1",
          waId: "628111111111",
          direction: "outbound",
          messageType: "text",
          transportStatus: "queued",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await claimDueOutboundQueueJob({ db } as never, {
      queueJobId: "queue_1" as never,
      now: 1_710_000_000_000,
    });

    expect(result).toEqual({
      status: "failed",
      reason: "service_window_closed_before_send",
    });
    expect(db.tables.outboundQueue[0]?.status).toBe("failed");
  });
});

describe("phase 9 status reconciliation", () => {
  it("delivered, read, and failed statuses update the original message", async () => {
    const db = createFakeDb({
      conversations: [buildConversation({})],
      messages: [
        {
          _id: "message_1",
          organizationId: "org_1",
          conversationId: "conversation_1",
          role: "assistant",
          source: "bot_orchestrator",
          content: "Halo dari bot",
          contentType: "text",
          deliveryState: "sent",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappMessages: [
        {
          _id: "whatsapp_message_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          transcriptMessageId: "message_1",
          providerMessageId: "wamid.real.1",
          waId: "628111111111",
          direction: "outbound",
          messageType: "text",
          transportStatus: "sent",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      outboundQueue: [
        {
          _id: "queue_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          conversationId: "conversation_1",
          contactId: "contact_1",
          channel: "whatsapp",
          messageId: "message_1",
          whatsappMessageId: "whatsapp_message_1",
          idempotencyKey: "whatsapp:message_1",
          status: "sent",
          attemptCount: 1,
          maxAttempts: 5,
          nextAttemptAt: 1_710_000_000_000,
          providerMessageId: "wamid.real.1",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappWebhookEvents: [
        {
          _id: "event_1",
          rawPayload: JSON.stringify({
            object: "whatsapp_business_account",
            entry: [
              {
                changes: [
                  {
                    field: "messages",
                    value: {
                      statuses: [
                        {
                          id: "wamid.real.1",
                          status: "delivered",
                          timestamp: "1710000010",
                        },
                        {
                          id: "wamid.real.1",
                          status: "read",
                          timestamp: "1710000020",
                        },
                        {
                          id: "wamid.real.1",
                          status: "failed",
                          timestamp: "1710000030",
                          errors: [
                            {
                              code: 131026,
                              message: "Message undeliverable",
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          }),
          receivedAt: 1_710_000_000_000,
          processingStatus: "received",
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await processWhatsappStatusWebhookEvent({ db } as never, {
      _id: "event_1",
      rawPayload: db.tables.whatsappWebhookEvents[0]?.rawPayload as string,
      receivedAt: 1_710_000_000_000,
    } as never);

    expect(result).toEqual({
      processedStatuses: 3,
    });
    expect(db.tables.messages[0]?.deliveryState).toBe("failed");
    expect(db.tables.whatsappMessages[0]).toEqual(
      expect.objectContaining({
        transportStatus: "failed",
        failureCode: "131026",
      }),
    );
  });

  it("normalizes status payloads coherently", () => {
    const normalized = normalizeWhatsappStatusWebhook({
      rawPayload: JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  statuses: [
                    {
                      id: "wamid.real.1",
                      status: "delivered",
                      timestamp: "1710000010",
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    });

    expect(normalized).toEqual([
      {
        providerMessageId: "wamid.real.1",
        status: "delivered",
        timestamp: 1_710_000_010_000,
        recipientWaId: undefined,
        errorCode: undefined,
        errorMessage: undefined,
      },
    ]);
  });

  it("classifies retryable vs permanent Meta failures coherently", () => {
    expect(
      classifyMetaSendFailure({
        status: 500,
        body: { error: { code: 2, message: "server" } },
      }),
    ).toEqual({
      retryable: true,
      errorCode: "2",
      errorMessage: "server",
    });

    expect(
      classifyMetaSendFailure({
        status: 400,
        body: { error: { code: 131000, message: "bad request" } },
      }),
    ).toEqual({
      retryable: false,
      errorCode: "131000",
      errorMessage: "bad request",
    });

    expect(
      classifyMetaSendFailure({
        status: 400,
        body: { error: { code: 132000, message: "template params invalid" } },
        error: Object.assign(new Error("Meta send failed"), {
          responseStatus: 400,
        }),
      }),
    ).toEqual({
      retryable: false,
      errorCode: "132000",
      errorMessage: "template params invalid",
    });
  });

  it("builds the Meta sender request and stores the provider message id", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          messaging_product: "whatsapp",
          messages: [{ id: "wamid.real.123" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await sendWhatsAppTextMessage({
      phoneNumberId: "12345",
      accessToken: "token",
      to: "628111111111",
      body: "Halo bot",
      idempotencyKey: "whatsapp:message_1",
      fetchImpl: fetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/12345/messages"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "X-Idempotency-Key": "whatsapp:message_1",
        }),
      }),
    );
    expect(result.providerMessageId).toBe("wamid.real.123");
  });

  it("drops template definition components before sending to Meta", () => {
    expect(
      sanitizeTemplateSendComponents([
        { type: "BODY", text: "Hi {{1}}" },
        {
          type: "body",
          parameters: [{ type: "text", text: "Ryan" }],
        },
        {
          type: "BUTTON",
          sub_type: "URL",
          index: 0,
          parameters: [{ type: "text", text: "track-123" }],
        },
      ]),
    ).toEqual([
      {
        type: "body",
        parameters: [{ type: "text", text: "Ryan" }],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "track-123" }],
      },
    ]);
  });

  it("omits invalid template definition components from the Meta request", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          messaging_product: "whatsapp",
          messages: [{ id: "wamid.template.123" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await sendWhatsAppTemplateMessage({
      phoneNumberId: "12345",
      accessToken: "token",
      to: "628111111111",
      idempotencyKey: "whatsapp:template_1",
      templateName: "shipping_update",
      languageCode: "en_US",
      components: [{ type: "BODY", text: "Hi {{1}}" }],
      fetchImpl: fetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/12345/messages"),
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: "628111111111",
          type: "template",
          template: {
            name: "shipping_update",
            language: {
              code: "en_US",
            },
          },
        }),
      }),
    );
  });
});
