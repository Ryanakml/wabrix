import { describe, expect, it, vi } from "vitest";
import { createIngressApp } from "./index";
import { signMetaPayload } from "./whatsapp";

const baseEnv = {
  ENVIRONMENT: "test",
  META_APP_SECRET: "phase-6-meta-secret",
  META_VERIFY_TOKEN: "phase-6-verify-token",
  CONVEX_HTTP_URL: "https://example.convex.site",
  CONVEX_SHARED_SECRET: "phase-6-shared-secret",
};

async function buildSignedRequest(rawBody: string) {
  const signature = await signMetaPayload(rawBody, baseEnv.META_APP_SECRET);

  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body: rawBody,
  };
}

describe("ingress worker", () => {
  it("returns the challenge for a valid GET verification request", async () => {
    const markWebhookVerified = vi.fn(async () => undefined);
    const app = createIngressApp({ markWebhookVerified });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=phase-6-verify-token&hub.challenge=challenge_123",
      undefined,
      baseEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("challenge_123");
    expect(markWebhookVerified).toHaveBeenCalledWith(baseEnv, {
      verifyToken: "phase-6-verify-token",
      verifiedAt: expect.any(Number),
    });
  });

  it("rejects an invalid verify token", async () => {
    const app = createIngressApp();

    const response = await app.request(
      "http://localhost/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge_123",
      undefined,
      baseEnv,
    );

    expect(response.status).toBe(403);
  });

  it("accepts a valid signed POST and persists the raw payload", async () => {
    const persistWebhookEvent = vi.fn(async () => ({
      eventId: "event_123",
      duplicate: false,
      mediaWorkEnqueued: false,
      processingStatus: "received",
    }));
    const app = createIngressApp({ persistWebhookEvent });
    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                metadata: {
                  phone_number_id: "12345",
                },
                messages: [
                  {
                    id: "wamid.abc",
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(rawBody),
      baseEnv,
    );

    expect(response.status).toBe(200);
    expect(persistWebhookEvent).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        rawPayload: rawBody,
        signatureValid: true,
        phoneNumberId: "12345",
        businessAccountId: "waba_123",
        providerEventId: "wamid.abc",
        mediaDownloadEnqueued: false,
      }),
    );
  });

  it("rejects an invalid signature", async () => {
    const persistWebhookEvent = vi.fn();
    const app = createIngressApp({ persistWebhookEvent });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": "sha256=deadbeef",
        },
        body: JSON.stringify({ object: "whatsapp_business_account" }),
      },
      baseEnv,
    );

    expect(response.status).toBe(401);
    expect(persistWebhookEvent).not.toHaveBeenCalled();
  });

  it("uses the exact raw body for signature validation", async () => {
    const persistWebhookEvent = vi.fn(async () => ({
      eventId: "event_123",
      duplicate: false,
      mediaWorkEnqueued: false,
      processingStatus: "received",
    }));
    const app = createIngressApp({ persistWebhookEvent });
    const rawBody = `{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "waba_123",
      "changes": [
        {
          "field": "messages",
          "value": {
            "metadata": {
              "phone_number_id": "12345"
            },
            "messages": [
              {
                "id": "wamid.spaced",
                "type": "text"
              }
            ]
          }
        }
      ]
    }
  ]
}`;

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(rawBody),
      baseEnv,
    );

    expect(response.status).toBe(200);
    expect(persistWebhookEvent).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        rawPayload: rawBody,
        providerEventId: "wamid.spaced",
      }),
    );
  });

  it("rejects requests whose body was consumed before signature validation", async () => {
    const persistWebhookEvent = vi.fn();
    const app = createIngressApp({
      persistWebhookEvent,
      preWebhookMiddleware: [
        async (c, next) => {
          await c.req.raw.text();
          await next();
        },
      ],
    });
    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [],
    });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(rawBody),
      baseEnv,
    );

    expect(response.status).toBe(500);
    expect(persistWebhookEvent).not.toHaveBeenCalled();
  });

  it("rate limits using the phoneNumberId as the key", async () => {
    const applyRateLimit = vi.fn(async () => ({ success: true }));
    const persistWebhookEvent = vi.fn(async () => ({
      eventId: "event_123",
      duplicate: false,
      mediaWorkEnqueued: false,
      processingStatus: "received",
    }));
    const app = createIngressApp({ applyRateLimit, persistWebhookEvent });
    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: {
                  phone_number_id: "phone_123",
                },
                messages: [{ id: "wamid.rl", type: "text" }],
              },
            },
          ],
        },
      ],
    });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(rawBody),
      baseEnv,
    );

    expect(response.status).toBe(200);
    expect(applyRateLimit).toHaveBeenCalledWith(baseEnv, "phone_123");
  });

  it("does not block a second phone number when the first one bursts", async () => {
    const counts = new Map<string, number>();
    const applyRateLimit = vi.fn(async (_env, phoneNumberId: string) => {
      const nextCount = (counts.get(phoneNumberId) ?? 0) + 1;
      counts.set(phoneNumberId, nextCount);

      return { success: nextCount <= 1 };
    });
    const persistWebhookEvent = vi.fn(async () => ({
      eventId: "event_123",
      duplicate: false,
      mediaWorkEnqueued: false,
      processingStatus: "received",
    }));
    const app = createIngressApp({ applyRateLimit, persistWebhookEvent });

    const buildBody = (phoneNumberId: string, messageId: string) =>
      JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  metadata: {
                    phone_number_id: phoneNumberId,
                  },
                  messages: [{ id: messageId, type: "text" }],
                },
              },
            ],
          },
        ],
      });

    const firstResponse = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(buildBody("phone_a", "wamid.1")),
      baseEnv,
    );
    const secondResponse = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(buildBody("phone_a", "wamid.2")),
      baseEnv,
    );
    const thirdResponse = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(buildBody("phone_b", "wamid.3")),
      baseEnv,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(thirdResponse.status).toBe(200);
  });

  it("marks media webhook events for high-priority download work", async () => {
    const persistWebhookEvent = vi.fn(async () => ({
      eventId: "event_media_123",
      duplicate: false,
      mediaWorkEnqueued: true,
      processingStatus: "media_download_queued",
    }));
    const app = createIngressApp({ persistWebhookEvent });
    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "messages",
              value: {
                metadata: {
                  phone_number_id: "phone_media",
                },
                messages: [{ id: "wamid.media", type: "image" }],
              },
            },
          ],
        },
      ],
    });

    const response = await app.request(
      "http://localhost/webhooks/whatsapp",
      await buildSignedRequest(rawBody),
      baseEnv,
    );

    expect(response.status).toBe(200);
    expect(persistWebhookEvent).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        phoneNumberId: "phone_media",
        mediaDownloadEnqueued: true,
        mediaDownloadPriority: "high",
        mediaDownloadDeadlineAt: expect.any(Number),
      }),
    );
  });
});
