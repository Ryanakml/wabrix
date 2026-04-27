import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queueManualReply } from "../convex/inbox";

type FakeDoc = Record<string, unknown> & { _id: string };

function createFakeDb(initial?: Partial<Record<string, FakeDoc[]>>) {
  const tables: Record<string, FakeDoc[]> = {
    conversations: initial?.conversations ?? [],
    whatsappContacts: initial?.whatsappContacts ?? [],
    messages: initial?.messages ?? [],
    whatsappMessages: initial?.whatsappMessages ?? [],
    outboundQueue: initial?.outboundQueue ?? [],
    auditLogs: initial?.auditLogs ?? [],
    conversationNotes: initial?.conversationNotes ?? [],
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
            async collect() {
              return matches;
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

describe("phase 10 inbox controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_710_000_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues a manual reply through the outbound queue when the service window is open", async () => {
    const db = createFakeDb({
      conversations: [
        {
          _id: "conversation_1",
          organizationId: "org_1",
          channel: "whatsapp",
          contactId: "contact_1",
          status: "open",
          handoffRequested: true,
          botPaused: true,
          botReplyState: "blocked",
          botReplyError: "handoff_requested",
          serviceWindowExpiresAt: 1_710_000_000_000 + 60_000,
          serviceWindowExpiringSoon: true,
          lastMessageAt: 1_710_000_000_000,
          lastInboundAt: 1_710_000_000_000,
          lastMessagePreview: "Need help",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappContacts: [
        {
          _id: "contact_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          botId: "bot_1",
          waId: "628111111111",
          profileName: "Ryan",
          lastInboundAt: 1_710_000_000_000,
          serviceWindowExpiresAt: 1_710_000_000_000 + 60_000,
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    const result = await queueManualReply({ db, scheduler: db.scheduler } as never, {
      conversationId: "conversation_1" as never,
      organizationId: "org_1" as never,
      authorDisplayName: "Ops Agent",
      body: "Manual human reply",
      now: 1_710_000_000_000 + 5_000,
    });

    expect(result.manualMessageId).toBe("messages_1");
    expect(db.tables.messages).toHaveLength(1);
    expect(db.tables.whatsappMessages).toHaveLength(1);
    expect(db.tables.outboundQueue).toHaveLength(1);
    expect(db.tables.outboundQueue[0]?.status).toBe("queued");
    expect(db.tables.auditLogs[0]?.action).toBe("manual_reply_queued");
    expect(db.scheduled).toHaveLength(1);
  });

  it("blocks manual freeform replies after the service window closes", async () => {
    const db = createFakeDb({
      conversations: [
        {
          _id: "conversation_1",
          organizationId: "org_1",
          channel: "whatsapp",
          contactId: "contact_1",
          status: "open",
          handoffRequested: false,
          botPaused: false,
          botReplyState: "idle",
          serviceWindowExpiresAt: 1_710_000_000_000 - 1_000,
          serviceWindowExpiringSoon: false,
          lastMessageAt: 1_710_000_000_000,
          lastInboundAt: 1_710_000_000_000,
          lastMessagePreview: "Need help",
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
      whatsappContacts: [
        {
          _id: "contact_1",
          organizationId: "org_1",
          integrationId: "integration_1",
          botId: "bot_1",
          waId: "628111111111",
          profileName: "Ryan",
          lastInboundAt: 1_710_000_000_000,
          serviceWindowExpiresAt: 1_710_000_000_000 - 1_000,
          createdAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_000,
        },
      ],
    });

    await expect(
      queueManualReply({ db, scheduler: db.scheduler } as never, {
        conversationId: "conversation_1" as never,
        organizationId: "org_1" as never,
        authorDisplayName: "Ops Agent",
        body: "Manual human reply",
        now: 1_710_000_000_000 + 5_000,
      }),
    ).rejects.toThrow("24-hour service window");

    expect(db.tables.messages).toHaveLength(0);
    expect(db.tables.outboundQueue).toHaveLength(0);
  });
});
