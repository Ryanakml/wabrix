import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@wabrix/ui/button";
import { WhatsAppSettingsClient } from "./whatsapp-settings-client";

type WhatsAppPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WhatsAppPage({ params }: WhatsAppPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WhatsAppSetup" });
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_INGRESS_URL ?? "http://localhost:8787"
  }/webhooks/whatsapp`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#191112_0%,_#2b1b1f_38%,_#f6ecdf_38%,_#f6ecdf_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-[#191112] p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {t("headline")}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-rose-100/80">
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
          <WhatsAppSettingsClient
            webhookUrl={webhookUrl}
            copy={{
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
            }}
          />
        )}
      </div>
    </main>
  );
}
