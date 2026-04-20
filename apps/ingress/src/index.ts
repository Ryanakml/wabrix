import { Hono } from "hono";
import { phaseLabel } from "@wabrix/config";
import {
  applyPhoneNumberRateLimit,
  buildWebhookEventKey,
  type CreateIngressAppDependencies,
  deriveEventType,
  deriveMediaWork,
  extractBusinessAccountId,
  extractPhoneNumberId,
  extractProviderEventId,
  getWebhookVerificationResult,
  type IngressBindings,
  markWebhookVerifiedViaConvex,
  parseWebhookPayload,
  persistWebhookEventViaConvex,
  readRawBodyPreservingRequest,
  verifyMetaSignature,
} from "./whatsapp";

export function createIngressApp(deps: CreateIngressAppDependencies = {}) {
  const app = new Hono<{ Bindings: IngressBindings }>();

  if (deps.preWebhookMiddleware) {
    for (const middleware of deps.preWebhookMiddleware) {
      app.use("/webhooks/whatsapp", middleware);
    }
  }

  app.get("/", (c) => {
    return c.json({
      ok: true,
      service: "ingress",
      environment: c.env.ENVIRONMENT ?? "local",
      phase: phaseLabel,
    });
  });

  app.get("/health", (c) => {
    return c.json({
      ok: true,
      transport: "cloudflare-worker",
      phase: phaseLabel,
    });
  });

  app.get("/webhooks/whatsapp", async (c) => {
    const configuredVerifyToken = c.env.META_VERIFY_TOKEN;
    if (!configuredVerifyToken) {
      return c.text("Webhook configuration error", 500);
    }

    const result = getWebhookVerificationResult(
      c.req.query("hub.mode") ?? null,
      c.req.query("hub.verify_token") ?? null,
      c.req.query("hub.challenge") ?? null,
      configuredVerifyToken,
    );

    if (!result.ok) {
      return c.newResponse(result.body, result.status);
    }

    const markWebhookVerified =
      deps.markWebhookVerified ?? markWebhookVerifiedViaConvex;
    try {
      await markWebhookVerified(c.env, {
        verifyToken: c.req.query("hub.verify_token") ?? "",
        verifiedAt: Date.now(),
      });
    } catch (error) {
      console.error("WhatsApp verification tracking failed", error);
    }

    return c.text(result.body, 200);
  });

  app.post("/webhooks/whatsapp", async (c) => {
    if (c.req.raw.bodyUsed) {
      return c.json(
        {
          ok: false,
          phase: phaseLabel,
          status: "raw_body_consumed",
          message:
            "Raw request body was consumed before signature verification.",
        },
        500,
      );
    }

    const appSecret = c.env.META_APP_SECRET;
    if (!appSecret) {
      return c.text("Webhook configuration error", 500);
    }

    const rawBody = await readRawBodyPreservingRequest(c.req.raw);
    const signatureValid = await verifyMetaSignature({
      rawBody,
      signatureHeader: c.req.header("x-hub-signature-256"),
      appSecret,
    });

    if (!signatureValid) {
      return c.json(
        {
          ok: false,
          phase: phaseLabel,
          status: "invalid_signature",
        },
        401,
      );
    }

    let payload: ReturnType<typeof parseWebhookPayload>;
    try {
      payload = parseWebhookPayload(rawBody);
    } catch {
      return c.json(
        {
          ok: false,
          phase: phaseLabel,
          status: "invalid_json",
        },
        400,
      );
    }

    const phoneNumberId = extractPhoneNumberId(payload) ?? "unknown";
    const applyRateLimit = deps.applyRateLimit ?? applyPhoneNumberRateLimit;
    const rateLimitResult = await applyRateLimit(c.env, phoneNumberId);
    if (!rateLimitResult.success) {
      return c.json(
        {
          ok: false,
          phase: phaseLabel,
          status: "rate_limited",
          phoneNumberId,
        },
        429,
      );
    }

    const persistWebhookEvent =
      deps.persistWebhookEvent ?? persistWebhookEventViaConvex;
    const receivedAt = Date.now();
    const mediaWork = deriveMediaWork(payload, receivedAt);
    const eventKey = await buildWebhookEventKey(payload, rawBody);

    try {
      const result = await persistWebhookEvent(c.env, {
        receivedAt,
        eventKey,
        eventType: deriveEventType(payload),
        rawPayload: rawBody,
        signatureValid: true,
        phoneNumberId: phoneNumberId === "unknown" ? undefined : phoneNumberId,
        businessAccountId: extractBusinessAccountId(payload),
        providerEventId: eventKey.split(":").pop(),
        mediaDownloadEnqueued: mediaWork.mediaDownloadEnqueued,
        mediaDownloadPriority: mediaWork.mediaDownloadPriority,
        mediaDownloadDeadlineAt: mediaWork.mediaDownloadDeadlineAt,
      });

      return c.json(
        {
          ok: true,
          phase: phaseLabel,
          duplicate: result.duplicate,
          processingStatus: result.processingStatus,
          mediaWorkEnqueued: result.mediaWorkEnqueued,
        },
        200,
      );
    } catch (error) {
      console.error("WhatsApp raw event durability failed", error);
      return c.json(
        {
          ok: false,
          phase: phaseLabel,
          status: "durability_failed",
        },
        502,
      );
    }
  });

  return app;
}

const app = createIngressApp();

export default app;
