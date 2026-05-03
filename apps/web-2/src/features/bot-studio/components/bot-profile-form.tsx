"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as z from "zod";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { useAppForm, useFormFields } from "@/components/ui/tanstack-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type BotProfileFormValues = {
  name: string;
  defaultLanguage: "auto" | "en" | "id";
  systemPrompt: string;
  providerType: "google" | "digitalocean_reference";
  modelId: string;
  endpointUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  escalationEnabled: boolean;
  escalationMessage: string;
};

const defaultValues: BotProfileFormValues = {
  name: "Customer Support Bot",
  defaultLanguage: "auto",
  systemPrompt:
    "Kamu adalah agen customer support yang ramah, cepat, dan akurat.",
  providerType: "google",
  modelId: "gemini-2.5-flash",
  endpointUrl: "",
  apiKey: "",
  temperature: 0.4,
  maxTokens: 512,
  escalationEnabled: true,
  escalationMessage:
    "If the user needs a human agent, collect the details and offer handoff.",
};

const botProfileSchema = z
  .object({
    name: z.string().min(1, "Bot name is required."),
    defaultLanguage: z.enum(["auto", "en", "id"]),
    systemPrompt: z.string().min(1, "System prompt is required."),
    providerType: z.enum(["google", "digitalocean_reference"]),
    modelId: z.string().min(1, "Model ID is required."),
    endpointUrl: z.string(),
    apiKey: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(64).max(4096),
    escalationEnabled: z.boolean(),
    escalationMessage: z.string(),
  })
  .superRefine((value, ctx) => {
    if (
      value.providerType === "digitalocean_reference" &&
      value.endpointUrl.trim().length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endpointUrl"],
        message: "Endpoint URL is required for DigitalOcean Reference.",
      });
    }
  });

const languageOptions = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
] as const;

const providerOptions = [
  { value: "google", label: "Google" },
  { value: "digitalocean_reference", label: "DigitalOcean Reference" },
] as const;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Separator />
      <h3 className="text-muted-foreground pt-2 text-sm font-medium tracking-wide uppercase">
        {children}
      </h3>
    </div>
  );
}

function mapStudioStateToFormValues(
  state:
    | {
        name: string;
        defaultLanguage: "auto" | "en" | "id";
        systemPrompt: string;
        localizedPromptTemplates: { en?: string; id?: string };
        providerType: "google" | "digitalocean_reference";
        modelId: string;
        endpointUrl: string | null;
        temperature: number;
        maxTokens: number;
        escalationEnabled: boolean;
        escalationMessage: string;
      }
    | undefined,
): BotProfileFormValues {
  if (!state) {
    return defaultValues;
  }

  return {
    name: state.name,
    defaultLanguage: state.defaultLanguage,
    systemPrompt: state.systemPrompt,
    providerType: state.providerType,
    modelId: state.modelId,
    endpointUrl: state.endpointUrl ?? "",
    apiKey: "",
    temperature: state.temperature,
    maxTokens: state.maxTokens,
    escalationEnabled: state.escalationEnabled,
    escalationMessage: state.escalationMessage ?? "",
  };
}

export function BotProfileForm() {
  const studioState = useQuery(api.configuration.getBotStudioState, {});
  const saveBotStudioState = useMutation(api.configuration.saveBotStudioState);
  const hydratedKeyRef = useRef<string | null>(null);
  const formRef = useRef<{
    reset: (values?: BotProfileFormValues) => void;
  } | null>(null);

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: botProfileSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await saveBotStudioState({
          name: value.name.trim(),
          defaultLanguage: value.defaultLanguage,
          systemPrompt: value.systemPrompt.trim(),
          localizedPromptTemplates: {},
          providerType: value.providerType,
          modelId: value.modelId.trim(),
          endpointUrl: value.endpointUrl.trim() || undefined,
          apiKey: value.apiKey.trim() || undefined,
          temperature: value.temperature,
          maxTokens: value.maxTokens,
          escalationEnabled: value.escalationEnabled,
          escalationMessage: value.escalationMessage.trim() || undefined,
          emulatorHistory: [],
        });
        formRef.current?.reset({
          ...value,
          apiKey: "",
        });
        toast.success("Bot profile saved.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save bot profile.",
        );
      }
    },
  });
  formRef.current = form;

  const {
    FormTextField,
    FormTextareaField,
    FormSelectField,
    FormSwitchField,
    FormSliderField,
  } = useFormFields<BotProfileFormValues>();

  const studioStateKey = useMemo(() => {
    if (!studioState) {
      return null;
    }

    return JSON.stringify({
      name: studioState.state.name,
      defaultLanguage: studioState.state.defaultLanguage,
      systemPrompt: studioState.state.systemPrompt,
      localizedPromptTemplates: studioState.state.localizedPromptTemplates,
      providerType: studioState.state.providerType,
      modelId: studioState.state.modelId,
      endpointUrl: studioState.state.endpointUrl,
      temperature: studioState.state.temperature,
      maxTokens: studioState.state.maxTokens,
      escalationEnabled: studioState.state.escalationEnabled,
      escalationMessage: studioState.state.escalationMessage,
    });
  }, [studioState]);

  useEffect(() => {
    if (!studioState || studioStateKey === hydratedKeyRef.current) {
      return;
    }

    form.reset(mapStudioStateToFormValues(studioState.state));
    hydratedKeyRef.current = studioStateKey;
  }, [form, studioState, studioStateKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Bot Profile</CardTitle>
        <p className="text-muted-foreground text-sm">
          Keep the active bot profile, prompt policy, and model settings in sync
          with Convex.
        </p>
      </CardHeader>
      <CardContent>
        <form.AppForm>
          <form.Form className="space-y-6">
            <SectionTitle>Profile</SectionTitle>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormTextField
                name="name"
                label="Bot Name"
                required
                placeholder="Customer Support Bot"
                validators={{
                  onBlur: z.string().min(1, "Bot name is required."),
                }}
              />
              <FormSelectField
                name="defaultLanguage"
                label="Default Language"
                required
                options={[...languageOptions]}
                placeholder="Select a language"
              />
            </div>

            <FormTextareaField
              name="systemPrompt"
              label="System Prompt"
              required
              rows={6}
              maxLength={4000}
              validators={{
                onBlur: z.string().min(1, "System prompt is required."),
              }}
            />

            <SectionTitle>Model Settings</SectionTitle>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormSelectField
                name="providerType"
                label="Provider"
                required
                options={[...providerOptions]}
                placeholder="Select a provider"
              />
              <FormTextField
                name="modelId"
                label="Model ID"
                required
                placeholder="gemini-2.5-flash"
                validators={{
                  onBlur: z.string().min(1, "Model ID is required."),
                }}
              />
              <FormTextField
                name="endpointUrl"
                label="Endpoint URL"
                type="url"
                placeholder="https://api.example.com/v1"
              />
              <FormTextField
                name="apiKey"
                label="API Key"
                type="password"
                placeholder={
                  studioState?.state.hasApiKey
                    ? "Leave blank to keep current key"
                    : "Paste provider API key"
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormSliderField
                name="temperature"
                label="Temperature"
                description="Control response variability."
                min={0}
                max={2}
                step={0.1}
              />
              <FormSliderField
                name="maxTokens"
                label="Max Tokens"
                description="Limit response length."
                min={64}
                max={4096}
                step={64}
              />
            </div>

            <SectionTitle>Escalation</SectionTitle>

            <FormSwitchField
              name="escalationEnabled"
              label="Enable Handoff"
              description="Allow the bot to escalate conversations to a human agent."
            />

            <FormTextareaField
              name="escalationMessage"
              label="Handoff Message"
              rows={4}
              maxLength={1000}
            />

            <Separator />
            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  form.reset(mapStudioStateToFormValues(studioState?.state))
                }
              >
                Reset
              </Button>
              <form.SubmitButton
                className="flex-1"
                disabled={!studioState?.canManage}
              >
                Save Profile
              </form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </CardContent>
    </Card>
  );
}
