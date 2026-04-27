import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { Card } from "@wabrix/ui/card";
import { Code } from "@wabrix/ui/code";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

const dashboardModules = [
  "botStudio",
  "knowledgeBase",
  "inbox",
  "billing",
  "analytics",
  "ops",
] as const;

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#0f1720_0%,_#101921_50%,_#efe8d6_50%,_#efe8d6_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#101921] p-8 text-white shadow-[0_32px_100px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                {t("eyebrow")}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                {t("subheadline")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Code>{t("authStatus")}</Code>
              <Link href={`/${locale}/dashboard/bot-studio`}>
                <Button>{t("openBotStudio")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard/knowledge-base`}>
                <Button>{t("openKnowledgeBase")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard/inbox`}>
                <Button>{t("openInbox")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard/whatsapp`}>
                <Button>{t("openWhatsAppSetup")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard/billing`}>
                <Button>{t("openBilling")}</Button>
              </Link>
              <Link href={`/${locale}/dashboard/analytics`}>
                <Button>{t("openAnalytics")}</Button>
              </Link>
              <Link href={`/${locale}`}>
                <Button variant="secondary">{t("backToMarketing")}</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardModules.map((moduleKey) => (
            <Card
              key={moduleKey}
              title={t(`modules.${moduleKey}.title`)}
              description={t(`modules.${moduleKey}.body`)}
            />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
              {t("checklistLabel")}
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-stone-700">
              <li>{t("checklist.repo")}</li>
              <li>{t("checklist.web")}</li>
              <li>{t("checklist.ingress")}</li>
              <li>{t("checklist.shared")}</li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-emerald-300/40 bg-emerald-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900">
              {t("nextStepsLabel")}
            </p>
            <p className="mt-4 text-sm leading-7 text-emerald-950">
              {t("nextStepsBody")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
