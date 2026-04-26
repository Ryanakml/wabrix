export const appName = "Wabrix";

export const appDescription =
  "Production-focused WhatsApp AI SaaS for reliable ingress, prompt-driven automation, and human handoff.";

export const supportedLocales = ["en", "id"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export const phaseLabel = "phase-13";

export type BillingGateway = "polar" | "midtrans";

export type BillingCurrency = "USD" | "IDR";

export type PlanKey = "starter" | "growth" | "scale";

export type BillingPlanDefinition = {
  key: PlanKey;
  name: string;
  monthlyPriceUsdCents: number;
  monthlyPriceIdr: number;
  includedAiTokens: number;
  includedOutboundMessages: number;
  includedSeats: number;
  tagline: string;
};

export const billingPlanDefinitions: readonly BillingPlanDefinition[] = [
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

export function getBillingPlanDefinition(planKey: PlanKey) {
  const plan = billingPlanDefinitions.find((entry) => entry.key === planKey);

  if (!plan) {
    throw new Error(`Unknown billing plan: ${planKey}`);
  }

  return plan;
}

export function resolveBillingGatewayForCountry(
  countryCode?: string | null,
): { gateway: BillingGateway; currency: BillingCurrency } {
  const normalized = countryCode?.trim().toUpperCase();

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

export const defaultBotName = "Customer Assistant";

export const defaultPromptTemplates = {
  id: [
    "Kamu adalah asisten WhatsApp untuk bisnis ini.",
    "Jawab dengan jelas, ramah, dan langsung ke inti.",
    "Kalau informasi tidak tersedia, katakan dengan jujur dan tawarkan langkah berikutnya.",
    "Jangan mengarang kebijakan, harga, atau jam operasional.",
  ].join(" "),
  en: [
    "You are the WhatsApp assistant for this business.",
    "Reply clearly, warmly, and with direct practical help.",
    "If information is missing, say so honestly and offer the next best step.",
    "Do not invent policies, prices, or operating hours.",
  ].join(" "),
} as const;
