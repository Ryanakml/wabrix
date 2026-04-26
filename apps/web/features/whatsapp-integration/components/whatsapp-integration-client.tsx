"use client";

import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type WhatsAppIntegrationClientProps = {
  webhookUrl: string;
  copy: {
    headline: string;
    subheadline: string;
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

function formatDateTime(timestamp: number | null) {
  if (!timestamp) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "n/a";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusVariant(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "verified" ||
    normalized === "synced" ||
    normalized === "configured"
  ) {
    return "default" as const;
  }

  if (
    normalized === "rejected" ||
    normalized === "failed" ||
    normalized === "disabled" ||
    normalized === "action_required"
  ) {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export function WhatsAppIntegrationClient({
  webhookUrl,
  copy,
}: WhatsAppIntegrationClientProps) {
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

  const [form, setForm] = React.useState<FormState>(emptyState);
  const [templateForm, setTemplateForm] =
    React.useState<TemplateFormState>(emptyTemplateState);
  const [otpCode, setOtpCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRunningAction, setIsRunningAction] = React.useState(false);

  React.useEffect(() => {
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

  const saveDisabled = React.useMemo(
    () => isSaving || !integrationState?.canManage || !integrationState?.botConfigured,
    [integrationState, isSaving],
  );

  const templateDisabled = React.useMemo(
    () => isSaving || !integrationState?.canManage,
    [integrationState, isSaving],
  );

  if (integrationState === undefined) {
    return <p className="text-sm text-muted-foreground">{copy.loading}</p>;
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

  const handleArchiveTemplate = async (templateId: string) => {
    setIsSaving(true);
    try {
      await archiveWhatsAppTemplate({
        templateId: templateId as never,
      });
      setStatusMessage(copy.configured);
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

  const webhookStatus =
    integrationState.state.lastWebhookEventAt || integrationState.state.connectionStatus === "configured"
      ? "receiving"
      : "waiting";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{copy.headline}</CardTitle>
        <p className="text-muted-foreground">{copy.subheadline}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {statusMessage ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {statusMessage}
            </div>
          ) : null}

          {!integrationState.botConfigured ? (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {copy.configureBotFirst}
            </div>
          ) : null}

          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Account</h3>
            <p className="text-muted-foreground text-sm">
              Configure the WhatsApp credentials stored for the active organization.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.phoneNumberId}</span>
              <Input
                value={form.phoneNumberId}
                onChange={(event) => onFieldChange("phoneNumberId", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.businessAccountId}</span>
              <Input
                value={form.businessAccountId}
                onChange={(event) =>
                  onFieldChange("businessAccountId", event.target.value)
                }
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.accessToken}</span>
              <Input
                type="password"
                autoComplete="off"
                value={form.accessToken}
                placeholder={copy.accessTokenPlaceholder}
                onChange={(event) => onFieldChange("accessToken", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.appSecret}</span>
              <Input
                type="password"
                autoComplete="off"
                value={form.appSecret}
                placeholder={copy.appSecretPlaceholder}
                onChange={(event) => onFieldChange("appSecret", event.target.value)}
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-medium">{copy.verifyToken}</span>
              <Input
                type="password"
                autoComplete="off"
                value={form.verifyToken}
                placeholder={copy.verifyTokenPlaceholder}
                onChange={(event) => onFieldChange("verifyToken", event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => onFieldChange("enabled", event.target.checked)}
              />
              {copy.enabled}
            </label>
            <Button type="button" disabled={saveDisabled} onClick={handleSave}>
              {isSaving ? copy.savePending : copy.save}
            </Button>
          </div>

          <p className="text-muted-foreground text-sm">{copy.keepSecretHint}</p>

          <Separator />

          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Team Info</h3>
            <p className="text-muted-foreground text-sm">
              Overview blocks reuse the template layout for credentials, webhook, and linked bot.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{copy.secretStatuses}</p>
              <div className="mt-3 space-y-2 text-sm">
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
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span>{item.label}</span>
                    <Badge variant={item.value ? "default" : "secondary"}>
                      {item.value ? copy.configured : copy.notConfigured}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{copy.webhookUrl}</p>
              <p className="mt-3 break-all text-sm font-medium">{webhookUrl}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={getStatusVariant(webhookStatus)}>
                  {formatStatusLabel(webhookStatus)}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Last event {formatDateTime(integrationState.state.lastWebhookEventAt)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{copy.connectionStatus}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={getStatusVariant(integrationState.state.connectionStatus)}>
                  {formatStatusLabel(integrationState.state.connectionStatus)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                Last refresh{" "}
                {formatDateTime(integrationState.state.lastLifecycleRefreshAt)}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{copy.linkedBot}</p>
              <p className="mt-3 text-sm font-medium">
                {integrationState.linkedBotName ?? copy.notConfigured}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                Last template sync{" "}
                {formatDateTime(integrationState.state.lastTemplateSyncAt)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Members</h3>
            <p className="text-muted-foreground text-sm">
              WABA lifecycle, blockers, OTP verification, and event history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isRunningAction || !integrationState.canManage}
              onClick={() => runAction(() => refreshWhatsAppLifecycle({}))}
            >
              {isRunningAction ? copy.actionPending : copy.refreshLifecycle}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isRunningAction || !integrationState.canManage}
              onClick={() => runAction(() => syncWhatsAppTemplates({}))}
            >
              {isRunningAction ? copy.actionPending : copy.refreshTemplates}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              [copy.approvalStatus, integrationState.state.approvalStatus],
              [copy.phoneVerificationStatus, integrationState.state.phoneVerificationStatus],
              [copy.businessProfileStatus, integrationState.state.businessProfileStatus],
              [
                copy.displayNameReviewStatus,
                integrationState.state.displayNameReviewStatus,
              ],
              [copy.messagingTier, integrationState.state.messagingLimitTier ?? "n/a"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">{label}</p>
                <div className="mt-3">
                  <Badge variant={getStatusVariant(value)}>
                    {formatStatusLabel(value)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <span className="font-medium">{copy.blockers}: </span>
            {integrationState.blockers.length > 0
              ? integrationState.blockers.map(formatStatusLabel).join(", ")
              : copy.configured}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isRunningAction || !integrationState.canManage}
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
                type="button"
                variant="outline"
                disabled={isRunningAction || !integrationState.canManage}
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

            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                className="flex-1"
                placeholder={copy.otpCode}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
              />
              <Button
                type="button"
                disabled={
                  isRunningAction ||
                  !integrationState.canManage ||
                  otpCode.trim().length === 0
                }
                onClick={() =>
                  runAction(() => verifyPhoneVerificationCode({ code: otpCode }))
                }
              >
                {copy.verifyOtp}
              </Button>
            </div>
          </div>

          {(integrationState.state.lastLifecycleError ||
            integrationState.state.businessProfile ||
            integrationState.lifecycleEvents.length > 0) && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Lifecycle feed</p>
                <div className="mt-3 space-y-3 text-sm">
                  {integrationState.lifecycleEvents.length === 0 ? (
                    <p className="text-muted-foreground">No lifecycle events yet.</p>
                  ) : (
                    integrationState.lifecycleEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="rounded-md border bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {formatStatusLabel(event.eventType)}
                          </span>
                          <Badge variant={getStatusVariant(event.status)}>
                            {formatStatusLabel(event.status)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {formatDateTime(event.createdAt)}
                        </p>
                        {event.details ? (
                          <p className="mt-2 text-xs">{JSON.stringify(event.details)}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Business profile</p>
                <div className="mt-3 space-y-2 text-sm">
                  {integrationState.state.businessProfile ? (
                    <>
                      {Object.entries(integrationState.state.businessProfile).map(
                        ([key, value]) => (
                          <div key={key} className="rounded-md border bg-muted/30 p-3">
                            <p className="font-medium">{formatStatusLabel(key)}</p>
                            <p className="text-muted-foreground mt-1 break-all text-xs">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </p>
                          </div>
                        ),
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No business profile data synced yet.</p>
                  )}
                  {integrationState.state.lastLifecycleError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      {integrationState.state.lastLifecycleError}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Preferences</h3>
            <p className="text-muted-foreground text-sm">
              Template authoring, sync status, and local archive actions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.templateName}</span>
              <Input
                value={templateForm.name}
                onChange={(event) => onTemplateFieldChange("name", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.templateLanguageCode}</span>
              <Input
                value={templateForm.languageCode}
                onChange={(event) =>
                  onTemplateFieldChange("languageCode", event.target.value)
                }
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{copy.templateCategory}</span>
              <select
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-[3px]"
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

            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{copy.templatesTitle}</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>Saved templates</span>
                  <Badge variant="secondary">{integrationState.templates.length}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Sync logs</span>
                  <Badge variant="secondary">
                    {integrationState.templateSyncLogs.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Last sync</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(integrationState.state.lastTemplateSyncAt)}
                  </span>
                </div>
              </div>
            </div>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-medium">{copy.templateBody}</span>
              <Textarea
                className="min-h-32"
                value={templateForm.body}
                onChange={(event) => onTemplateFieldChange("body", event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={templateDisabled} onClick={handleTemplateSave}>
              {copy.templateSave}
            </Button>
            {templateForm.templateId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplateForm(emptyTemplateState)}
              >
                Reset draft
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3">
            {integrationState.templates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{copy.templateEmpty}</p>
            ) : (
              integrationState.templates.map((template) => (
                <div key={template.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {template.name} · {template.languageCode}
                        </p>
                        <Badge variant={getStatusVariant(template.status)}>
                          {formatStatusLabel(template.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {copy.templateCategory}: {formatStatusLabel(template.category)}
                      </p>
                      {template.rejectionReason ? (
                        <p className="text-destructive">
                          {copy.templateRejectionReason}: {template.rejectionReason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
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
                        type="button"
                        variant="outline"
                        disabled={templateDisabled}
                        onClick={() => handleArchiveTemplate(template.id)}
                      >
                        {copy.templateArchive}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {(integrationState.templateSyncLogs.length > 0 ||
            integrationState.state.lastTemplateSyncError) && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Template info</p>
              <div className="mt-3 space-y-3 text-sm">
                {integrationState.state.lastTemplateSyncError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {integrationState.state.lastTemplateSyncError}
                  </div>
                ) : null}
                {integrationState.templateSyncLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatStatusLabel(log.action)}</span>
                      <Badge variant={getStatusVariant(log.status)}>
                        {formatStatusLabel(log.status)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {formatDateTime(log.createdAt)}
                    </p>
                    {log.lastError ? (
                      <p className="mt-2 text-xs text-destructive">{log.lastError}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
