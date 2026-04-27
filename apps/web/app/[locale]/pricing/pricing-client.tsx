"use client";

import React from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  billingPlanDefinitions,
  resolveBillingGatewayForCountry,
  type BillingCurrency,
} from "@wabrix/config";
import { Button } from "@wabrix/ui/button";

type PricingClientProps = {
  locale: string;
  detectedCountry: string;
  copy: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    countryLabel: string;
    providerLabel: string;
    currencyLabel: string;
    cta: string;
    perMonth: string;
    seats: string;
    aiTokens: string;
    outboundMessages: string;
  };
};

function formatPrice(currency: BillingCurrency, amount: number) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / (currency === "IDR" ? 1 : 100));
}

export function PricingClient({
  locale,
  detectedCountry,
  copy,
}: PricingClientProps) {
  const [selectedCountry, setSelectedCountry] = useState(detectedCountry);
  const presentation = useMemo(
    () => resolveBillingGatewayForCountry(selectedCountry),
    [selectedCountry],
  );

  return (
    <section className="space-y-8">
      <div className="rounded-[1.75rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">
          {copy.headline}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
          {copy.subheadline}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm text-stone-700">
            <span className="font-medium">{copy.countryLabel}</span>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
            >
              <option value="ID">Indonesia</option>
              <option value="US">United States</option>
              <option value="SG">Singapore</option>
              <option value="AU">Australia</option>
            </select>
          </label>
          <div className="rounded-xl border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700">
            <p className="font-medium">{copy.providerLabel}</p>
            <p className="mt-2 capitalize">{presentation.gateway}</p>
          </div>
          <div className="rounded-xl border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700">
            <p className="font-medium">{copy.currencyLabel}</p>
            <p className="mt-2">{presentation.currency}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {billingPlanDefinitions.map((plan) => {
          const amount =
            presentation.currency === "IDR"
              ? plan.monthlyPriceIdr
              : plan.monthlyPriceUsdCents;

          return (
            <article
              key={plan.key}
              className="rounded-[1.75rem] border border-stone-300/70 bg-white p-6 shadow-[0_18px_55px_rgba(24,37,31,0.08)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                {plan.name}
              </p>
              <p className="mt-4 text-4xl font-semibold text-stone-950">
                {formatPrice(presentation.currency, amount)}
              </p>
              <p className="mt-2 text-sm text-stone-600">{copy.perMonth}</p>
              <p className="mt-4 text-sm leading-7 text-stone-700">{plan.tagline}</p>
              <ul className="mt-6 space-y-3 text-sm text-stone-700">
                <li>
                  {copy.aiTokens}: {plan.includedAiTokens.toLocaleString()}
                </li>
                <li>
                  {copy.outboundMessages}: {plan.includedOutboundMessages.toLocaleString()}
                </li>
                <li>
                  {copy.seats}: {plan.includedSeats.toLocaleString()}
                </li>
              </ul>
              <Link href={`/${locale}/dashboard/billing`} className="mt-6 block">
                <Button className="w-full">{copy.cta}</Button>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
