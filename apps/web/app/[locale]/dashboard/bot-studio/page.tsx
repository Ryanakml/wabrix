import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { BotStudioClient } from "./bot-studio-client";

type BotStudioPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BotStudioPage({ params }: BotStudioPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BotStudio" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#111827_0%,_#172033_40%,_#f7f1e2_40%,_#f7f1e2_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#111827] p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
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
          <BotStudioClient
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
              validationNameEmpty: t("validationNameEmpty"),
              validationPromptEmpty: t("validationPromptEmpty"),
              validationModelEmpty: t("validationModelEmpty"),
              validationEndpointRequired: t("validationEndpointRequired"),
            }}
          />
        )}
      </div>
    </main>
  );
}
