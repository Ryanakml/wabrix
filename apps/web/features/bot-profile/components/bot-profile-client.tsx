"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BotProfileClientProps = {
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
    ragStatus: string;
    ragStatusOn: string;
    ragStatusOff: string;
    knowledgeSources: string;
    knowledgeSourcesEmpty: string;
    validationNameEmpty: string;
    validationPromptEmpty: string;
    validationModelEmpty: string;
    validationEndpointRequired: string;
    saveFailed: string;
    previewFailed: string;
    previewSuccess: string;
    unknownSaveFailure: string;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Separator />
      <h3 className="text-muted-foreground pt-2 text-sm font-medium tracking-wide uppercase">
        {children}
      </h3>
    </div>
  );
}

function normalizeActionError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : fallback;
  const clean = raw
    .replace(/^\[CONVEX.*?\]\s*/i, "")
    .replace(/^Uncaught (ConvexError|Error):\s*/i, "")
    .split("\n")[0]
    ?.trim() ?? "";
  const code = clean.match(/\b([45]\d{2})\b/)?.[1];

  if (/api key|unauthorized|forbidden|authentication|invalid/i.test(clean)) {
    return code ? `API key invalid or unauthorized (${code}).` : "API key invalid or unauthorized.";
  }

  if (/endpoint/i.test(clean) && /url|https|valid/i.test(clean)) {
    return "Endpoint URL is invalid.";
  }

  if (/timeout|timed out|aborted/i.test(clean)) {
    return "Server timeout. Please try again.";
  }

  if (/not found/i.test(clean) || code === "404") {
    return "Server error (404).";
  }

  if (code) {
    return `Server error (${code}).`;
  }

  return clean || fallback;
}

export function BotProfileClient({ copy }: BotProfileClientProps) {
  const studioState = useQuery(api.configuration.getBotStudioState, {});
  const saveBotStudioState = useMutation(api.configuration.saveBotStudioState);
  const previewBotReply = useAction(api.ai.previewBotReply);
  const [form, setForm] = useState<FormState>(emptyState);
  const [previewInput, setPreviewInput] = useState(copy.exampleMessage);
  const [previewOutput, setPreviewOutput] = useState("");
  const [previewMeta, setPreviewMeta] = useState({
    ragContextUsed: false,
    ragChunkCount: 0,
    knowledgeSourceTitles: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const loadedState = useMemo<FormState>(() => {
    if (!studioState) {
      return emptyState;
    }

    return {
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
    };
  }, [studioState]);

  useEffect(() => {
    if (!studioState) {
      return;
    }

    setForm(loadedState);
  }, [loadedState, studioState]);

  const saveDisabled = useMemo(() => {
    return isSaving || !studioState?.canManage;
  }, [isSaving, studioState?.canManage]);

  if (studioState === undefined) {
    return <p className="px-4 py-2 text-sm text-muted-foreground md:px-6">{copy.loading}</p>;
  }

  const onFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (form.name.trim().length === 0) {
      toast.error(copy.validationNameEmpty);
      return false;
    }

    if (form.systemPrompt.trim().length === 0) {
      toast.error(copy.validationPromptEmpty);
      return false;
    }

    if (form.modelId.trim().length === 0) {
      toast.error(copy.validationModelEmpty);
      return false;
    }

    if (
      form.providerType === "digitalocean_reference" &&
      form.endpointUrl.trim().length === 0
    ) {
      toast.error(copy.validationEndpointRequired);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saveDisabled || !validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveBotStudioState({
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

      setForm((current) => ({
        ...current,
        apiKey: "",
      }));
      toast.success(copy.saveSuccess);
    } catch (error) {
      toast.error(`${copy.saveFailed}: ${normalizeActionError(error, copy.unknownSaveFailure)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (isPreviewing || !validateForm()) {
      return;
    }

    setIsPreviewing(true);
    try {
      const preview = await previewBotReply({
        latestUserMessage: previewInput,
        history: [],
        configOverride: {
          defaultLanguage: form.defaultLanguage,
          systemPrompt: form.systemPrompt,
          localizedPromptTemplates: {
            en: form.templateEn || undefined,
            id: form.templateId || undefined,
          },
          providerType: form.providerType,
          modelId: form.modelId,
          endpointUrl: form.endpointUrl || undefined,
          apiKey: form.apiKey || undefined,
          temperature: form.temperature,
          maxTokens: form.maxTokens,
        },
      });

      setPreviewOutput(preview.content);
      setPreviewMeta({
        ragContextUsed: preview.ragContextUsed,
        ragChunkCount: preview.ragChunkCount,
        knowledgeSourceTitles: preview.knowledgeSourceTitles,
      });
      toast.success(copy.previewSuccess);
    } catch (error) {
      const message = normalizeActionError(error, copy.previewFailed);
      setPreviewOutput(message);
      setPreviewMeta({
        ragContextUsed: false,
        ragChunkCount: 0,
        knowledgeSourceTitles: [],
      });
      toast.error(`${copy.previewFailed}: ${message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bot Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure runtime prompts, provider settings, and preview responses with the current draft configuration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Basic Form</CardTitle>
            <CardDescription>
              A comprehensive form demo with all field types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <SectionTitle>Text Inputs</SectionTitle>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>{copy.botName}</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => onFieldChange("name", event.target.value)}
                    placeholder="Customer Assistant"
                  />
                </label>
                <label className="grid gap-2">
                  <Label>{copy.modelId}</Label>
                  <Input
                    value={form.modelId}
                    onChange={(event) => onFieldChange("modelId", event.target.value)}
                    placeholder="gemini-2.5-flash"
                  />
                </label>
                <label className="grid gap-2">
                  <Label>{copy.endpointUrl}</Label>
                  <Input
                    value={form.endpointUrl}
                    onChange={(event) => onFieldChange("endpointUrl", event.target.value)}
                    placeholder={copy.endpointPlaceholder}
                  />
                </label>
                <label className="grid gap-2">
                  <Label>{copy.apiKey}</Label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(event) => onFieldChange("apiKey", event.target.value)}
                    placeholder={
                      studioState.state.hasApiKey
                        ? copy.apiKeyKeepPlaceholder
                        : copy.apiKeyPastePlaceholder
                    }
                  />
                </label>
              </div>

              <SectionTitle>Textarea</SectionTitle>

              <label className="grid gap-2">
                <Label>{copy.systemPrompt}</Label>
                <Textarea
                  value={form.systemPrompt}
                  onChange={(event) => onFieldChange("systemPrompt", event.target.value)}
                  className="min-h-36 rounded-3xl"
                />
              </label>

              <SectionTitle>Select & Combobox</SectionTitle>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>{copy.defaultLanguage}</Label>
                  <select
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
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
                  <Label>{copy.provider}</Label>
                  <select
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
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
              </div>

              <SectionTitle>Localized Prompts</SectionTitle>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>{copy.englishTemplate}</Label>
                  <Textarea
                    value={form.templateEn}
                    onChange={(event) => onFieldChange("templateEn", event.target.value)}
                    className="min-h-28 rounded-3xl"
                  />
                </label>
                <label className="grid gap-2">
                  <Label>{copy.bahasaTemplate}</Label>
                  <Textarea
                    value={form.templateId}
                    onChange={(event) => onFieldChange("templateId", event.target.value)}
                    className="min-h-28 rounded-3xl"
                  />
                </label>
              </div>

              <SectionTitle>Slider</SectionTitle>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{copy.temperature}</Label>
                    <Badge variant="secondary">{form.temperature.toFixed(1)}</Badge>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(event) =>
                      onFieldChange("temperature", Number(event.target.value))
                    }
                    className="accent-primary w-full"
                  />
                </label>
                <label className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{copy.maxTokens}</Label>
                    <Badge variant="secondary">{form.maxTokens}</Badge>
                  </div>
                  <input
                    type="range"
                    min="64"
                    max="4096"
                    step="64"
                    value={form.maxTokens}
                    onChange={(event) =>
                      onFieldChange("maxTokens", Number(event.target.value))
                    }
                    className="accent-primary w-full"
                  />
                </label>
              </div>

              <SectionTitle>Toggle & Switch</SectionTitle>

              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.escalationEnabled}
                  onChange={(event) =>
                    onFieldChange("escalationEnabled", event.target.checked)
                  }
                />
                <span>{copy.enableEscalation}</span>
              </label>

              <label className="grid gap-2">
                <Label>{copy.escalationMessage}</Label>
                <Textarea
                  value={form.escalationMessage}
                  onChange={(event) =>
                    onFieldChange("escalationMessage", event.target.value)
                  }
                  className={cn("min-h-24 rounded-3xl", !form.escalationEnabled && "opacity-60")}
                  disabled={!form.escalationEnabled}
                />
              </label>

              <Separator />
              <div className="flex gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(loadedState);
                    setPreviewOutput("");
                    setPreviewMeta({
                      ragContextUsed: false,
                      ragChunkCount: 0,
                      knowledgeSourceTitles: [],
                    });
                  }}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  disabled={saveDisabled}
                  onClick={handleSave}
                  className="flex-1"
                >
                  {isSaving ? copy.savePending : copy.save}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="xl:sticky xl:top-16 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{copy.emulatorTitle}</CardTitle>
              <CardDescription>{copy.emulatorBody}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{form.providerType}</Badge>
                <Badge variant="outline">{form.modelId}</Badge>
                <Badge variant="outline">{form.defaultLanguage}</Badge>
              </div>

              <label className="grid gap-2">
                <Label>{copy.latestUserMessage}</Label>
                <Textarea
                  className="min-h-32 rounded-3xl"
                  value={previewInput}
                  onChange={(event) => setPreviewInput(event.target.value)}
                />
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={isPreviewing}
                className="w-full"
              >
                {isPreviewing ? copy.previewPending : copy.preview}
              </Button>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
                  {copy.draftOutput}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {previewOutput || copy.missingRuntime}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">{copy.ragStatus}: </span>
                  {previewMeta.ragContextUsed
                    ? `${copy.ragStatusOn} (${previewMeta.ragChunkCount})`
                    : copy.ragStatusOff}
                </p>
                <div>
                  <p className="font-medium">{copy.knowledgeSources}</p>
                  {previewMeta.knowledgeSourceTitles.length === 0 ? (
                    <p className="text-muted-foreground mt-1">
                      {copy.knowledgeSourcesEmpty}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {previewMeta.knowledgeSourceTitles.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
