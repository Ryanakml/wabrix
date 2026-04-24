import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#1f1726_0%,_#281f35_38%,_#f4ecde_38%,_#f4ecde_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#1f1726] p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-300">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-fuchsia-100/80">
                {t("subheadline")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${locale}/pricing`}>
                <Button variant="secondary">{t("pricingLink")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard`}>
                <Button variant="secondary">{t("back")}</Button>
              </Link>
            </div>
          </div>
        </section>

        {!hasConvexRuntime ? (
          <section className="rounded-[1.75rem] border border-amber-300/60 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
            {t("missingRuntime")}
          </section>
        ) : (
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
        )}
      </div>
    </main>
  );
}
