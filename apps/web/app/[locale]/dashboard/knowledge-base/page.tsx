import { getTranslations } from "next-intl/server";
import { KnowledgeBaseClient } from "@/features/knowledge-base/components/knowledge-base-client";

type KnowledgeBasePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "KnowledgeBase" });

  return (
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
  );
}
