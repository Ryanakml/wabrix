import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getBillingPlanDefinition, type PlanKey } from '@wabrix/config';
import {
  createMidtransCheckoutSession,
  createPolarCheckoutSession,
  detectBillingCountry,
  resolveCheckoutPresentation
} from '@/lib/billing';

type CheckoutRequestBody = {
  planKey?: PlanKey;
  billingCountry?: string;
};

function isPlanKey(value: unknown): value is PlanKey {
  return value === 'starter' || value === 'growth' || value === 'scale';
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CheckoutRequestBody;
  if (!isPlanKey(body.planKey)) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const plan = getBillingPlanDefinition(body.planKey);
  const billingCountry = detectBillingCountry(request.headers, body.billingCountry);
  const presentation = resolveCheckoutPresentation(billingCountry);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const successUrl = `${appUrl.replace(/\/$/, '')}/dashboard/billing?checkout=success`;
  const returnUrl = `${appUrl.replace(/\/$/, '')}/dashboard/billing?checkout=return`;

  try {
    if (presentation.gateway === 'polar') {
      const accessToken = process.env.POLAR_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('POLAR_ACCESS_TOKEN is not configured.');
      }

      const checkout = await createPolarCheckoutSession({
        accessToken,
        planKey: body.planKey,
        clerkOrgId: orgId,
        billingCountry,
        successUrl,
        returnUrl
      });

      return NextResponse.json({
        gateway: checkout.gateway,
        currency: checkout.currency,
        billingCountry,
        planName: plan.name,
        checkoutUrl: checkout.checkoutUrl,
        providerCheckoutId: checkout.providerCheckoutId
      });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY is not configured.');
    }

    const checkout = await createMidtransCheckoutSession({
      serverKey,
      planKey: body.planKey,
      clerkOrgId: orgId,
      appUrl
    });

    return NextResponse.json({
      gateway: checkout.gateway,
      currency: checkout.currency,
      billingCountry,
      planName: plan.name,
      checkoutUrl: checkout.checkoutUrl,
      providerOrderId: checkout.providerOrderId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout creation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
