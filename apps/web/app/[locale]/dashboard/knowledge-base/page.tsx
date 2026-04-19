import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { KnowledgeBaseClient } from "./knowledge-base-client";

type KnowledgeBasePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function KnowledgeBasePage({
  params,
}: KnowledgeBasePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "KnowledgeBase" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#142118_0%,_#20352b_35%,_#f4ecdf_35%,_#f4ecdf_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#142118] p-8 text-white">
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
          <KnowledgeBaseClient
            copy={{
              loading: t("loading"),
              save: t("save"),
              savePending: t("savePending"),
              delete: t("delete"),
              deletePending: t("deletePending"),
              saveSuccess: t("saveSuccess"),
              sourceType: t("sourceType"),
              inline: t("inline"),
              website: t("website"),
              pdf: t("pdf"),
              title: t("title"),
              titlePlaceholder: t("titlePlaceholder"),
              websiteUrl: t("websiteUrl"),
              websiteUrlPlaceholder: t("websiteUrlPlaceholder"),
              inlineContent: t("inlineContent"),
              inlineContentPlaceholder: t("inlineContentPlaceholder"),
              pdfDeferred: t("pdfDeferred"),
              configureBotFirst: t("configureBotFirst"),
              emptyState: t("emptyState"),
              sourceListTitle: t("sourceListTitle"),
              previewTitle: t("previewTitle"),
              recentUsageTitle: t("recentUsageTitle"),
              noPreview: t("noPreview"),
              chunkCount: t("chunkCount"),
              usageEmpty: t("usageEmpty"),
              deleteSuccess: t("deleteSuccess"),
              blockedPrivateOrInternalUrl: t("blockedPrivateOrInternalUrl"),
            }}
          />
        )}
      </div>
    </main>
  );
}
