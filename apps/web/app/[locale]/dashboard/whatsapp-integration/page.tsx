import { getTranslations } from "next-intl/server";
import { WhatsAppIntegrationClient } from "@/features/whatsapp-integration/components/whatsapp-integration-client";

type WhatsAppIntegrationPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WhatsAppIntegrationPage({
  params,
}: WhatsAppIntegrationPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WhatsAppSetup" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_INGRESS_URL ?? "http://localhost:8787"
  }/webhooks/whatsapp`;

  if (!hasConvexRuntime) {
    return <p className="text-sm text-muted-foreground">{t("missingRuntime")}</p>;
  }

  return (
    <WhatsAppIntegrationClient
      webhookUrl={webhookUrl}
      copy={{
        headline: t("headline"),
        subheadline: t("subheadline"),
        loading: t("loading"),
        save: t("save"),
        savePending: t("savePending"),
        saveSuccess: t("saveSuccess"),
        configureBotFirst: t("configureBotFirst"),
        phoneNumberId: t("phoneNumberId"),
        businessAccountId: t("businessAccountId"),
        accessToken: t("accessToken"),
        accessTokenPlaceholder: t("accessTokenPlaceholder"),
        appSecret: t("appSecret"),
        appSecretPlaceholder: t("appSecretPlaceholder"),
        verifyToken: t("verifyToken"),
        verifyTokenPlaceholder: t("verifyTokenPlaceholder"),
        enabled: t("enabled"),
        webhookUrl: t("webhookUrl"),
        connectionStatus: t("connectionStatus"),
        linkedBot: t("linkedBot"),
        notConfigured: t("notConfigured"),
        configured: t("configured"),
        keepSecretHint: t("keepSecretHint"),
        secretStatuses: t("secretStatuses"),
        accessTokenStatus: t("accessTokenStatus"),
        appSecretStatus: t("appSecretStatus"),
        verifyTokenStatus: t("verifyTokenStatus"),
        lifecycleTitle: t("lifecycleTitle"),
        approvalStatus: t("approvalStatus"),
        phoneVerificationStatus: t("phoneVerificationStatus"),
        businessProfileStatus: t("businessProfileStatus"),
        displayNameReviewStatus: t("displayNameReviewStatus"),
        messagingTier: t("messagingTier"),
        blockers: t("blockers"),
        refreshLifecycle: t("refreshLifecycle"),
        refreshTemplates: t("refreshTemplates"),
        requestOtp: t("requestOtp"),
        verifyOtp: t("verifyOtp"),
        otpCode: t("otpCode"),
        otpMethodSms: t("otpMethodSms"),
        otpMethodVoice: t("otpMethodVoice"),
        actionPending: t("actionPending"),
        templatesTitle: t("templatesTitle"),
        templateName: t("templateName"),
        templateLanguageCode: t("templateLanguageCode"),
        templateCategory: t("templateCategory"),
        templateBody: t("templateBody"),
        templateSave: t("templateSave"),
        templateSaved: t("templateSaved"),
        templateArchive: t("templateArchive"),
        templateStatus: t("templateStatus"),
        templateRejectionReason: t("templateRejectionReason"),
        templateEmpty: t("templateEmpty"),
      }}
    />
  );
}
