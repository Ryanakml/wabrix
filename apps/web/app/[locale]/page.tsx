import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { appDescription, appName, supportedLocales } from "@wabrix/config";
import { Button } from "@wabrix/ui/button";
import { Card } from "@wabrix/ui/card";
import { Code } from "@wabrix/ui/code";

type MarketingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Marketing" });

  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(27,94,32,0.18),_transparent_34%),linear-gradient(180deg,_#f6f6ea_0%,_#fffdf8_52%,_#f2efe3_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_24px_80px_rgba(20,37,24,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-800">
              {t("phaseBadge")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
              {appName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
              {appDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {supportedLocales.map((entry) => {
              const isActive = entry === locale;

              return (
                <Link
                  key={entry}
                  href={`/${entry}`}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-emerald-900 bg-emerald-900 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                  }`}
                >
                  {entry.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-900">
                {t("eyebrow")}
              </p>
              <h2 className="max-w-4xl text-5xl font-semibold tracking-tight text-stone-950 md:text-6xl">
                {t("headline")}
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-stone-700">
                {t("subheadline")}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href={`/${locale}/dashboard`}>
                <Button>{t("ctaPrimary")}</Button>
              </Link>
              <Link
                href="/docs/phase-0/README.md"
                className="inline-flex items-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500 hover:bg-white/70"
              >
                {t("ctaSecondary")}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card
                title={t("cards.foundationTitle")}
                description={t("cards.foundationBody")}
              />
              <Card
                title={t("cards.i18nTitle")}
                description={t("cards.i18nBody")}
              />
              <Card
                title={t("cards.ingressTitle")}
                description={t("cards.ingressBody")}
              />
            </div>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_rgba(20,37,24,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              {t("shellBadge")}
            </p>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm text-stone-300">{t("shellTitle")}</p>
                <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between rounded-xl bg-white/6 px-4 py-3">
                    <span className="text-sm text-stone-300">
                      {t("shellItems.web")}
                    </span>
                    <Code>3000</Code>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/6 px-4 py-3">
                    <span className="text-sm text-stone-300">
                      {t("shellItems.ingress")}
                    </span>
                    <Code>8787</Code>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/6 px-4 py-3">
                    <span className="text-sm text-stone-300">
                      {t("shellItems.status")}
                    </span>
                    <Code>{t("shellItems.statusValue")}</Code>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                {t("shellFootnote")}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
