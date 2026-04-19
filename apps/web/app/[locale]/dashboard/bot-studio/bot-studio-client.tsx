"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@wabrix/ui/button";
import { toast } from "sonner";

type BotStudioClientProps = {
  copy: {
    loading: string;
    save: string;
    savePending: string;
    preview: string;
    previewPending: string;
    saveSuccess: string;
    missingRuntime: string;
    exampleMessage: string;
    botName: string;
    defaultLanguage: string;
    autoDetect: string;
    bahasaIndonesia: string;
    english: string;
    systemPrompt: string;
    englishTemplate: string;
    bahasaTemplate: string;
    provider: string;
    providerGoogle: string;
    providerDigitalOceanReference: string;
    modelId: string;
    temperature: string;
    maxTokens: string;
    endpointUrl: string;
    endpointPlaceholder: string;
    apiKey: string;
    apiKeyKeepPlaceholder: string;
    apiKeyPastePlaceholder: string;
    enableEscalation: string;
    escalationMessage: string;
    emulatorTitle: string;
    emulatorBody: string;
    latestUserMessage: string;
    draftOutput: string;
    validationNameEmpty: string;
    validationPromptEmpty: string;
    validationModelEmpty: string;
    validationEndpointRequired: string;
  };
};

type FormState = {
  name: string;
  defaultLanguage: "auto" | "en" | "id";
  systemPrompt: string;
  templateEn: string;
  templateId: string;
  providerType: "google" | "digitalocean_reference";
  modelId: string;
  endpointUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  escalationEnabled: boolean;
  escalationMessage: string;
};

const emptyState: FormState = {
  name: "",
  defaultLanguage: "auto",
  systemPrompt: "",
  templateEn: "",
  templateId: "",
  providerType: "google",
  modelId: "gemini-2.5-flash",
  endpointUrl: "",
  apiKey: "",
  temperature: 0.4,
  maxTokens: 512,
  escalationEnabled: true,
  escalationMessage: "",
};

export function BotStudioClient({ copy }: BotStudioClientProps) {
  const studioState = useQuery(api.configuration.getBotStudioState, {});
  const saveBotStudioState = useMutation(api.configuration.saveBotStudioState);
  const previewBotReply = useAction(api.ai.previewBotReply);
  const [form, setForm] = useState<FormState>(emptyState);
  const [previewInput, setPreviewInput] = useState(copy.exampleMessage);
  const [previewOutput, setPreviewOutput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (!studioState) {
      return;
    }

    setForm({
      name: studioState.state.name,
      defaultLanguage: studioState.state.defaultLanguage,
      systemPrompt: studioState.state.systemPrompt,
      templateEn: studioState.state.localizedPromptTemplates.en ?? "",
      templateId: studioState.state.localizedPromptTemplates.id ?? "",
      providerType: studioState.state.providerType,
      modelId: studioState.state.modelId,
      endpointUrl: studioState.state.endpointUrl ?? "",
      apiKey: "",
      temperature: studioState.state.temperature,
      maxTokens: studioState.state.maxTokens,
      escalationEnabled: studioState.state.escalationEnabled,
      escalationMessage: studioState.state.escalationMessage ?? "",
    });
  }, [studioState]);

  const saveDisabled = useMemo(() => {
    if (isSaving || !studioState?.canManage) return true;
    return false;
  }, [
    isSaving,
    studioState?.canManage,
  ]);

  if (studioState === undefined) {
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
    if (saveDisabled) return;

    if (form.name.trim().length === 0) {
      toast.error(copy.validationNameEmpty);
      return;
    }

    if (form.systemPrompt.trim().length === 0) {
      toast.error(copy.validationPromptEmpty);
      return;
    }

    if (form.modelId.trim().length === 0) {
      toast.error(copy.validationModelEmpty);
      return;
    }

    if (form.providerType === "digitalocean_reference" && form.endpointUrl.trim().length === 0) {
      toast.error(copy.validationEndpointRequired);
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveBotStudioState({
        name: form.name,
        defaultLanguage: form.defaultLanguage,
        systemPrompt: form.systemPrompt,
        localizedPromptTemplates: {
          en: form.templateEn,
          id: form.templateId,
        },
        providerType: form.providerType,
        modelId: form.modelId,
        endpointUrl: form.endpointUrl || undefined,
        apiKey: form.apiKey || undefined,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        escalationEnabled: form.escalationEnabled,
        escalationMessage: form.escalationMessage || undefined,
        emulatorHistory: [],
      });

      toast.success(`${copy.saveSuccess} (${String(result.botId).slice(0, 8)})`);
      setStatusMessage(
        `${copy.saveSuccess} (${String(result.botId).slice(0, 8)})`,
      );
      setForm((current) => ({
        ...current,
        apiKey: "",
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.replace(/Uncaught Error: /gi, '').split('\n')[0] : "Failed to save configuration";
      toast.error(`Save Failed: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
      const preview = await previewBotReply({
        latestUserMessage: previewInput,
        history: [],
      });
      setPreviewOutput(preview.content);
      toast.success("Draft Generated!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.replace(/Uncaught Error: /gi, '').split('\n')[0] : copy.missingRuntime;
      setPreviewOutput(`Error: ${errorMsg}`);
      toast.error(`Preview Failed: ${errorMsg}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.botName}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.name}
              onChange={(event) => onFieldChange("name", event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.defaultLanguage}
            </span>
            <select
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.defaultLanguage}
              onChange={(event) =>
                onFieldChange(
                  "defaultLanguage",
                  event.target.value as FormState["defaultLanguage"],
                )
              }
            >
              <option value="auto">{copy.autoDetect}</option>
              <option value="id">{copy.bahasaIndonesia}</option>
              <option value="en">{copy.english}</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.systemPrompt}
            </span>
            <textarea
              className="min-h-36 rounded-3xl border border-stone-300 px-4 py-3"
              value={form.systemPrompt}
              onChange={(event) =>
                onFieldChange("systemPrompt", event.target.value)
              }
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.englishTemplate}
              </span>
              <textarea
                className="min-h-28 rounded-3xl border border-stone-300 px-4 py-3"
                value={form.templateEn}
                onChange={(event) => onFieldChange("templateEn", event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.bahasaTemplate}
              </span>
              <textarea
                className="min-h-28 rounded-3xl border border-stone-300 px-4 py-3"
                value={form.templateId}
                onChange={(event) => onFieldChange("templateId", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.provider}
              </span>
              <select
                className="rounded-2xl border border-stone-300 px-4 py-3"
                value={form.providerType}
                onChange={(event) =>
                  onFieldChange(
                    "providerType",
                    event.target.value as FormState["providerType"],
                  )
                }
              >
                <option value="google">{copy.providerGoogle}</option>
                <option value="digitalocean_reference">
                  {copy.providerDigitalOceanReference}
                </option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.modelId}
              </span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3"
                value={form.modelId}
                onChange={(event) => onFieldChange("modelId", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.temperature}
              </span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(event) =>
                  onFieldChange("temperature", Number(event.target.value))
                }
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.maxTokens}
              </span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3"
                type="number"
                min="64"
                max="4096"
                value={form.maxTokens}
                onChange={(event) =>
                  onFieldChange("maxTokens", Number(event.target.value))
                }
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.endpointUrl}
              </span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3"
                value={form.endpointUrl}
                onChange={(event) =>
                  onFieldChange("endpointUrl", event.target.value)
                }
                placeholder={copy.endpointPlaceholder}
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.apiKey}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.apiKey}
              onChange={(event) => onFieldChange("apiKey", event.target.value)}
              placeholder={
                studioState.state.hasApiKey
                  ? copy.apiKeyKeepPlaceholder
                  : copy.apiKeyPastePlaceholder
              }
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.escalationEnabled}
              onChange={(event) =>
                onFieldChange("escalationEnabled", event.target.checked)
              }
            />
            {copy.enableEscalation}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.escalationMessage}
            </span>
            <textarea
              className="min-h-24 rounded-3xl border border-stone-300 px-4 py-3"
              value={form.escalationMessage}
              onChange={(event) =>
                onFieldChange("escalationMessage", event.target.value)
              }
            />
          </label>

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

      <aside className="rounded-[1.75rem] border border-stone-300/70 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_70px_rgba(16,24,22,0.2)]">
        <h2 className="text-xl font-semibold">{copy.emulatorTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-stone-300">
          {copy.emulatorBody}
        </p>

        <label className="mt-6 grid gap-2">
          <span className="text-sm font-medium text-stone-200">
            {copy.latestUserMessage}
          </span>
          <textarea
            className="min-h-32 rounded-3xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
            value={previewInput}
            onChange={(event) => setPreviewInput(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handlePreview}>
            {isPreviewing ? copy.previewPending : copy.preview}
          </Button>
          <span className="text-xs uppercase tracking-[0.24em] text-stone-400">
            {studioState.state.modelId}
          </span>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">
            {copy.draftOutput}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-100">
            {previewOutput || copy.missingRuntime}
          </p>
        </div>
      </aside>
    </div>
  );
}
