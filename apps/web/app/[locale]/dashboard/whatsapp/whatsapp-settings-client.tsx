"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@wabrix/ui/button";

type WhatsAppSettingsClientProps = {
  webhookUrl: string;
  copy: {
    loading: string;
    save: string;
    savePending: string;
    saveSuccess: string;
    configureBotFirst: string;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    accessTokenPlaceholder: string;
    appSecret: string;
    appSecretPlaceholder: string;
    verifyToken: string;
    verifyTokenPlaceholder: string;
    enabled: string;
    webhookUrl: string;
    connectionStatus: string;
    linkedBot: string;
    notConfigured: string;
    configured: string;
    keepSecretHint: string;
    secretStatuses: string;
    accessTokenStatus: string;
    appSecretStatus: string;
    verifyTokenStatus: string;
  };
};

type FormState = {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  enabled: boolean;
};

const emptyState: FormState = {
  phoneNumberId: "",
  businessAccountId: "",
  accessToken: "",
  appSecret: "",
  verifyToken: "",
  enabled: false,
};

export function WhatsAppSettingsClient({
  webhookUrl,
  copy,
}: WhatsAppSettingsClientProps) {
  const integrationState = useQuery(api.whatsapp.getWhatsAppIntegrationState, {});
  const saveWhatsAppIntegration = useMutation(api.whatsapp.saveWhatsAppIntegration);
  const [form, setForm] = useState<FormState>(emptyState);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!integrationState) {
      return;
    }

    setForm({
      phoneNumberId: integrationState.state.phoneNumberId,
      businessAccountId: integrationState.state.businessAccountId,
      accessToken: "",
      appSecret: "",
      verifyToken: "",
      enabled: integrationState.state.enabled,
    });
  }, [integrationState]);

  const saveDisabled = useMemo(
    () =>
      isSaving ||
      !integrationState?.canManage ||
      !integrationState?.botConfigured,
    [integrationState, isSaving],
  );

  if (integrationState === undefined) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  const onFieldChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (saveDisabled) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveWhatsAppIntegration({
        phoneNumberId: form.phoneNumberId,
        businessAccountId: form.businessAccountId,
        accessToken: form.accessToken || undefined,
        appSecret: form.appSecret || undefined,
        verifyToken: form.verifyToken || undefined,
        enabled: form.enabled,
      });

      setStatusMessage(`${copy.saveSuccess} (${result.connectionStatus})`);
      setForm((current) => ({
        ...current,
        accessToken: "",
        appSecret: "",
        verifyToken: "",
      }));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : copy.notConfigured,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="grid gap-5">
          {!integrationState.botConfigured ? (
            <div className="rounded-3xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              {copy.configureBotFirst}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.phoneNumberId}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.phoneNumberId}
              onChange={(event) =>
                onFieldChange("phoneNumberId", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.businessAccountId}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.businessAccountId}
              onChange={(event) =>
                onFieldChange("businessAccountId", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.accessToken}
            </span>
            <input
              type="password"
              autoComplete="off"
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.accessToken}
              placeholder={copy.accessTokenPlaceholder}
              onChange={(event) => onFieldChange("accessToken", event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.appSecret}
            </span>
            <input
              type="password"
              autoComplete="off"
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.appSecret}
              placeholder={copy.appSecretPlaceholder}
              onChange={(event) => onFieldChange("appSecret", event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.verifyToken}
            </span>
            <input
              type="password"
              autoComplete="off"
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.verifyToken}
              placeholder={copy.verifyTokenPlaceholder}
              onChange={(event) =>
                onFieldChange("verifyToken", event.target.value)
              }
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => onFieldChange("enabled", event.target.checked)}
            />
            {copy.enabled}
          </label>

          <p className="text-sm leading-7 text-stone-600">{copy.keepSecretHint}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saveDisabled} onClick={handleSave}>
              {isSaving ? copy.savePending : copy.save}
            </Button>
            {statusMessage ? (
              <span className="text-sm text-emerald-800">{statusMessage}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-[1.75rem] border border-stone-300/70 bg-[#111827] p-6 text-white shadow-[0_24px_70px_rgba(16,24,22,0.2)]">
          <div className="grid gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                {copy.webhookUrl}
              </p>
              <p className="mt-3 break-all rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-stone-100">
                {webhookUrl}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                {copy.connectionStatus}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {integrationState.state.connectionStatus}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                {copy.linkedBot}
              </p>
              <p className="mt-3 text-sm text-stone-200">
                {integrationState.linkedBotName ?? copy.notConfigured}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
          <h2 className="text-xl font-semibold text-stone-950">
            {copy.secretStatuses}
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              {
                label: copy.accessTokenStatus,
                value: integrationState.state.hasAccessToken,
              },
              {
                label: copy.appSecretStatus,
                value: integrationState.state.hasAppSecret,
              },
              {
                label: copy.verifyTokenStatus,
                value: integrationState.state.hasVerifyToken,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700"
              >
                <span className="font-medium text-stone-950">{item.label}: </span>
                {item.value ? copy.configured : copy.notConfigured}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
