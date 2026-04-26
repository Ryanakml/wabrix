import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { detectBillingCountry } from "../../../../lib/billing";
import { BillingClient } from "./billing-client";

type BillingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BillingPage({ params }: BillingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Billing" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const detectedCountry = detectBillingCountry(await headers());

  if (!hasConvexRuntime) {
    return <p className="text-sm text-muted-foreground">{t("missingRuntime")}</p>;
  }

  return (
    <BillingClient
      locale={locale}
      detectedCountry={detectedCountry}
      copy={{
        loading: t("loading"),
        currentPlan: t("currentPlan"),
        noSubscription: t("noSubscription"),
        status: t("status"),
        gateway: t("gateway"),
        period: t("period"),
        usage: t("usage"),
        aiTokens: t("aiTokens"),
        outboundMessages: t("outboundMessages"),
        seats: t("seats"),
        recentEvents: t("recentEvents"),
        noEvents: t("noEvents"),
        countryLabel: t("countryLabel"),
        startCheckout: t("startCheckout"),
        checkoutPending: t("checkoutPending"),
        checkoutFailed: t("checkoutFailed"),
        managePlans: t("managePlans"),
        perMonth: t("perMonth"),
      }}
    />
  );
}
