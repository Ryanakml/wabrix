export const appName = "Wabrix";

export const appDescription =
  "Production-focused WhatsApp AI SaaS for reliable ingress, prompt-driven automation, and human handoff.";

export const supportedLocales = ["en", "id"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export const phaseLabel = "phase-1";
