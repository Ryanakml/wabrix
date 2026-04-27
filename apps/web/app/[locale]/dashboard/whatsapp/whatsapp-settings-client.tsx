"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
    lifecycleTitle: string;
    approvalStatus: string;
    phoneVerificationStatus: string;
    businessProfileStatus: string;
    displayNameReviewStatus: string;
    messagingTier: string;
    blockers: string;
    refreshLifecycle: string;
    refreshTemplates: string;
    requestOtp: string;
    verifyOtp: string;
    otpCode: string;
    otpMethodSms: string;
    otpMethodVoice: string;
    actionPending: string;
    templatesTitle: string;
    templateName: string;
    templateLanguageCode: string;
    templateCategory: string;
    templateBody: string;
    templateSave: string;
    templateSaved: string;
    templateArchive: string;
    templateStatus: string;
    templateRejectionReason: string;
    templateEmpty: string;
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

type TemplateFormState = {
  templateId?: string;
  name: string;
  languageCode: string;
  category: "marketing" | "utility" | "authentication";
  body: string;
};

const emptyState: FormState = {
  phoneNumberId: "",
  businessAccountId: "",
  accessToken: "",
  appSecret: "",
  verifyToken: "",
  enabled: false,
};

const emptyTemplateState: TemplateFormState = {
  name: "",
  languageCode: "en_US",
  category: "utility",
  body: "",
};

export function WhatsAppSettingsClient({
  webhookUrl,
  copy,
}: WhatsAppSettingsClientProps) {
  const integrationState = useQuery(api.whatsapp.getWhatsAppIntegrationState, {});
  const saveWhatsAppIntegration = useMutation(api.whatsapp.saveWhatsAppIntegration);
  const saveWhatsAppTemplate = useMutation(api.whatsapp.saveWhatsAppTemplate);
  const archiveWhatsAppTemplate = useMutation(api.whatsapp.archiveWhatsAppTemplate);
  const syncWhatsAppTemplates = useAction(api.whatsappAction.syncWhatsAppTemplates);
  const refreshWhatsAppLifecycle = useAction(
    api.whatsappAction.refreshWhatsAppLifecycle,
  );
  const requestPhoneVerificationCode = useAction(
    api.whatsappAction.requestPhoneVerificationCode,
  );
  const verifyPhoneVerificationCode = useAction(
    api.whatsappAction.verifyPhoneVerificationCode,
  );

  const [form, setForm] = useState<FormState>(emptyState);
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(emptyTemplateState);
  const [otpCode, setOtpCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);

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
    () => isSaving || !integrationState?.canManage || !integrationState?.botConfigured,
    [integrationState, isSaving],
  );

  if (integrationState === undefined) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  const onFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const onTemplateFieldChange = <K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K],
  ) => {
    setTemplateForm((current) => ({
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
      setStatusMessage(error instanceof Error ? error.message : copy.notConfigured);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSave = async () => {
    setIsSaving(true);
    try {
      await saveWhatsAppTemplate({
        templateId: templateForm.templateId as never,
        name: templateForm.name,
        languageCode: templateForm.languageCode,
        category: templateForm.category,
        components: [
          {
            type: "BODY",
            text: templateForm.body,
          },
        ],
      });
      setTemplateForm(emptyTemplateState);
      setStatusMessage(copy.templateSaved);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.notConfigured);
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setIsRunningAction(true);
    try {
      await fn();
      setStatusMessage(copy.configured);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.notConfigured);
    } finally {
      setIsRunningAction(false);
    }
  };

  return (
    <div className="grid gap-6">
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
                onChange={(event) => onFieldChange("phoneNumberId", event.target.value)}
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
                onChange={(event) => onFieldChange("verifyToken", event.target.value)}
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

      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-950">{copy.lifecycleTitle}</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={isRunningAction}
              onClick={() => runAction(() => refreshWhatsAppLifecycle({}))}
            >
              {isRunningAction ? copy.actionPending : copy.refreshLifecycle}
            </Button>
            <Button
              variant="secondary"
              disabled={isRunningAction}
              onClick={() => runAction(() => syncWhatsAppTemplates({}))}
            >
              {isRunningAction ? copy.actionPending : copy.refreshTemplates}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            [copy.approvalStatus, integrationState.state.approvalStatus],
            [copy.phoneVerificationStatus, integrationState.state.phoneVerificationStatus],
            [copy.businessProfileStatus, integrationState.state.businessProfileStatus],
            [copy.displayNameReviewStatus, integrationState.state.displayNameReviewStatus],
            [copy.messagingTier, integrationState.state.messagingLimitTier ?? "n/a"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700"
            >
              <span className="font-medium text-stone-950">{label}: </span>
              {value}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-amber-300/60 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <span className="font-medium">{copy.blockers}: </span>
          {integrationState.blockers.length > 0
            ? integrationState.blockers.join(", ")
            : copy.configured}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            <Button
              variant="secondary"
              disabled={isRunningAction}
              onClick={() =>
                runAction(() =>
                  requestPhoneVerificationCode({
                    method: "SMS",
                    languageCode: "en_US",
                  }),
                )
              }
            >
              {copy.requestOtp} ({copy.otpMethodSms})
            </Button>
            <Button
              variant="secondary"
              disabled={isRunningAction}
              onClick={() =>
                runAction(() =>
                  requestPhoneVerificationCode({
                    method: "VOICE",
                    languageCode: "en_US",
                  }),
                )
              }
            >
              {copy.requestOtp} ({copy.otpMethodVoice})
            </Button>
          </div>

          <div className="flex gap-3">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-stone-300 px-4 py-3"
              placeholder={copy.otpCode}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
            />
            <Button
              disabled={isRunningAction || otpCode.trim().length === 0}
              onClick={() => runAction(() => verifyPhoneVerificationCode({ code: otpCode }))}
            >
              {copy.verifyOtp}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <h2 className="text-xl font-semibold text-stone-950">{copy.templatesTitle}</h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">{copy.templateName}</span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={templateForm.name}
              onChange={(event) => onTemplateFieldChange("name", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.templateLanguageCode}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={templateForm.languageCode}
              onChange={(event) =>
                onTemplateFieldChange("languageCode", event.target.value)
              }
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.templateCategory}
            </span>
            <select
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={templateForm.category}
              onChange={(event) =>
                onTemplateFieldChange(
                  "category",
                  event.target.value as TemplateFormState["category"],
                )
              }
            >
              <option value="utility">utility</option>
              <option value="marketing">marketing</option>
              <option value="authentication">authentication</option>
            </select>
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">{copy.templateBody}</span>
            <textarea
              className="min-h-32 rounded-2xl border border-stone-300 px-4 py-3"
              value={templateForm.body}
              onChange={(event) => onTemplateFieldChange("body", event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5">
          <Button disabled={isSaving} onClick={handleTemplateSave}>
            {copy.templateSave}
          </Button>
        </div>

        <div className="mt-6 grid gap-3">
          {integrationState.templates.length === 0 ? (
            <p className="text-sm text-stone-600">{copy.templateEmpty}</p>
          ) : null}
          {integrationState.templates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-stone-950">
                    {template.name} · {template.languageCode}
                  </p>
                  <p>
                    {copy.templateStatus}: {template.status}
                  </p>
                  {template.rejectionReason ? (
                    <p>
                      {copy.templateRejectionReason}: {template.rejectionReason}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setTemplateForm({
                        templateId: template.id,
                        name: template.name,
                        languageCode: template.languageCode,
                        category: template.category,
                        body:
                          (
                            template.components.find(
                              (component: { type?: string }) =>
                                component.type === "BODY",
                            ) as { text?: string } | undefined
                          )?.text ?? "",
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      archiveWhatsAppTemplate({
                        templateId: template.id as never,
                      })
                    }
                  >
                    {copy.templateArchive}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
