import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { detectBillingCountry } from "@/lib/billing";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";
import { PricingClient } from "./pricing-client";

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PricingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing.seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/pricing",
    title: t("title"),
    description: t("description"),
    keywords: [
      "WhatsApp pricing",
      "Polar pricing",
      "Midtrans pricing",
      "WhatsApp SaaS plans",
    ],
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  const headerBag = await headers();
  const detectedCountry = detectBillingCountry(headerBag);

  return (
    <div className="pb-10 pt-10 sm:pt-14">
      <PricingClient
        locale={locale}
        detectedCountry={detectedCountry}
        copy={{
          eyebrow: t("eyebrow"),
          headline: t("headline"),
          subheadline: t("subheadline"),
          detectedLabel: t("detectedLabel"),
          indiaNotSupportedHint: t("indiaNotSupportedHint"),
          gatewayLabel: t("gatewayLabel"),
          currencyLabel: t("currencyLabel"),
          monthlyLabel: t("monthlyLabel"),
          recommended: t("recommended"),
          startCta: t("startCta"),
          contactCta: t("contactCta"),
          regionIndonesia: t("regionIndonesia"),
          regionGlobal: t("regionGlobal"),
          regionIndonesiaBody: t("regionIndonesiaBody"),
          regionGlobalBody: t("regionGlobalBody"),
          included: t("included"),
          seats: t("seats"),
          aiTokens: t("aiTokens"),
          outboundMessages: t("outboundMessages"),
          trustedLabel: t("trustedLabel"),
          trustedBody: t("trustedBody"),
          docsCta: t("docsCta"),
          compareTitle: t("compareTitle"),
          compareBody: t("compareBody"),
        }}
      />
    </div>
  );
}
