import crypto from "node:crypto";
import {
  getBillingPlanDefinition,
  resolveBillingGatewayForCountry,
  type BillingGateway,
  type PlanKey,
} from "@wabrix/config";

type HeaderSource = Headers | { get(name: string): string | null };

export function detectBillingCountry(
  headers: HeaderSource,
  overrideCountry?: string | null,
) {
  const override = overrideCountry?.trim().toUpperCase();

  if (override) {
    return override;
  }

  return (
    headers.get("cf-ipcountry")?.trim().toUpperCase() ||
    headers.get("x-vercel-ip-country")?.trim().toUpperCase() ||
    headers.get("x-country-code")?.trim().toUpperCase() ||
    "US"
  );
}

export function buildMidtransOrderId({
  clerkOrgId,
  planKey,
}: {
  clerkOrgId: string;
  planKey: PlanKey;
}) {
  return `wabrix__${clerkOrgId}__${planKey}__${Date.now()}`;
}

export function parseMidtransOrderId(orderId?: string | null) {
  if (!orderId?.startsWith("wabrix__")) {
    return null;
  }

  const parts = orderId.split("__");

  if (parts.length < 4) {
    return null;
  }

  const [, clerkOrgId, planKey] = parts;
  if (!clerkOrgId || !planKey) {
    return null;
  }

  return {
    clerkOrgId,
    planKey: planKey as PlanKey,
  };
}

function normalizeWebhookSecret(secret: string) {
  const normalized = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(normalized, "base64");
}

export function verifyPolarStandardWebhook({
  rawBody,
  headers,
  secret,
  toleranceSeconds = 300,
}: {
  rawBody: string;
  headers: HeaderSource;
  secret: string;
  toleranceSeconds?: number;
}) {
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const signingSecret = normalizeWebhookSecret(secret);
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(signedContent)
    .digest("base64");

  return webhookSignature
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const [version, signature] = entry.split(",", 2);
      if (version !== "v1" || !signature) {
        return false;
      }

      const expectedBuffer = Buffer.from(expected);
      const actualBuffer = Buffer.from(signature);
      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    });
}

export function verifyMidtransNotificationSignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
  serverKey,
}: {
  orderId?: string | null;
  statusCode?: string | null;
  grossAmount?: string | null;
  signatureKey?: string | null;
  serverKey: string;
}) {
  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureKey);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function getNestedString(
  input: Record<string, unknown> | undefined,
  path: string[],
): string | undefined {
  let cursor: unknown = input;

  for (const key of path) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }

  return typeof cursor === "string" ? cursor : undefined;
}

function getNestedNumber(
  input: Record<string, unknown> | undefined,
  path: string[],
): number | undefined {
  const value = getNestedString(input, path);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizePolarBillingWebhook(
  payload: Record<string, unknown>,
  headers: HeaderSource,
) {
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : undefined;
  const metadata =
    data?.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : undefined;
  const customer =
    data?.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : undefined;

  const planKey =
    getNestedString(metadata, ["planKey"]) ??
    getNestedString(data, ["product", "metadata", "planKey"]) ??
    undefined;
  const clerkOrgId =
    getNestedString(metadata, ["clerkOrgId"]) ??
    getNestedString(customer, ["external_id"]) ??
    getNestedString(payload, ["organization_id"]) ??
    undefined;

  return {
    gateway: "polar" as const,
    providerEventId: headers.get("webhook-id") ?? String(payload.id ?? payload.type ?? "polar"),
    eventType: String(payload.type ?? "polar.event"),
    status:
      getNestedString(data, ["status"]) ??
      getNestedString(data, ["subscription", "status"]) ??
      String(payload.type ?? "unknown"),
    clerkOrgId,
    planKey,
    billingCountry:
      getNestedString(customer, ["billing_address", "country"]) ??
      getNestedString(data, ["customer_billing_address", "country"]) ??
      getNestedString(metadata, ["billingCountry"]),
    currency:
      (getNestedString(data, ["currency"]) ??
        getNestedString(data, ["product_price", "price_currency"])) as "USD" | "IDR" | undefined,
    amount:
      getNestedNumber(data, ["total_amount"]) ??
      getNestedNumber(data, ["amount"]) ??
      getNestedNumber(data, ["product_price", "price_amount"]),
    providerCustomerId: getNestedString(customer, ["id"]),
    providerSubscriptionId:
      getNestedString(data, ["subscription", "id"]) ??
      (String(payload.type ?? "").startsWith("subscription.")
        ? getNestedString(data, ["id"])
        : undefined),
    providerCheckoutId:
      getNestedString(data, ["checkout", "id"]) ??
      (String(payload.type ?? "").startsWith("checkout.")
        ? getNestedString(data, ["id"])
        : undefined),
    providerOrderId:
      getNestedString(data, ["order", "id"]) ??
      (String(payload.type ?? "").startsWith("order.")
        ? getNestedString(data, ["id"])
        : undefined),
    externalReferenceId:
      getNestedString(customer, ["external_id"]) ??
      getNestedString(metadata, ["externalReferenceId"]) ??
      getNestedString(metadata, ["clerkOrgId"]),
    currentPeriodStart: getNestedNumber(data, ["subscription", "current_period_start"]),
    currentPeriodEnd: getNestedNumber(data, ["subscription", "current_period_end"]),
    cancelAtPeriodEnd:
      (data?.subscription &&
      typeof (data.subscription as Record<string, unknown>).cancel_at_period_end === "boolean"
        ? ((data.subscription as Record<string, unknown>).cancel_at_period_end as boolean)
        : undefined),
    canceledAt: getNestedNumber(data, ["subscription", "canceled_at"]),
  };
}

export function normalizeMidtransBillingWebhook(payload: Record<string, unknown>) {
  const orderId = typeof payload.order_id === "string" ? payload.order_id : undefined;
  const parsedOrder = parseMidtransOrderId(orderId);
  const currency =
    typeof payload.currency === "string" && payload.currency.toUpperCase() === "IDR"
      ? "IDR"
      : ("IDR" as const);

  return {
    gateway: "midtrans" as const,
    providerEventId:
      (typeof payload.transaction_id === "string" && payload.transaction_id) ||
      `${orderId ?? "midtrans"}:${String(payload.transaction_status ?? "unknown")}`,
    eventType: "midtrans.payment_notification",
    status: String(payload.transaction_status ?? "pending"),
    clerkOrgId: parsedOrder?.clerkOrgId,
    planKey: parsedOrder?.planKey,
    billingCountry: "ID",
    currency,
    amount:
      typeof payload.gross_amount === "string"
        ? Number(payload.gross_amount)
        : typeof payload.gross_amount === "number"
          ? payload.gross_amount
          : undefined,
    providerCustomerId: undefined,
    providerSubscriptionId: undefined,
    providerCheckoutId: undefined,
    providerOrderId: orderId,
    externalReferenceId: orderId,
    currentPeriodStart: undefined,
    currentPeriodEnd: undefined,
    cancelAtPeriodEnd: undefined,
    canceledAt: undefined,
  };
}

export async function createPolarCheckoutSession(input: {
  accessToken: string;
  planKey: PlanKey;
  clerkOrgId: string;
  billingCountry: string;
  successUrl: string;
  returnUrl: string;
}) {
  const productEnvMap: Record<PlanKey, string | undefined> = {
    starter: process.env.POLAR_STARTER_PRODUCT_ID,
    growth: process.env.POLAR_GROWTH_PRODUCT_ID,
    scale: process.env.POLAR_SCALE_PRODUCT_ID,
  };
  const productId = productEnvMap[input.planKey];

  if (!productId) {
    throw new Error(`Missing Polar product ID env for plan ${input.planKey}.`);
  }

  const response = await fetch("https://api.polar.sh/v1/checkouts/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: [productId],
      success_url: input.successUrl,
      return_url: input.returnUrl,
      customer_billing_address: {
        country: input.billingCountry,
      },
      external_customer_id: input.clerkOrgId,
      metadata: {
        clerkOrgId: input.clerkOrgId,
        planKey: input.planKey,
        billingCountry: input.billingCountry,
      },
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      (payload.error as string | undefined) ||
        `Polar checkout creation failed with status ${response.status}.`,
    );
  }

  return {
    gateway: "polar" as const,
    currency: "USD" as const,
    checkoutUrl: String(payload.url),
    providerCheckoutId: typeof payload.id === "string" ? payload.id : undefined,
    rawPayload: JSON.stringify(payload),
  };
}

export async function createMidtransCheckoutSession(input: {
  serverKey: string;
  planKey: PlanKey;
  clerkOrgId: string;
  appUrl: string;
}) {
  const plan = getBillingPlanDefinition(input.planKey);
  const orderId = buildMidtransOrderId({
    clerkOrgId: input.clerkOrgId,
    planKey: input.planKey,
  });
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
  const authToken = Buffer.from(`${input.serverKey}:`).toString("base64");

  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.monthlyPriceIdr,
      },
      item_details: [
        {
          id: input.planKey,
          price: plan.monthlyPriceIdr,
          quantity: 1,
          name: `${plan.name} Monthly`,
        },
      ],
      callbacks: {
        finish: `${input.appUrl.replace(/\/$/, "")}/billing/complete`,
      },
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      (payload.error_messages as string[] | undefined)?.[0] ||
        `Midtrans checkout creation failed with status ${response.status}.`,
    );
  }

  return {
    gateway: "midtrans" as const,
    currency: "IDR" as const,
    checkoutUrl: String(payload.redirect_url),
    providerOrderId: orderId,
    rawPayload: JSON.stringify(payload),
  };
}

export function resolveCheckoutPresentation(countryCode?: string | null) {
  const billingCountry = detectBillingCountry(
    {
      get() {
        return null;
      },
    },
    countryCode,
  );
  return {
    billingCountry,
    ...resolveBillingGatewayForCountry(billingCountry),
  };
}

export function isSupportedGateway(value: string): value is BillingGateway {
  return value === "polar" || value === "midtrans";
}
