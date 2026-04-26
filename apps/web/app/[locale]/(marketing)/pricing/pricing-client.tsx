"use client";

import React from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  billingPlanDefinitions,
  resolveBillingGatewayForCountry,
  type BillingCurrency,
} from "@wabrix/config";
import { ArrowRight, Check, Globe2, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PricingClientProps = {
  locale: string;
  detectedCountry: string;
  copy: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    detectedLabel: string;
    indiaNotSupportedHint: string;
    gatewayLabel: string;
    currencyLabel: string;
    monthlyLabel: string;
    recommended: string;
    startCta: string;
    contactCta: string;
    regionIndonesia: string;
    regionGlobal: string;
    regionIndonesiaBody: string;
    regionGlobalBody: string;
    included: string;
    seats: string;
    aiTokens: string;
    outboundMessages: string;
    trustedLabel: string;
    trustedBody: string;
    docsCta: string;
    compareTitle: string;
    compareBody: string;
  };
};

function formatPrice(currency: BillingCurrency, amount: number) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / (currency === "IDR" ? 1 : 100));
}

function countryToTab(country: string) {
  return country === "ID" || country === "IDN" ? "id" : "global";
}

export function PricingClient({
  locale,
  detectedCountry,
  copy,
}: PricingClientProps) {
  const [region, setRegion] = useState(countryToTab(detectedCountry));
  const selectedCountry = region === "id" ? "ID" : "US";
  const presentation = useMemo(
    () => resolveBillingGatewayForCountry(selectedCountry),
    [selectedCountry],
  );

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-white/10 bg-slate-950 text-white shadow-[0_28px_90px_rgba(8,15,36,0.48)]">
        <CardHeader className="gap-4">
          <Badge className="w-fit rounded-full border border-white/10 bg-white/10 text-white">
            {copy.eyebrow}
          </Badge>
          <div className="space-y-3">
            <CardTitle className="text-4xl tracking-tight text-white sm:text-5xl">
              {copy.headline}
            </CardTitle>
            <CardDescription className="max-w-3xl text-base leading-8 text-slate-300">
              {copy.subheadline}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_0.68fr]">
          <Tabs
            value={region}
            onValueChange={setRegion}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">{copy.regionGlobal}</TabsTrigger>
              <TabsTrigger value="id">{copy.regionIndonesia}</TabsTrigger>
            </TabsList>
            <TabsContent value="global" className="space-y-4 pt-4">
              <p className="text-sm leading-7 text-slate-300">
                {copy.regionGlobalBody}
              </p>
            </TabsContent>
            <TabsContent value="id" className="space-y-4 pt-4">
              <p className="text-sm leading-7 text-slate-300">
                {copy.regionIndonesiaBody}
              </p>
            </TabsContent>
          </Tabs>

          <Card className="border-white/10 bg-white/8 text-white ring-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">{copy.compareTitle}</CardTitle>
              <CardDescription className="text-slate-300">
                {copy.compareBody}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>{copy.detectedLabel}</span>
                <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                  {detectedCountry}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>{copy.gatewayLabel}</span>
                <span className="font-medium capitalize">{presentation.gateway}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>{copy.currencyLabel}</span>
                <span className="font-medium">{presentation.currency}</span>
              </div>
              <p className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-cyan-100">
                {copy.trustedBody}
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {billingPlanDefinitions.map((plan) => {
          const amount =
            presentation.currency === "IDR"
              ? plan.monthlyPriceIdr
              : plan.monthlyPriceUsdCents;
          const recommended = plan.key === "growth";

          return (
            <Card
              key={plan.key}
              className="border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
            >
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl text-slate-950">{plan.name}</CardTitle>
                    <CardDescription className="mt-2 leading-7 text-slate-600">
                      {plan.tagline}
                    </CardDescription>
                  </div>
                  {recommended ? (
                    <Badge className="rounded-full">{copy.recommended}</Badge>
                  ) : null}
                </div>
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-slate-950">
                    {formatPrice(presentation.currency, amount)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{copy.monthlyLabel}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">{copy.included}</p>
                  <ul className="mt-3 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 text-slate-950" />
                      <span>
                        {copy.aiTokens}: {plan.includedAiTokens.toLocaleString()}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 text-slate-950" />
                      <span>
                        {copy.outboundMessages}:{" "}
                        {plan.includedOutboundMessages.toLocaleString()}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 text-slate-950" />
                      <span>
                        {copy.seats}: {plan.includedSeats.toLocaleString()}
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe2 className="size-4" />
                      <span>{copy.gatewayLabel}</span>
                    </div>
                    <p className="mt-2 font-medium capitalize text-slate-950">
                      {presentation.gateway}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Landmark className="size-4" />
                      <span>{copy.currencyLabel}</span>
                    </div>
                    <p className="mt-2 font-medium text-slate-950">
                      {presentation.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3 border-slate-200/70 bg-slate-50/70">
                <Button asChild className="w-full">
                  <Link href={`/${locale}/dashboard/billing`}>
                    {copy.startCta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${locale}/docs/service-window-rules`}>
                    {copy.docsCta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            {copy.trustedLabel}
          </Badge>
          <CardTitle className="text-2xl text-slate-950">{copy.contactCta}</CardTitle>
          <CardDescription className="max-w-3xl leading-7 text-slate-600">
            {copy.indiaNotSupportedHint}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
