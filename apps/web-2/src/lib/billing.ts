import crypto from 'node:crypto';
import { getBillingPlanDefinition, resolveBillingGatewayForCountry, type PlanKey } from '@wabrix/config';

type HeaderSource = Headers | { get(name: string): string | null };

export function detectBillingCountry(headers: HeaderSource, overrideCountry?: string | null) {
  const override = overrideCountry?.trim().toUpperCase();

  if (override) {
    return override;
  }

  return (
    headers.get('cf-ipcountry')?.trim().toUpperCase() ||
    headers.get('x-vercel-ip-country')?.trim().toUpperCase() ||
    headers.get('x-country-code')?.trim().toUpperCase() ||
    'US'
  );
}

function buildMidtransOrderId() {
  return `trx_${Date.now()}`;
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
    scale: process.env.POLAR_SCALE_PRODUCT_ID
  };
  const productId = productEnvMap[input.planKey];

  if (!productId) {
    throw new Error(`Missing Polar product ID env for plan ${input.planKey}.`);
  }

  const response = await fetch('https://api.polar.sh/v1/checkouts/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products: [productId],
      success_url: input.successUrl,
      return_url: input.returnUrl,
      customer_billing_address: {
        country: input.billingCountry
      },
      external_customer_id: input.clerkOrgId,
      metadata: {
        clerkOrgId: input.clerkOrgId,
        planKey: input.planKey,
        billingCountry: input.billingCountry
      }
    })
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      (payload.error as string | undefined) ||
        `Polar checkout creation failed with status ${response.status}.`
    );
  }

  return {
    gateway: 'polar' as const,
    currency: 'USD' as const,
    checkoutUrl: String(payload.url),
    providerCheckoutId: typeof payload.id === 'string' ? payload.id : undefined,
    rawPayload: JSON.stringify(payload)
  };
}

export async function createMidtransCheckoutSession(input: {
  serverKey: string;
  planKey: PlanKey;
  clerkOrgId: string;
  appUrl: string;
}) {
  const plan = getBillingPlanDefinition(input.planKey);
  const orderId = buildMidtransOrderId();
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
  const authToken = Buffer.from(`${input.serverKey}:`).toString('base64');

  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.monthlyPriceIdr
      },
      item_details: [
        {
          id: input.planKey,
          price: plan.monthlyPriceIdr,
          quantity: 1,
          name: `${plan.name} Monthly`
        }
      ],
      callbacks: {
        finish: `${input.appUrl.replace(/\/$/, '')}/dashboard/billing?checkout=success`
      },
      custom_field1: input.clerkOrgId,
      custom_field2: input.planKey
    })
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      (payload.error_messages as string[] | undefined)?.[0] ||
        `Midtrans checkout creation failed with status ${response.status}.`
    );
  }

  return {
    gateway: 'midtrans' as const,
    currency: 'IDR' as const,
    checkoutUrl: String(payload.redirect_url),
    providerOrderId: orderId,
    rawPayload: JSON.stringify(payload)
  };
}

export function resolveCheckoutPresentation(countryCode?: string | null) {
  const billingCountry = detectBillingCountry(
    {
      get() {
        return null;
      }
    },
    countryCode
  );

  return {
    billingCountry,
    ...resolveBillingGatewayForCountry(billingCountry)
  };
}

export function verifyMidtransNotificationSignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
  serverKey
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
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureKey);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
