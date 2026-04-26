"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { resolveBillingGatewayForCountry, type BillingCurrency } from "@wabrix/config";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted">
        <div
          className="h-2.5 rounded-full bg-primary transition-[width]"
          style={{ width: `${ratio}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{ratio}% used</p>
    </div>
  );
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "n/a";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(locale: string, timestamp: number | null | undefined) {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusVariant(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();

  if (
    normalized === "active" ||
    normalized === "paid" ||
    normalized === "succeeded" ||
    normalized === "completed"
  ) {
    return "default" as const;
  }

  if (
    normalized === "failed" ||
    normalized === "past_due" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "expired"
  ) {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export function BillingClient({
  locale,
  detectedCountry,
  copy,
}: BillingClientProps) {
  const billingState = useQuery(api.billing.getBillingDashboardState, {});
  const [selectedCountry, setSelectedCountry] = React.useState(detectedCountry);
  const [isPending, startTransition] = React.useTransition();

  if (billingState === undefined) {
    return <p className="text-sm text-muted-foreground">{copy.loading}</p>;
  }

  const presentation = resolveBillingGatewayForCountry(selectedCountry);
  const currentPlan = billingState.currentSubscription
    ? billingState.planCatalog.find(
        (plan) => plan.key === billingState.currentSubscription?.planKey,
      )
    : null;

  const periodLabel = billingState.currentSubscription
    ? `${formatDate(locale, billingState.currentSubscription.currentPeriodStart)} - ${formatDate(
        locale,
        billingState.currentSubscription.currentPeriodEnd,
      )}`
    : "—";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="space-y-1">
            <CardTitle>{copy.currentPlan}</CardTitle>
            <CardDescription>
              Subscription state, billing period, and routed checkout gateway for the active
              tenant.
            </CardDescription>
          </div>
          <CardAction className="w-full sm:w-auto">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">{copy.countryLabel}</span>
              <select
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-40 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-[3px]"
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
              >
                <option value="ID">Indonesia</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="AU">Australia</option>
              </select>
            </label>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-6 pt-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {billingState.currentSubscription ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {currentPlan?.name ?? billingState.currentSubscription.planKey}
                  </h2>
                  <Badge variant={getStatusVariant(billingState.currentSubscription.status)}>
                    {formatStatusLabel(billingState.currentSubscription.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.tagline ?? billingState.currentSubscription.planKey}
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">Starter</h2>
                  <Badge variant="secondary">Default entitlement</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{copy.noSubscription}</p>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.status}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatStatusLabel(billingState.currentSubscription?.status ?? "starter")}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.period}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{periodLabel}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.gateway}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatStatusLabel(
                  billingState.currentSubscription?.gateway ?? presentation.gateway,
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="border-b">
            <div className="space-y-1">
              <CardTitle>{copy.usage}</CardTitle>
              <CardDescription>
                Live quota usage from the current billing period.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="space-y-1">
              <CardTitle>{copy.recentEvents}</CardTitle>
              <CardDescription>
                Audited checkout and payment events for this workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {billingState.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.noEvents}</p>
            ) : (
              billingState.recentEvents.map((event) => (
                <div key={event.id} className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {formatStatusLabel(event.eventType)}
                      </p>
                      <p className="text-muted-foreground">
                        {formatStatusLabel(event.gateway)} · {formatDate(locale, event.createdAt)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(event.status)}>
                      {formatStatusLabel(event.status)}
                    </Badge>
                  </div>
                  <Separator className="my-3" />
                  <p className="font-medium text-foreground">
                    {event.amount != null && event.currency
                      ? formatPrice(event.currency, event.amount)
                      : "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="space-y-1">
            <CardTitle>{copy.managePlans}</CardTitle>
            <CardDescription>
              Compare monthly pricing and included usage before starting checkout.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-1 xl:grid-cols-3">
          {billingState.planCatalog.map((plan) => {
            const amount =
              presentation.currency === "IDR"
                ? plan.monthlyPriceIdr
                : plan.monthlyPriceUsdCents;
            const isCurrentPlan = billingState.currentSubscription?.planKey === plan.key;

            return (
              <article
                key={plan.key}
                className="flex h-full flex-col rounded-lg border bg-muted/20 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                      {isCurrentPlan ? <Badge variant="secondary">Current plan</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-foreground">
                      {formatPrice(presentation.currency, amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{copy.perMonth}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.aiTokens}</span>
                    <span className="font-medium text-foreground">
                      {plan.includedAiTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.outboundMessages}</span>
                    <span className="font-medium text-foreground">
                      {plan.includedOutboundMessages.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.seats}</span>
                    <span className="font-medium text-foreground">
                      {plan.includedSeats.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-5 w-full"
                  disabled={isPending || isCurrentPlan}
                  variant={isCurrentPlan ? "outline" : "default"}
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
                  {isCurrentPlan
                    ? "Current plan"
                    : isPending
                      ? copy.checkoutPending
                      : billingState.currentSubscription
                        ? "Upgrade"
                        : "Subscribe"}
                </Button>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
