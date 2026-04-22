export const appName = "Wabrix";

export const appDescription =
  "Production-focused WhatsApp AI SaaS for reliable ingress, prompt-driven automation, and human handoff.";

export const supportedLocales = ["en", "id"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export const phaseLabel = "phase-10";

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
