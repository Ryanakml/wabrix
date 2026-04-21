import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { InboxClient } from "./inbox-client";

type InboxPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function InboxPage({ params }: InboxPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Inbox" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#10201e_0%,_#112725_38%,_#f2ecdf_38%,_#f2ecdf_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#10201e] p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-100/80">
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
          <InboxClient
            copy={{
              loading: t("loading"),
              empty: t("empty"),
              conversationList: t("conversationList"),
              recentMessages: t("recentMessages"),
              mediaOps: t("mediaOps"),
              noMessages: t("noMessages"),
              serviceWindow: t("serviceWindow"),
              lastInbound: t("lastInbound"),
              noMedia: t("noMedia"),
              openStatus: t("openStatus"),
              closedStatus: t("closedStatus"),
            }}
          />
        )}
      </div>
    </main>
  );
}
