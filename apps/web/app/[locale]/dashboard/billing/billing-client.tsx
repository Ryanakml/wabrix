"use client";

import React from "react";
import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { resolveBillingGatewayForCountry, type BillingCurrency } from "@wabrix/config";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@wabrix/ui/button";

type BillingClientProps = {
  locale: string;
  detectedCountry: string;
  copy: {
    loading: string;
    currentPlan: string;
    noSubscription: string;
    status: string;
    gateway: string;
    period: string;
    usage: string;
    aiTokens: string;
    outboundMessages: string;
    seats: string;
    recentEvents: string;
    noEvents: string;
    countryLabel: string;
    startCheckout: string;
    checkoutPending: string;
    checkoutFailed: string;
    managePlans: string;
    perMonth: string;
  };
};

function formatPrice(currency: BillingCurrency, amount: number) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / (currency === "IDR" ? 1 : 100));
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const ratio = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-stone-700">
        <span>{label}</span>
        <span>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-3 rounded-full bg-stone-200">
        <div
          className="h-3 rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

export function BillingClient({
  locale,
  detectedCountry,
  copy,
}: BillingClientProps) {
  const billingState = useQuery(api.billing.getBillingDashboardState, {});
  const [selectedCountry, setSelectedCountry] = useState(detectedCountry);
  const [isPending, startTransition] = useTransition();

  if (billingState === undefined) {
    return (
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white p-6 text-sm text-stone-700">
        {copy.loading}
      </section>
    );
  }

  const presentation = resolveBillingGatewayForCountry(selectedCountry);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6 rounded-[1.75rem] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              {copy.currentPlan}
            </p>
            {billingState.currentSubscription ? (
              <div className="mt-3 space-y-2 text-sm text-stone-700">
                <p className="text-2xl font-semibold text-stone-950">
                  {billingState.currentSubscription.planKey}
                </p>
                <p>
                  {copy.status}: {billingState.currentSubscription.status}
                </p>
                <p>
                  {copy.gateway}: {billingState.currentSubscription.gateway}
                </p>
                <p>
                  {copy.period}:{" "}
                  {billingState.currentSubscription.currentPeriodStart
                    ? new Date(
                        billingState.currentSubscription.currentPeriodStart,
                      ).toLocaleDateString(locale === "id" ? "id-ID" : "en-US")
                    : "—"}{" "}
                  to{" "}
                  {billingState.currentSubscription.currentPeriodEnd
                    ? new Date(
                        billingState.currentSubscription.currentPeriodEnd,
                      ).toLocaleDateString(locale === "id" ? "id-ID" : "en-US")
                    : "—"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-700">{copy.noSubscription}</p>
            )}
          </div>

          <label className="space-y-2 text-sm text-stone-700">
            <span className="font-medium">{copy.countryLabel}</span>
            <select
              className="rounded-xl border border-stone-300 bg-white px-3 py-2"
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
            >
              <option value="ID">Indonesia</option>
              <option value="US">United States</option>
              <option value="SG">Singapore</option>
              <option value="AU">Australia</option>
            </select>
          </label>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.usage}
          </p>
          <UsageBar
            label={copy.aiTokens}
            used={billingState.currentUsage.aiTokensUsed}
            limit={billingState.currentUsage.aiTokensLimit}
          />
          <UsageBar
            label={copy.outboundMessages}
            used={billingState.currentUsage.outboundMessagesUsed}
            limit={billingState.currentUsage.outboundMessagesLimit}
          />
          <UsageBar
            label={copy.seats}
            used={billingState.currentUsage.seatsUsed}
            limit={billingState.currentUsage.seatsLimit}
          />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.recentEvents}
          </p>
          {billingState.recentEvents.length === 0 ? (
            <p className="text-sm text-stone-600">{copy.noEvents}</p>
          ) : (
            <div className="space-y-3">
              {billingState.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
                >
                  <p className="font-medium text-stone-950">{event.eventType}</p>
                  <p className="mt-1">
                    {event.gateway} · {event.status}
                  </p>
                  <p className="mt-1">
                    {event.amount != null && event.currency
                      ? formatPrice(event.currency, event.amount)
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.75rem] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          {copy.managePlans}
        </p>
        {billingState.planCatalog.map((plan) => {
          const amount =
            presentation.currency === "IDR"
              ? plan.monthlyPriceIdr
              : plan.monthlyPriceUsdCents;

          return (
            <article
              key={plan.key}
              className="rounded-xl border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-stone-950">{plan.name}</p>
                  <p className="mt-2 text-sm text-stone-600">{plan.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-stone-950">
                    {formatPrice(presentation.currency, amount)}
                  </p>
                  <p className="text-xs text-stone-500">{copy.perMonth}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-stone-700">
                <p>
                  {copy.aiTokens}: {plan.includedAiTokens.toLocaleString()}
                </p>
                <p>
                  {copy.outboundMessages}: {plan.includedOutboundMessages.toLocaleString()}
                </p>
                <p>
                  {copy.seats}: {plan.includedSeats.toLocaleString()}
                </p>
              </div>

              <Button
                className="mt-5 w-full"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const response = await fetch("/api/billing/checkout", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          planKey: plan.key,
                          billingCountry: selectedCountry,
                          locale,
                        }),
                      });

                      const payload = (await response.json()) as {
                        checkoutUrl?: string;
                        error?: string;
                      };

                      if (!response.ok || !payload.checkoutUrl) {
                        throw new Error(payload.error || copy.checkoutFailed);
                      }

                      window.location.assign(payload.checkoutUrl);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : copy.checkoutFailed,
                      );
                    }
                  })
                }
              >
                {isPending ? copy.checkoutPending : copy.startCheckout}
              </Button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
