import type { MiddlewareHandler } from "hono";

export type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

export type IngressBindings = {
  CONVEX_HTTP_URL?: string;
  CONVEX_SHARED_SECRET?: string;
  ENVIRONMENT?: string;
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
  WHATSAPP_WEBHOOK_RATE_LIMITER?: RateLimitBinding;
};

export type PersistedWebhookResult = {
  eventId: string;
  duplicate: boolean;
  mediaWorkEnqueued: boolean;
  processingStatus: string;
};

export type PersistWebhookEventInput = {
  receivedAt: number;
  eventKey: string;
  eventType: string;
  rawPayload: string;
  signatureValid: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  providerEventId?: string;
  mediaDownloadEnqueued: boolean;
  mediaDownloadPriority: "normal" | "high";
  mediaDownloadDeadlineAt?: number;
};

export type CreateIngressAppDependencies = {
  persistWebhookEvent?: (
    env: IngressBindings,
    input: PersistWebhookEventInput,
  ) => Promise<PersistedWebhookResult>;
  markWebhookVerified?: (
    env: IngressBindings,
    input: { verifyToken: string; verifiedAt: number },
  ) => Promise<void>;
  applyRateLimit?: (
    env: IngressBindings,
    phoneNumberId: string,
  ) => Promise<{ success: boolean }>;
  preWebhookMiddleware?: MiddlewareHandler<{
    Bindings: IngressBindings;
  }>[];
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        messages?: Array<{
          id?: string;
          type?: string;
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
        }>;
      };
    }>;
  }>;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const MEDIA_MESSAGE_TYPES = new Set([
  "audio",
  "document",
  "image",
  "sticker",
  "video",
  "voice",
]);

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeSignatureHeader(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.startsWith("sha256=") ? value.slice("sha256=".length) : value;
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export async function signMetaPayload(rawBody: string, appSecret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(appSecret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(rawBody),
  );

  return bytesToHex(new Uint8Array(signature));
}

export async function verifyMetaSignature({
  rawBody,
  signatureHeader,
  appSecret,
}: {
  rawBody: string;
  signatureHeader?: string | null;
  appSecret: string;
}) {
  const expected = await signMetaPayload(rawBody, appSecret);
  const provided = normalizeSignatureHeader(signatureHeader);

  if (!provided) {
    return false;
  }

  return constantTimeEqual(expected, provided.toLowerCase());
}

export function parseWebhookPayload(rawBody: string) {
  return JSON.parse(rawBody) as WhatsAppWebhookPayload;
}

export function extractPhoneNumberId(payload: WhatsAppWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (phoneNumberId) {
        return phoneNumberId;
      }
    }
  }

  return undefined;
}

export function extractBusinessAccountId(payload: WhatsAppWebhookPayload) {
  return payload.entry?.find((entry) => entry.id)?.id;
}

export function extractProviderEventId(
  payload: WhatsAppWebhookPayload,
  payloadHash?: string,
) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messageId = change.value?.messages?.find(
        (message) => message.id,
      )?.id;
      if (messageId) {
        return payloadHash ? `${messageId}:${payloadHash}` : messageId;
      }

      const statusId = change.value?.statuses?.find((status) => status.id)?.id;
      if (statusId) {
        return payloadHash ? `${statusId}:${payloadHash}` : statusId;
      }
    }
  }

  return undefined;
}

export function deriveEventType(payload: WhatsAppWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if ((change.value?.messages?.length ?? 0) > 0) {
        return "messages";
      }

      if ((change.value?.statuses?.length ?? 0) > 0) {
        return "statuses";
      }

      if (change.field) {
        return change.field;
      }
    }
  }

  return payload.object ?? "unknown";
}

export function deriveMediaWork(
  payload: WhatsAppWebhookPayload,
  receivedAt: number,
) {
  const messages =
    payload.entry?.flatMap((entry) =>
      (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
    ) ?? [];
  const hasMediaMessage = messages.some((message) =>
    MEDIA_MESSAGE_TYPES.has(message.type ?? ""),
  );

  if (!hasMediaMessage) {
    return {
      mediaDownloadEnqueued: false,
      mediaDownloadPriority: "normal" as const,
      mediaDownloadDeadlineAt: undefined,
    };
  }

  return {
    mediaDownloadEnqueued: true,
    mediaDownloadPriority: "high" as const,
    mediaDownloadDeadlineAt: receivedAt + 4 * 60 * 1000,
  };
}

export async function buildWebhookEventKey(
  payload: WhatsAppWebhookPayload,
  rawBody: string,
) {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(rawBody),
  );
  const rawPayloadHash = bytesToHex(new Uint8Array(hashBuffer)).slice(0, 24);

  return [
    payload.object ?? "unknown",
    extractPhoneNumberId(payload) ?? "unknown",
    deriveEventType(payload),
    extractProviderEventId(payload, rawPayloadHash) ?? rawPayloadHash,
  ].join(":");
}

function getRequiredEnv(
  env: IngressBindings,
  key: keyof Pick<
    IngressBindings,
    | "CONVEX_HTTP_URL"
    | "CONVEX_SHARED_SECRET"
    | "META_APP_SECRET"
    | "META_VERIFY_TOKEN"
  >,
) {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function getConvexUrl(env: IngressBindings, path: string) {
  return `${getRequiredEnv(env, "CONVEX_HTTP_URL").replace(/\/$/, "")}${path}`;
}

export async function persistWebhookEventViaConvex(
  env: IngressBindings,
  input: PersistWebhookEventInput,
) {
  const response = await fetch(
    getConvexUrl(env, "/internal/whatsapp/webhook-events"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getRequiredEnv(env, "CONVEX_SHARED_SECRET")}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Convex raw event write failed with status ${response.status}`,
    );
  }

  return (await response.json()) as PersistedWebhookResult;
}

export async function markWebhookVerifiedViaConvex(
  env: IngressBindings,
  input: { verifyToken: string; verifiedAt: number },
) {
  const response = await fetch(
    getConvexUrl(env, "/internal/whatsapp/webhook-verified"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getRequiredEnv(env, "CONVEX_SHARED_SECRET")}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Convex verification tracking failed with status ${response.status}`,
    );
  }
}

export async function applyPhoneNumberRateLimit(
  env: IngressBindings,
  phoneNumberId: string,
) {
  if (!env.WHATSAPP_WEBHOOK_RATE_LIMITER) {
    return { success: true };
  }

  return env.WHATSAPP_WEBHOOK_RATE_LIMITER.limit({
    key: phoneNumberId,
  });
}

export async function readRawBodyPreservingRequest(request: Request) {
  const rawClone = request.clone();
  const rawBody = textDecoder.decode(await rawClone.arrayBuffer());

  return rawBody;
}

export function getWebhookVerificationResult(
  mode: string | null,
  verifyToken: string | null,
  challenge: string | null,
  configuredVerifyToken: string,
) {
  if (!mode || !verifyToken || !challenge) {
    return {
      ok: false as const,
      status: 400 as const,
      body: "Missing verification query params",
    };
  }

  if (mode !== "subscribe") {
    return {
      ok: false as const,
      status: 400 as const,
      body: "Invalid verification mode",
    };
  }

  if (verifyToken !== configuredVerifyToken) {
    return {
      ok: false as const,
      status: 403 as const,
      body: "Invalid verify token",
    };
  }

  return { ok: true as const, status: 200 as const, body: challenge };
}
