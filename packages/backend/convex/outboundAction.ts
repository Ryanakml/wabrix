"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import type { ActionCtx } from "./_generated/server.js";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { decryptSecret } from "./lib/crypto.js";
import type { ClaimOutboundQueueJobResult } from "./outbound.js";
import { classifyMetaSendFailure } from "./outbound.js";

type MetaSendResponse = {
  messaging_product?: string;
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
    message_status?: string;
  }>;
  error?: {
    message?: string;
    code?: number | string;
  };
};

type MetaTemplateSendComponent = {
  type: string;
  parameters: unknown[];
  sub_type?: string;
  index?: string;
};

function getGraphApiBaseUrl() {
  return (
    process.env.WHATSAPP_GRAPH_API_BASE_URL?.replace(/\/$/, "") ??
    "https://graph.facebook.com/v23.0"
  );
}

export async function sendWhatsAppTextMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
  idempotencyKey,
  fetchImpl = fetch,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
}) {
  const url = `${getGraphApiBaseUrl()}/${phoneNumberId}/messages`;

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        body,
        preview_url: false,
      },
    }),
  });

  const parsed = (await response.json()) as MetaSendResponse;

  if (!response.ok) {
    throw Object.assign(new Error("Meta send failed"), {
      responseStatus: response.status,
      responseBody: parsed,
    });
  }

  const providerMessageId = parsed.messages?.[0]?.id;

  if (!providerMessageId) {
    throw Object.assign(
      new Error("Meta send response did not include a message id"),
      {
        responseStatus: response.status,
        responseBody: parsed,
      },
    );
  }

  return {
    providerMessageId,
    acceptedAt: Date.now(),
    rawResponse: parsed,
  };
}

export async function sendWhatsAppTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  idempotencyKey,
  templateName,
  languageCode,
  components,
  fetchImpl = fetch,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  idempotencyKey: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
  fetchImpl?: typeof fetch;
}) {
  const url = `${getGraphApiBaseUrl()}/${phoneNumberId}/messages`;
  const sanitizedComponents = sanitizeTemplateSendComponents(components);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(sanitizedComponents.length > 0
          ? { components: sanitizedComponents }
          : {}),
      },
    }),
  });

  const parsed = (await response.json()) as MetaSendResponse;

  if (!response.ok) {
    throw Object.assign(new Error("Meta send failed"), {
      responseStatus: response.status,
      responseBody: parsed,
    });
  }

  const providerMessageId = parsed.messages?.[0]?.id;

  if (!providerMessageId) {
    throw Object.assign(
      new Error("Meta send response did not include a message id"),
      {
        responseStatus: response.status,
        responseBody: parsed,
      },
    );
  }

  return {
    providerMessageId,
    acceptedAt: Date.now(),
    rawResponse: parsed,
  };
}

export function sanitizeTemplateSendComponents(
  components?: unknown[],
): MetaTemplateSendComponent[] {
  if (!components?.length) {
    return [];
  }

  return components.flatMap((component) => {
    if (!component || typeof component !== "object") {
      return [];
    }

    const candidate = component as {
      type?: unknown;
      sub_type?: unknown;
      index?: unknown;
      parameters?: unknown;
    };

    if (
      typeof candidate.type !== "string" ||
      !Array.isArray(candidate.parameters) ||
      candidate.parameters.length === 0
    ) {
      return [];
    }

    const normalized: MetaTemplateSendComponent = {
      type: candidate.type.toLowerCase(),
      parameters: candidate.parameters,
    };

    if (typeof candidate.sub_type === "string" && candidate.sub_type.trim()) {
      normalized.sub_type = candidate.sub_type.toLowerCase();
    }

    if (
      typeof candidate.index === "string" ||
      typeof candidate.index === "number"
    ) {
      normalized.index = String(candidate.index);
    }

    return [normalized];
  });
}

async function processOutboundQueueJobHandler(
  ctx: ActionCtx,
  args: {
    queueJobId?: Id<"outboundQueue">;
  },
): Promise<unknown> {
  const claim = (await ctx.runMutation(
    internal.outbound.claimDueOutboundQueueJobMutation,
    {
      queueJobId: args.queueJobId,
    },
  )) as ClaimOutboundQueueJobResult;

  if (claim.status !== "ready") {
    return claim;
  }

  try {
    const runtime = await ctx.runQuery(
      internal.whatsapp.getWhatsAppSenderRuntime,
      {
        integrationId: claim.integrationId,
      },
    );

    if (!runtime || !runtime.accessTokenEncrypted) {
      throw new Error(
        "WhatsApp access token is not configured for outbound sending.",
      );
    }

    if (!runtime.enabled || runtime.connectionStatus !== "configured") {
      throw new Error(
        "WhatsApp integration is not enabled for outbound sending.",
      );
    }

    const accessToken = await decryptSecret(runtime.accessTokenEncrypted);

    if (!accessToken) {
      throw new Error("WhatsApp access token could not be decrypted.");
    }

    let result:
      | Awaited<ReturnType<typeof sendWhatsAppTextMessage>>
      | Awaited<ReturnType<typeof sendWhatsAppTemplateMessage>>;

    if (claim.payloadType === "template") {
      if (runtime.approvalStatus !== "approved") {
        throw new Error(
          "Meta approval is still pending. Finish the WhatsApp Integration setup first before sending template messages.",
        );
      }

      if (!claim.templateId || !claim.templateName || !claim.templateLanguageCode) {
        throw new Error("Template queue job is missing template metadata.");
      }

      const approvedTemplate = await ctx.runQuery(
        internal.whatsapp.getApprovedTemplateRuntime,
        {
          templateId: claim.templateId,
        },
      );

      if (!approvedTemplate || !approvedTemplate.languageCode) {
        throw new Error("Approved template could not be loaded for outbound send.");
      }

      result = await sendWhatsAppTemplateMessage({
        phoneNumberId: runtime.phoneNumberId,
        accessToken,
        to: claim.waId,
        idempotencyKey: claim.idempotencyKey,
        templateName: approvedTemplate.name,
        languageCode: approvedTemplate.languageCode,
        components: approvedTemplate.components,
      });
    } else {
      result = await sendWhatsAppTextMessage({
        phoneNumberId: runtime.phoneNumberId,
        accessToken,
        to: claim.waId,
        body: claim.content,
        idempotencyKey: claim.idempotencyKey,
      });
    }

    return ctx.runMutation(
      internal.outbound.finalizeOutboundSendSuccessMutation,
      {
        queueJobId: claim.queueJobId,
        claimToken: claim.claimToken,
        providerMessageId: result.providerMessageId,
        providerStatusAt: result.acceptedAt,
      },
    );
  } catch (error) {
    const classified = classifyMetaSendFailure({
      status:
        error && typeof error === "object" && "responseStatus" in error
          ? Number((error as { responseStatus?: number }).responseStatus)
          : undefined,
      body:
        error && typeof error === "object" && "responseBody" in error
          ? (error as { responseBody?: unknown }).responseBody
          : undefined,
      error,
    });

    return ctx.runMutation(
      internal.outbound.finalizeOutboundSendFailureMutation,
      {
        queueJobId: claim.queueJobId,
        claimToken: claim.claimToken,
        errorCode: classified.errorCode,
        errorMessage: classified.errorMessage,
        retryable: classified.retryable,
      },
    );
  }
}

export const processOutboundQueueJob = internalAction({
  args: {
    queueJobId: v.optional(v.id("outboundQueue")),
  },
  handler: processOutboundQueueJobHandler,
});
