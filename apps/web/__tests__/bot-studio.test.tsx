import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BotStudioClient } from "../app/[locale]/dashboard/bot-studio/bot-studio-client";

const saveBotStudioState = vi.fn(async () => ({ botId: "bot_123" }));
const previewBotReply = vi.fn(async () => ({
  content: "Preview response",
  ragContextUsed: true,
  ragChunkCount: 2,
  knowledgeSourceTitles: ["Shipping FAQ"],
}));
const botStudioState = {
  canManage: true,
  state: {
    name: "Customer Assistant",
    defaultLanguage: "auto",
    systemPrompt: "System prompt",
    localizedPromptTemplates: {
      en: "English prompt",
      id: "Bahasa prompt",
    },
    providerType: "google",
    modelId: "gemini-2.5-flash",
    endpointUrl: null,
    temperature: 0.4,
    maxTokens: 512,
    hasApiKey: false,
    escalationEnabled: true,
    escalationMessage: "Escalate if needed",
  },
  recentRuns: [],
};

vi.mock("convex/react", () => ({
  useQuery: () => botStudioState,
  useMutation: () => saveBotStudioState,
  useAction: () => previewBotReply,
}));

vi.mock("@wabrix/backend/convex/_generated/api", () => ({
  api: {
    configuration: {
      getBotStudioState: {},
      saveBotStudioState: {},
    },
    ai: {
      previewBotReply: {},
    },
  },
}));

describe("Bot Studio", () => {
  it("saves bot configuration and previews emulator output", async () => {
    render(
      <BotStudioClient
        copy={{
          loading: "Loading",
          save: "Save configuration",
          savePending: "Saving",
          preview: "Run emulator",
          previewPending: "Generating",
          saveSuccess: "Saved bot configuration",
          missingRuntime: "No preview yet",
          exampleMessage: "Hello, is this business open on Sunday?",
          botName: "Bot name",
          defaultLanguage: "Default language",
          autoDetect: "Auto-detect",
          bahasaIndonesia: "Bahasa Indonesia",
          english: "English",
          systemPrompt: "System prompt",
          englishTemplate: "English template",
          bahasaTemplate: "Bahasa template",
          provider: "Provider",
          providerGoogle: "Google",
          providerDigitalOceanReference: "DigitalOcean reference",
          modelId: "Model ID",
          temperature: "Temperature",
          maxTokens: "Max tokens",
          endpointUrl: "Endpoint URL",
          endpointPlaceholder: "Optional DigitalOcean reference endpoint",
          apiKey: "API key",
          apiKeyKeepPlaceholder:
            "Leave blank to keep the current encrypted key",
          apiKeyPastePlaceholder: "Paste Google AI API key",
          enableEscalation: "Enable escalation handoff guidance",
          escalationMessage: "Escalation message",
          emulatorTitle: "Bot emulator",
          emulatorBody:
            "Preview the current prompt, language policy, and model settings without creating transport messages.",
          latestUserMessage: "Latest user message",
          draftOutput: "Draft output",
          ragStatus: "Knowledge retrieval",
          ragStatusOn: "Knowledge matched",
          ragStatusOff: "No knowledge matched",
          knowledgeSources: "Knowledge sources used",
          knowledgeSourcesEmpty: "No knowledge sources were used for this draft.",
          validationNameEmpty: "Bot name cannot be empty.",
          validationPromptEmpty: "System prompt cannot be empty.",
          validationModelEmpty: "Model ID cannot be empty.",
          validationEndpointRequired: "Endpoint URL is required specifically for the DigitalOcean provider.",
          saveFailed: "Save failed",
          previewFailed: "Preview failed",
          previewSuccess: "Draft generated",
          unknownSaveFailure: "Failed to save configuration",
        }}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Customer Assistant"), {
      target: { value: "Sales Concierge" },
    });
    fireEvent.click(screen.getByText("Save configuration"));

    await waitFor(() => {
      expect(saveBotStudioState).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sales Concierge",
          modelId: "gemini-2.5-flash",
        }),
      );
    });

    fireEvent.click(screen.getByText("Run emulator"));

    await waitFor(() => {
      expect(previewBotReply).toHaveBeenCalledWith({
        latestUserMessage: "Hello, is this business open on Sunday?",
        history: [],
      });
    });

    expect(await screen.findByText("Preview response")).toBeDefined();
    expect(await screen.findByText("Shipping FAQ")).toBeDefined();
  });
});
