"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import {
  resolveBillingGatewayForCountry,
  type BillingCurrency,
} from "@wabrix/config";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PageContainer from "@/components/layout/page-container";
import { Icons } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { billingInfoContent } from "@/config/infoconfig";

function formatPrice(currency: BillingCurrency, amount: number) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / (currency === "IDR" ? 1 : 100));
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusVariant(
  status?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "trialing") {
    return "default";
  }

  if (status === "past_due" || status === "incomplete") {
    return "secondary";
  }

  if (status === "canceled" || status === "expired" || status === "unpaid") {
    return "destructive";
  }

  return "outline";
}

function UsageCard({
  title,
  used,
  limit,
  icon: Icon,
}: {
  title: string;
  used: number;
  limit: number;
  icon: typeof Icons.sparkles;
}) {
  const ratio = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4" />
          {title}
        </CardDescription>
        <CardTitle className="text-xl">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Progress value={ratio} />
        <p className="text-muted-foreground mt-2 text-xs">
          {ratio}% of your monthly limit used
        </p>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const { organization, isLoaded } = useOrganization();
  const searchParams = useSearchParams();
  const billingState = useQuery(
    api.billing.getBillingDashboardState,
    isLoaded && organization ? {} : "skip",
  ) as
    | {
        currentPlan: { key: string; name: string; tagline: string } | null;
        currentSubscription: {
          planKey: string;
          status: string;
          gateway: string;
          billingCountry: string;
          currency: BillingCurrency;
          amount: number;
          currentPeriodStart?: number | null;
          currentPeriodEnd?: number | null;
        } | null;
        currentUsage: {
          aiTokensUsed: number;
          aiTokensLimit: number;
          outboundMessagesUsed: number;
          outboundMessagesLimit: number;
          seatsUsed: number;
          seatsLimit: number;
        };
        recentEvents: Array<{
          id: string;
          eventType: string;
          status: string;
          gateway: string;
          currency?: BillingCurrency | null;
          amount?: number | null;
          createdAt: number;
        }>;
        planCatalog: Array<{
          key: string;
          name: string;
          tagline: string;
          monthlyPriceUsdCents: number;
          monthlyPriceIdr: number;
          includedAiTokens: number;
          includedOutboundMessages: number;
          includedSeats: number;
        }>;
      }
    | undefined;
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [isPending, startTransition] = useTransition();
  const handledCheckoutState = useRef<string | null>(null);

  useEffect(() => {
    const fallbackCountry =
      billingState?.currentSubscription?.billingCountry ?? "US";
    setSelectedCountry((current) =>
      current === "US" ? fallbackCountry : current,
    );
  }, [billingState?.currentSubscription?.billingCountry]);

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");

    if (!checkoutState || handledCheckoutState.current === checkoutState) {
      return;
    }

    handledCheckoutState.current = checkoutState;

    if (checkoutState === "success") {
      toast.success(
        "Checkout completed. Billing data will refresh after the provider webhook is processed.",
      );
    }

    if (checkoutState === "return") {
      toast.success(
        "Returned from checkout. You can review your subscription status below.",
      );
    }
  }, [searchParams]);

  const presentation = useMemo(
    () => resolveBillingGatewayForCountry(selectedCountry),
    [selectedCountry],
  );

  const currentPlan = useMemo(() => {
    if (billingState?.currentPlan) {
      return billingState.currentPlan;
    }

    if (!billingState?.currentSubscription) {
      return null;
    }

    return (
      billingState.planCatalog.find(
        (plan: { key: string }) =>
          plan.key === billingState.currentSubscription?.planKey,
      ) ?? null
    );
  }, [billingState?.currentSubscription, billingState?.planCatalog]);

  const startCheckout = (planKey: string) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planKey,
            billingCountry: selectedCountry,
          }),
        });

        const payload = (await response.json()) as {
          checkoutUrl?: string;
          error?: string;
        };

        if (!response.ok || !payload.checkoutUrl) {
          throw new Error(
            payload.error || "Failed to create checkout session.",
          );
        }

        window.location.assign(payload.checkoutUrl);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to create checkout session.",
        );
      }
    });
  };

  return (
    <PageContainer
      isLoading={
        !isLoaded || (organization != null && billingState === undefined)
      }
      access={!!organization}
      accessFallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold">No Organization Selected</h2>
            <p className="text-muted-foreground">
              Please select or create an organization to view billing
              information.
            </p>
          </div>
        </div>
      }
      infoContent={billingInfoContent}
      pageTitle="Billing & Plans"
      pageDescription={`Manage your subscription and usage limits for ${organization?.name ?? "your workspace"}`}
    >
      <div className="space-y-6">
        <Alert>
          <Icons.info className="h-4 w-4" />
          <AlertDescription>
            Review your current plan, monthly usage, recent billing activity,
            and start checkout for a different plan.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <CardDescription>Current Plan</CardDescription>
                  <CardTitle className="text-2xl">
                    {currentPlan?.name ?? "No active subscription"}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={getStatusVariant(
                        billingState?.currentSubscription?.status,
                      )}
                    >
                      {billingState?.currentSubscription?.status ??
                        "not_subscribed"}
                    </Badge>
                    {billingState?.currentSubscription?.gateway ? (
                      <Badge variant="outline">
                        {billingState.currentSubscription.gateway}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="w-full space-y-2 md:max-w-[220px]">
                  <CardDescription>Billing Country</CardDescription>
                  <Select
                    value={selectedCountry}
                    onValueChange={setSelectedCountry}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ID">Indonesia</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3 md:gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Billing status
                  </p>
                  <p className="font-semibold">
                    {billingState?.currentSubscription?.status ??
                      "No subscription"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Current period
                  </p>
                  <p className="font-semibold">
                    {formatDate(
                      billingState?.currentSubscription?.currentPeriodStart,
                    )}{" "}
                    to{" "}
                    {formatDate(
                      billingState?.currentSubscription?.currentPeriodEnd,
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Current price
                  </p>
                  <p className="font-semibold">
                    {billingState?.currentSubscription?.amount != null &&
                    billingState.currentSubscription.currency
                      ? formatPrice(
                          billingState.currentSubscription.currency,
                          billingState.currentSubscription.amount,
                        )
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <UsageCard
                title="AI Tokens"
                used={billingState?.currentUsage.aiTokensUsed ?? 0}
                limit={billingState?.currentUsage.aiTokensLimit ?? 0}
                icon={Icons.sparkles}
              />
              <UsageCard
                title="Outbound Messages"
                used={billingState?.currentUsage.outboundMessagesUsed ?? 0}
                limit={billingState?.currentUsage.outboundMessagesLimit ?? 0}
                icon={Icons.send}
              />
              <UsageCard
                title="Seats"
                used={billingState?.currentUsage.seatsUsed ?? 0}
                limit={billingState?.currentUsage.seatsLimit ?? 0}
                icon={Icons.teams}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Billing Events</CardTitle>
                <CardDescription>
                  Latest checkout, renewal, and subscription state updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingState?.recentEvents.length ? (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Gateway</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billingState.recentEvents.map((event) => (
                            <TableRow key={String(event.id)}>
                              <TableCell className="font-medium">
                                {event.eventType}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(event.status)}>
                                  {event.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="uppercase">
                                {event.gateway}
                              </TableCell>
                              <TableCell>
                                {event.amount != null && event.currency
                                  ? formatPrice(event.currency, event.amount)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatDate(event.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                      {billingState.recentEvents.map((event) => (
                        <div
                          key={String(event.id)}
                          className="border-border/50 bg-muted/20 space-y-3 rounded-xl border p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {event.eventType}
                            </p>
                            <Badge variant={getStatusVariant(event.status)}>
                              {event.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <p className="text-muted-foreground uppercase tracking-wider">
                                Gateway
                              </p>
                              <p className="font-medium uppercase">
                                {event.gateway}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground uppercase tracking-wider">
                                Amount
                              </p>
                              <p className="font-medium">
                                {event.amount != null && event.currency
                                  ? formatPrice(event.currency, event.amount)
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <p className="text-muted-foreground pt-1 text-[10px]">
                            {formatDate(event.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No billing events recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Manage Plans</CardTitle>
              <CardDescription>
                Pricing updates automatically based on the checkout provider for
                the selected billing country.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingState?.planCatalog.map(
                (plan: {
                  key: string;
                  name: string;
                  tagline: string;
                  monthlyPriceUsdCents: number;
                  monthlyPriceIdr: number;
                  includedAiTokens: number;
                  includedOutboundMessages: number;
                  includedSeats: number;
                }) => {
                  const amount =
                    presentation.currency === "IDR"
                      ? plan.monthlyPriceIdr
                      : plan.monthlyPriceUsdCents;
                  const isCurrentPlan =
                    billingState.currentSubscription?.planKey === plan.key;

                  return (
                    <div key={plan.key} className="rounded-xl border p-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{plan.name}</h3>
                            {isCurrentPlan ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Current Plan</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {plan.tagline}
                          </p>
                        </div>
                        <div className="flex items-baseline gap-1 sm:flex-col sm:items-end sm:gap-0">
                          <p className="text-xl font-bold">
                            {formatPrice(presentation.currency, amount)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            / month
                          </p>
                        </div>
                      </div>

                      <div className="text-muted-foreground mt-4 grid gap-1 text-sm">
                        <p>
                          AI tokens: {plan.includedAiTokens.toLocaleString()}
                        </p>
                        <p>
                          Outbound messages:{" "}
                          {plan.includedOutboundMessages.toLocaleString()}
                        </p>
                        <p>Seats: {plan.includedSeats.toLocaleString()}</p>
                      </div>

                      <Button
                        className="mt-4 w-full"
                        disabled={isPending || isCurrentPlan}
                        variant={isCurrentPlan ? "outline" : "default"}
                        onClick={() => startCheckout(plan.key)}
                      >
                        {isPending
                          ? "Opening checkout..."
                          : isCurrentPlan
                            ? "Current Plan"
                            : "Upgrade"}
                      </Button>
                    </div>
                  );
                },
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
