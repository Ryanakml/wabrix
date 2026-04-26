import { getTranslations } from "next-intl/server";
import { BotProfileClient } from "@/features/bot-profile/components/bot-profile-client";

type BotProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BotProfilePage({ params }: BotProfilePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BotStudio" });

  return (
    <BotProfileClient
      copy={{
        loading: t("loading"),
        save: t("save"),
        savePending: t("savePending"),
        preview: t("preview"),
        previewPending: t("previewPending"),
        saveSuccess: t("saveSuccess"),
        missingRuntime: t("previewEmpty"),
        exampleMessage: t("exampleMessage"),
        botName: t("botName"),
        defaultLanguage: t("defaultLanguage"),
        autoDetect: t("autoDetect"),
        bahasaIndonesia: t("bahasaIndonesia"),
        english: t("english"),
        systemPrompt: t("systemPrompt"),
        englishTemplate: t("englishTemplate"),
        bahasaTemplate: t("bahasaTemplate"),
        provider: t("provider"),
        providerGoogle: t("providerGoogle"),
        providerDigitalOceanReference: t("providerDigitalOceanReference"),
        modelId: t("modelId"),
        temperature: t("temperature"),
        maxTokens: t("maxTokens"),
        endpointUrl: t("endpointUrl"),
        endpointPlaceholder: t("endpointPlaceholder"),
        apiKey: t("apiKey"),
        apiKeyKeepPlaceholder: t("apiKeyKeepPlaceholder"),
        apiKeyPastePlaceholder: t("apiKeyPastePlaceholder"),
        enableEscalation: t("enableEscalation"),
        escalationMessage: t("escalationMessage"),
        emulatorTitle: t("emulatorTitle"),
        emulatorBody: t("emulatorBody"),
        latestUserMessage: t("latestUserMessage"),
        draftOutput: t("draftOutput"),
        ragStatus: t("ragStatus"),
        ragStatusOn: t("ragStatusOn"),
        ragStatusOff: t("ragStatusOff"),
        knowledgeSources: t("knowledgeSources"),
        knowledgeSourcesEmpty: t("knowledgeSourcesEmpty"),
        validationNameEmpty: t("validationNameEmpty"),
        validationPromptEmpty: t("validationPromptEmpty"),
        validationModelEmpty: t("validationModelEmpty"),
        validationEndpointRequired: t("validationEndpointRequired"),
        saveFailed: t("saveFailed"),
        previewFailed: t("previewFailed"),
        previewSuccess: t("previewSuccess"),
        unknownSaveFailure: t("unknownSaveFailure"),
      }}
    />
  );
}
