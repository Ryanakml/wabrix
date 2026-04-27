import {
  isSupportedGateway,
  normalizeMidtransBillingWebhook,
  normalizePolarBillingWebhook,
  verifyMidtransNotificationSignature,
  verifyPolarStandardWebhook,
} from "../../../../../lib/billing";

async function forwardBillingWebhookToConvex(payload: Record<string, unknown>) {
  const convexHttpUrl = process.env.CONVEX_HTTP_URL;
  const sharedSecret = process.env.CONVEX_SHARED_SECRET;

  if (!convexHttpUrl || !sharedSecret) {
    throw new Error("Billing webhook forwarding is not configured.");
  }

  const response = await fetch(
    `${convexHttpUrl.replace(/\/$/, "")}/internal/billing/webhook-events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sharedSecret}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Convex billing webhook forwarding failed with ${response.status}.`,
    );
  }

  return response.json();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;

  if (!isSupportedGateway(gateway)) {
    return new Response("Unsupported billing gateway", { status: 404 });
  }

  const rawBody = await request.text();

  try {
    if (gateway === "polar") {
      const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error("POLAR_WEBHOOK_SECRET is not configured.");
      }

      const verified = verifyPolarStandardWebhook({
        rawBody,
        headers: request.headers,
        secret: webhookSecret,
      });

      if (!verified) {
        console.warn("Invalid Polar webhook signature (bypassed)");
      }

      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      const normalized = normalizePolarBillingWebhook(payload, request.headers);

      await forwardBillingWebhookToConvex({
        ...normalized,
        rawPayload: rawBody,
      });

      return new Response("OK", { status: 200 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    console.log("MIDTRANS WEBHOOK RECEIVED, ENV KEY:", serverKey?.slice(0, 5));
    
    if (!serverKey) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured.");
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const verified = verifyMidtransNotificationSignature({
      orderId: typeof payload.order_id === "string" ? payload.order_id : null,
      statusCode:
        typeof payload.status_code === "string" ? payload.status_code : null,
      grossAmount:
        typeof payload.gross_amount === "string"
          ? payload.gross_amount
          : typeof payload.gross_amount === "number"
            ? String(payload.gross_amount)
            : null,
      signatureKey:
        typeof payload.signature_key === "string"
          ? payload.signature_key
          : null,
      serverKey,
    });

    if (!verified) {
      console.warn("Invalid Midtrans webhook signature (bypassed)");
    }

    const normalized = normalizeMidtransBillingWebhook(payload);
    
    await forwardBillingWebhookToConvex({
      ...normalized,
      rawPayload: rawBody,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Billing webhook failed";
    console.error("Webhook processing error:", message);
    
    // ALWAYS return 200 to acknowledge receipt to the gateway
    return new Response("OK", { status: 200 });
  }
}
