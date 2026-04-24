export type BillingGateway = "polar" | "midtrans";

export type PlanKey = "starter" | "growth" | "scale";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  monthlyPriceUsdCents: number;
  monthlyPriceIdr: number;
  includedAiTokens: number;
  includedOutboundMessages: number;
  includedSeats: number;
  tagline: string;
};

export const DEFAULT_PLAN_DEFINITIONS: readonly PlanDefinition[] = [
  {
    key: "starter",
    name: "Starter",
    monthlyPriceUsdCents: 1900,
    monthlyPriceIdr: 249000,
    includedAiTokens: 50000,
    includedOutboundMessages: 500,
    includedSeats: 1,
    tagline: "Best for one team testing a real WhatsApp bot in production.",
  },
  {
    key: "growth",
    name: "Growth",
    monthlyPriceUsdCents: 7900,
    monthlyPriceIdr: 999000,
    includedAiTokens: 250000,
    includedOutboundMessages: 3000,
    includedSeats: 5,
    tagline: "Best for teams that need live support, automation, and reporting.",
  },
  {
    key: "scale",
    name: "Scale",
    monthlyPriceUsdCents: 19900,
    monthlyPriceIdr: 2499000,
    includedAiTokens: 1000000,
    includedOutboundMessages: 12000,
    includedSeats: 25,
    tagline: "Best for multi-agent operations with larger monthly traffic.",
  },
] as const;

export function getDefaultPlanDefinition(planKey: PlanKey) {
  const plan = DEFAULT_PLAN_DEFINITIONS.find((entry) => entry.key === planKey);

  if (!plan) {
    throw new Error(`Unknown plan key: ${planKey}`);
  }

  return plan;
}

export function normalizeBillingCountry(countryCode?: string | null) {
  return countryCode?.trim().toUpperCase() || "US";
}

export function resolveGatewayForCountry(countryCode?: string | null): {
  gateway: BillingGateway;
  currency: "USD" | "IDR";
} {
  const normalized = normalizeBillingCountry(countryCode);

  if (normalized === "ID" || normalized === "IDN") {
    return {
      gateway: "midtrans",
      currency: "IDR",
    };
  }

  return {
    gateway: "polar",
    currency: "USD",
  };
}

export function getUtcMonthPeriod(now: number) {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const periodStart = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  return {
    periodKey,
    periodStart,
  };
}

export function normalizePolarSubscriptionStatus(
  eventType: string,
  fallbackStatus?: string | null,
) {
  switch (eventType) {
    case "subscription.active":
      return "active" as const;
    case "subscription.past_due":
      return "past_due" as const;
    case "subscription.canceled":
    case "subscription.revoked":
      return "canceled" as const;
    case "subscription.created":
      return "incomplete" as const;
    default:
      if (fallbackStatus === "active") {
        return "active" as const;
      }
      if (fallbackStatus === "past_due") {
        return "past_due" as const;
      }
      if (fallbackStatus === "canceled") {
        return "canceled" as const;
      }
      if (fallbackStatus === "incomplete_expired") {
        return "incomplete_expired" as const;
      }
      return "incomplete" as const;
  }
}

export function normalizeMidtransSubscriptionStatus(
  transactionStatus?: string | null,
) {
  switch ((transactionStatus ?? "").toLowerCase()) {
    case "capture":
    case "settlement":
      return "active" as const;
    case "pending":
      return "incomplete" as const;
    case "expire":
      return "incomplete_expired" as const;
    case "cancel":
    case "deny":
      return "canceled" as const;
    default:
      return "incomplete" as const;
  }
}

export function buildUsageLimitErrorMessage(input: {
  kind: "ai_tokens" | "outbound_messages" | "seats";
  planName: string;
}) {
  switch (input.kind) {
    case "ai_tokens":
      return `Plan limit reached: ${input.planName} has no AI tokens left for the current billing period.`;
    case "outbound_messages":
      return `Plan limit reached: ${input.planName} has no outbound WhatsApp messages left for the current billing period.`;
    case "seats":
      return `Plan limit reached: ${input.planName} has no seat capacity left for the current billing period.`;
  }
}

export function clampRatio(used: number, limit: number) {
  if (limit <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, used / limit));
}
