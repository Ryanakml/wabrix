import { describe, expect, it } from "vitest";
import {
  normalizeInboundWhatsappMessages,
  processStoredWhatsappWebhookEvent,
  upsertWhatsappContact,
} from "../convex/inbound";

type FakeDoc = Record<string, unknown> & { _id: string };

function createFakeDb(initial?: Partial<Record<string, FakeDoc[]>>) {
  const tables: Record<string, FakeDoc[]> = {
    whatsappContacts: initial?.whatsappContacts ?? [],
    conversations: initial?.conversations ?? [],
    messages: initial?.messages ?? [],
    whatsappMessages: initial?.whatsappMessages ?? [],
    whatsappMedia: initial?.whatsappMedia ?? [],
    whatsappWebhookEvents: initial?.whatsappWebhookEvents ?? [],
  };

  return {
    tables,
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

          const result = builder({ eq: firstClause });
          const clauses = result.clauses;
          const matches = tables[tableName].filter((doc) =>
            clauses.every((clause) => doc[clause.field] === clause.value),
          );

          return {
            async first() {
              return matches[0] ?? null;
            },
            order() {
              return {
                async take(limit: number) {
                  return matches.slice(0, limit);
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
          Object.assign(found, patch);
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
  };
}

function buildTextPayload({
  messageId = "wamid.text.1",
  waId = "628111111111",
  body = "Halo dari customer",
  timestamp = "1710000000",
  profileName = "Ryan",
}: {
  messageId?: string;
  waId?: string;
  body?: string;
  timestamp?: string;
  profileName?: string;
} = {}) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba_123",
        changes: [
          {
            field: "messages",
            value: {
              contacts: [
                {
                  wa_id: waId,
                  profile: { name: profileName },
                },
              ],
              messages: [
                {
                  id: messageId,
                  from: waId,
                  timestamp,
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

describe("phase 7 inbound processor", () => {
  it("normalizes inbound text payloads", () => {
    const normalized = normalizeInboundWhatsappMessages({
      rawPayload: buildTextPayload(),
      fallbackReceivedAt: 1_710_000_000_000,
    });

    expect(normalized).toEqual([
      {
        providerMessageId: "wamid.text.1",
        waId: "628111111111",
        profileName: "Ryan",
        messageType: "text",
        contentType: "text",
        content: "Halo dari customer",
        receivedAt: 1_710_000_000_000,
        providerMediaId: undefined,
        mediaType: undefined,
        mediaRequiresTranscript: false,
        mediaRequiresSummary: false,
        mediaRequiresStorage: false,
      },
    ]);
  });

  it("upserts contacts and refreshes the service window", async () => {
    const db = createFakeDb();
    const firstReceivedAt = 1_710_000_000_000;
    const secondReceivedAt = firstReceivedAt + 60_000;

    const first = await upsertWhatsappContact({ db } as never, {
      organizationId: "org_1" as never,
      integrationId: "integration_1" as never,
      botId: "bot_1" as never,
      waId: "628111111111",
      profileName: "Ryan",
      receivedAt: firstReceivedAt,
    });
    const second = await upsertWhatsappContact({ db } as never, {
      organizationId: "org_1" as never,
      integrationId: "integration_1" as never,
      botId: "bot_1" as never,
      waId: "628111111111",
      profileName: "Ryan Updated",
      receivedAt: secondReceivedAt,
    });

    expect(first._id).toBe(second._id);
    expect(db.tables.whatsappContacts).toHaveLength(1);
    expect(second.profileName).toBe("Ryan Updated");
    expect(second.serviceWindowExpiresAt).toBe(secondReceivedAt + 24 * 60 * 60 * 1000);
  });

  it("creates a contact, a conversation, a transcript row, and a transport row for one inbound text", async () => {
    const db = createFakeDb();
    const result = await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_1",
        rawPayload: buildTextPayload(),
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(result).toEqual({
      ignored: false,
      processedMessages: 1,
      createdMediaRecords: 0,
    });
    expect(db.tables.whatsappContacts).toHaveLength(1);
    expect(db.tables.conversations).toHaveLength(1);
    expect(db.tables.messages).toHaveLength(1);
    expect(db.tables.whatsappMessages).toHaveLength(1);
    expect(db.tables.whatsappWebhookEvents).toHaveLength(0);
  });

  it("reuses the active conversation for later inbound messages from the same contact", async () => {
    const db = createFakeDb();
    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_1",
        rawPayload: buildTextPayload({ messageId: "wamid.1" }),
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );
    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_2",
        rawPayload: buildTextPayload({
          messageId: "wamid.2",
          body: "follow up cepat",
          timestamp: "1710000060",
        }),
        receivedAt: 1_710_000_060_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(db.tables.conversations).toHaveLength(1);
    expect(db.tables.messages).toHaveLength(2);
    expect(db.tables.whatsappMessages).toHaveLength(2);
  });

  it("does not duplicate transcript rows when the same provider message id is processed again", async () => {
    const db = createFakeDb();
    const event = {
      _id: "event_1",
      rawPayload: buildTextPayload({ messageId: "wamid.same" }),
      receivedAt: 1_710_000_000_000,
      organizationId: "org_1",
      integrationId: "integration_1",
      botId: "bot_1",
    };

    await processStoredWhatsappWebhookEvent({ db } as never, event as never);
    await processStoredWhatsappWebhookEvent({ db } as never, event as never);

    expect(db.tables.messages).toHaveLength(1);
    expect(db.tables.whatsappMessages).toHaveLength(1);
  });

  it("persists every inbound message in a spam burst payload", async () => {
    const db = createFakeDb();
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                contacts: [{ wa_id: "628111111111", profile: { name: "Ryan" } }],
                messages: [
                  { id: "wamid.1", from: "628111111111", timestamp: "1710000000", type: "text", text: { body: "1" } },
                  { id: "wamid.2", from: "628111111111", timestamp: "1710000001", type: "text", text: { body: "2" } },
                  { id: "wamid.3", from: "628111111111", timestamp: "1710000002", type: "text", text: { body: "3" } },
                ],
              },
            },
          ],
        },
      ],
    });

    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_burst",
        rawPayload,
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(db.tables.messages).toHaveLength(3);
    expect(db.tables.whatsappMessages).toHaveLength(3);
  });

  it("stores unsupported payloads safely without crashing", async () => {
    const db = createFakeDb();
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                contacts: [{ wa_id: "628111111111", profile: { name: "Ryan" } }],
                messages: [
                  {
                    id: "wamid.sticker",
                    from: "628111111111",
                    timestamp: "1710000000",
                    type: "sticker",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_unsupported",
        rawPayload,
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(db.tables.messages[0]?.content).toBe(
      "[Unsupported WhatsApp payload: sticker]",
    );
    expect(db.tables.whatsappMedia).toHaveLength(0);
  });

  it("creates a queued voice-note media job", async () => {
    const db = createFakeDb();
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                contacts: [{ wa_id: "628111111111", profile: { name: "Ryan" } }],
                messages: [
                  {
                    id: "wamid.audio",
                    from: "628111111111",
                    timestamp: "1710000000",
                    type: "audio",
                    audio: { id: "media_audio_1", voice: true },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_audio",
        rawPayload,
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(db.tables.whatsappMedia).toHaveLength(1);
    expect(db.tables.whatsappMedia[0]).toEqual(
      expect.objectContaining({
        mediaType: "audio",
        downloadStatus: "queued",
        transcriptStatus: "queued",
        summaryStatus: "not_applicable",
        storageStatus: "not_applicable",
      }),
    );
  });

  it("creates image and document media jobs with storage and summary work", async () => {
    const db = createFakeDb();
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                contacts: [{ wa_id: "628111111111", profile: { name: "Ryan" } }],
                messages: [
                  {
                    id: "wamid.image",
                    from: "628111111111",
                    timestamp: "1710000000",
                    type: "image",
                    image: { id: "media_image_1", caption: "lihat brosur" },
                  },
                  {
                    id: "wamid.document",
                    from: "628111111111",
                    timestamp: "1710000001",
                    type: "document",
                    document: { id: "media_doc_1", filename: "price-list.pdf" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await processStoredWhatsappWebhookEvent(
      { db } as never,
      {
        _id: "event_media",
        rawPayload,
        receivedAt: 1_710_000_000_000,
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
      } as never,
    );

    expect(db.tables.whatsappMedia).toHaveLength(2);
    expect(db.tables.whatsappMedia[0]).toEqual(
      expect.objectContaining({
        mediaType: "image",
        summaryStatus: "queued",
        storageStatus: "queued",
      }),
    );
    expect(db.tables.whatsappMedia[1]).toEqual(
      expect.objectContaining({
        mediaType: "document",
        summaryStatus: "queued",
        storageStatus: "queued",
      }),
    );
  });
});
