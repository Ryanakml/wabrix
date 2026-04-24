import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { AnalyticsClient } from "./analytics-client";

type AnalyticsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Analytics" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#171e29_0%,_#1b2430_38%,_#f4ecde_38%,_#f4ecde_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#171e29] p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-sky-100/80">
                {t("subheadline")}
              </p>
            </div>
            <Link href={`/${locale}/dashboard`}>
              <Button variant="secondary">{t("back")}</Button>
            </Link>
          </div>
        </section>

        {!hasConvexRuntime ? (
          <section className="rounded-[1.75rem] border border-amber-300/60 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
            {t("missingRuntime")}
          </section>
        ) : (
          <AnalyticsClient
            copy={{
              loading: t("loading"),
              usage: t("usage"),
              queueMetrics: t("queueMetrics"),
              deliveryMetrics: t("deliveryMetrics"),
              recentAiRuns: t("recentAiRuns"),
              aiTokens: t("aiTokens"),
              outboundMessages: t("outboundMessages"),
              queued: t("queued"),
              processing: t("processing"),
              sent: t("sent"),
              failed: t("failed"),
              delivered: t("delivered"),
              read: t("read"),
              noRuns: t("noRuns"),
            }}
          />
        )}
      </div>
    </main>
  );
}
