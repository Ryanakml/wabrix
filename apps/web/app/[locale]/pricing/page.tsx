import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { detectBillingCountry } from "../../../lib/billing";
import { PricingClient } from "./pricing-client";

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  const headerBag = await headers();
  const detectedCountry = detectBillingCountry(headerBag);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#1d1f32_0%,_#242943_42%,_#f4ecde_42%,_#f4ecde_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <PricingClient
          locale={locale}
          detectedCountry={detectedCountry}
          copy={{
            eyebrow: t("eyebrow"),
            headline: t("headline"),
            subheadline: t("subheadline"),
            countryLabel: t("countryLabel"),
            providerLabel: t("providerLabel"),
            currencyLabel: t("currencyLabel"),
            cta: t("cta"),
            perMonth: t("perMonth"),
            seats: t("seats"),
            aiTokens: t("aiTokens"),
            outboundMessages: t("outboundMessages"),
          }}
        />
      </div>
    </main>
  );
}
