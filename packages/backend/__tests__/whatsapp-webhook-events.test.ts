import { describe, expect, it } from "vitest";
import { persistWhatsappWebhookEvent } from "../convex/whatsappWebhookEvents";

type FakeDoc = Record<string, unknown> & { _id: string };

function createFakeDb({
  integrations = [],
  events = [],
}: {
  integrations?: FakeDoc[];
  events?: FakeDoc[];
}) {
  const tables = {
    whatsappIntegrations: [...integrations],
    whatsappWebhookEvents: [...events],
  };

  return {
    tables,
    query(tableName: keyof typeof tables) {
      return {
        withIndex(
          indexName: string,
          builder: (query: {
            eq: (field: string, value: unknown) => {
              field: string;
              value: unknown;
            };
          }) => { field: string; value: unknown },
        ) {
          const filter = builder({
            eq: (field, value) => ({ field, value }),
          });

          return {
            async first() {
              if (tableName === "whatsappIntegrations") {
                if (indexName === "by_phone_number_id") {
                  return (
                    tables.whatsappIntegrations.find(
                      (doc) => doc.phoneNumberId === filter.value,
                    ) ?? null
                  );
                }

                if (indexName === "by_verify_token_hash") {
                  return (
                    tables.whatsappIntegrations.find(
                      (doc) => doc.verifyTokenHash === filter.value,
                    ) ?? null
                  );
                }
              }

              if (tableName === "whatsappWebhookEvents" && indexName === "by_event_key") {
                return (
                  tables.whatsappWebhookEvents.find(
                    (doc) => doc.eventKey === filter.value,
                  ) ?? null
                );
              }

              return null;
            },
          };
        },
      };
    },
    async insert(tableName: keyof typeof tables, value: Record<string, unknown>) {
      const _id = `${tableName}_${tables[tableName].length + 1}`;
      tables[tableName].push({
        _id,
        ...value,
      });

      return _id;
    },
    async patch(id: string, patch: Record<string, unknown>) {
      for (const tableName of Object.keys(tables) as Array<keyof typeof tables>) {
        const doc = tables[tableName].find((candidate) => candidate._id === id);
        if (doc) {
          Object.assign(doc, patch);
          return;
        }
      }
    },
    async get(id: string) {
      for (const tableName of Object.keys(tables) as Array<keyof typeof tables>) {
        const doc = tables[tableName].find((candidate) => candidate._id === id);
        if (doc) {
          return doc;
        }
      }

      return null;
    },
  };
}

describe("whatsapp webhook event persistence", () => {
  it("stores a raw webhook event and links it to the matching integration", async () => {
    const db = createFakeDb({
      integrations: [
        {
          _id: "integration_1",
          organizationId: "org_1",
          botId: "bot_1",
          phoneNumberId: "12345",
          businessAccountId: "waba_123",
          webhookStatus: "pending",
        },
      ],
    });

    const result = await persistWhatsappWebhookEvent(
      { db } as never,
      {
        receivedAt: 1_700_000_000_000,
        eventKey: "event_key_123",
        eventType: "messages",
        rawPayload: '{"object":"whatsapp_business_account"}',
        signatureValid: true,
        phoneNumberId: "12345",
        businessAccountId: "waba_123",
        providerEventId: "wamid.abc",
        mediaDownloadEnqueued: false,
        mediaDownloadPriority: "normal",
      },
    );

    expect(result).toEqual({
      eventId: "whatsappWebhookEvents_1",
      duplicate: false,
      mediaWorkEnqueued: false,
      processingStatus: "received",
    });
    expect(db.tables.whatsappWebhookEvents).toHaveLength(1);
    expect(db.tables.whatsappWebhookEvents[0]).toEqual(
      expect.objectContaining({
        organizationId: "org_1",
        integrationId: "integration_1",
        botId: "bot_1",
        phoneNumberId: "12345",
        providerEventId: "wamid.abc",
        rawPayload: '{"object":"whatsapp_business_account"}',
        signatureValid: true,
        attemptCount: 1,
      }),
    );
    expect(db.tables.whatsappIntegrations[0]).toEqual(
      expect.objectContaining({
        webhookStatus: "receiving",
        lastWebhookEventAt: 1_700_000_000_000,
      }),
    );
  });

  it("deduplicates repeated events without duplicating downstream media work", async () => {
    const db = createFakeDb({
      integrations: [
        {
          _id: "integration_1",
          organizationId: "org_1",
          botId: "bot_1",
          phoneNumberId: "12345",
          businessAccountId: "waba_123",
          webhookStatus: "pending",
        },
      ],
    });

    const input = {
      receivedAt: 1_700_000_000_000,
      eventKey: "event_key_media_123",
      eventType: "messages",
      rawPayload: '{"object":"whatsapp_business_account"}',
      signatureValid: true,
      phoneNumberId: "12345",
      businessAccountId: "waba_123",
      providerEventId: "wamid.media",
      mediaDownloadEnqueued: true,
      mediaDownloadPriority: "high" as const,
      mediaDownloadDeadlineAt: 1_700_000_240_000,
    };

    const firstResult = await persistWhatsappWebhookEvent({ db } as never, input);
    const secondResult = await persistWhatsappWebhookEvent(
      { db } as never,
      {
        ...input,
        receivedAt: 1_700_000_000_500,
      },
    );

    expect(firstResult).toEqual({
      eventId: "whatsappWebhookEvents_1",
      duplicate: false,
      mediaWorkEnqueued: true,
      processingStatus: "media_download_queued",
    });
    expect(secondResult).toEqual({
      eventId: "whatsappWebhookEvents_1",
      duplicate: true,
      mediaWorkEnqueued: false,
      processingStatus: "media_download_queued",
    });
    expect(db.tables.whatsappWebhookEvents).toHaveLength(1);
    expect(db.tables.whatsappWebhookEvents[0]).toEqual(
      expect.objectContaining({
        attemptCount: 2,
        processingStatus: "media_download_queued",
        mediaDownloadStatus: "queued",
        mediaDownloadPriority: "high",
      }),
    );
  });
});
