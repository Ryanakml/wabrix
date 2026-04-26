import { readFile } from "node:fs/promises";
import path from "node:path";
import { defaultLocale, type SupportedLocale } from "@wabrix/config";

export const marketingDocSlugs = [
  "whatsapp-setup",
  "waba-lifecycle",
  "template-approval",
  "service-window-rules",
] as const;

export type MarketingDocSlug = (typeof marketingDocSlugs)[number];

type DocMeta = {
  title: string;
  description: string;
  category: string;
};

const docMeta: Record<
  MarketingDocSlug,
  Record<SupportedLocale, DocMeta>
> = {
  "whatsapp-setup": {
    en: {
      title: "WhatsApp Setup",
      description:
        "Practical setup flow for Meta app credentials, webhook URLs, phone verification, and bot linkage.",
      category: "Operations",
    },
    id: {
      title: "Setup WhatsApp",
      description:
        "Flow setup praktis untuk kredensial Meta app, URL webhook, verifikasi nomor, dan link ke bot.",
      category: "Operasional",
    },
  },
  "waba-lifecycle": {
    en: {
      title: "WABA Lifecycle",
      description:
        "What approval, verification, display-name review, and messaging-tier state mean in daily operations.",
      category: "Compliance",
    },
    id: {
      title: "Lifecycle WABA",
      description:
        "Arti status approval, verification, review display name, dan messaging tier dalam operasi harian.",
      category: "Compliance",
    },
  },
  "template-approval": {
    en: {
      title: "Template Approval",
      description:
        "How approved templates move from sync, review, rejection debugging, and fallback usage in inbox.",
      category: "Messaging",
    },
    id: {
      title: "Approval Template",
      description:
        "Bagaimana template approved bergerak dari sync, review, debugging rejection, sampai fallback di inbox.",
      category: "Messaging",
    },
  },
  "service-window-rules": {
    en: {
      title: "Service-Window Rules",
      description:
        "Simple rules for the 24-hour customer care window, freeform reply eligibility, and template fallback.",
      category: "Policy",
    },
    id: {
      title: "Aturan Service Window",
      description:
        "Aturan simpel untuk customer care window 24 jam, kelayakan freeform reply, dan fallback template.",
      category: "Kebijakan",
    },
  },
};

export function isMarketingDocSlug(value: string): value is MarketingDocSlug {
  return marketingDocSlugs.includes(value as MarketingDocSlug);
}

export function getMarketingDocSummaries(locale: SupportedLocale) {
  return marketingDocSlugs.map((slug) => ({
    slug,
    ...docMeta[slug][locale],
  }));
}

export function getMarketingDocMeta(locale: SupportedLocale, slug: MarketingDocSlug) {
  return docMeta[slug][locale];
}

export async function getMarketingDocContent(
  locale: SupportedLocale,
  slug: MarketingDocSlug,
) {
  const preferredPath = path.join(
    process.cwd(),
    "apps",
    "web",
    "content",
    "docs",
    locale,
    `${slug}.md`,
  );

  try {
    return await readFile(preferredPath, "utf8");
  } catch {
    const fallbackPath = path.join(
      process.cwd(),
      "apps",
      "web",
      "content",
      "docs",
      defaultLocale,
      `${slug}.md`,
    );
    return readFile(fallbackPath, "utf8");
  }
}
