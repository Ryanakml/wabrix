import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsAppIntegrationClient } from "../features/whatsapp-integration/components/whatsapp-integration-client";

const saveWhatsAppIntegration = vi.fn(async () => ({
  integrationId: "integration_123",
  connectionStatus: "configured",
}));
const saveWhatsAppTemplate = vi.fn(async () => ({
  templateId: "template_123",
}));
const archiveWhatsAppTemplate = vi.fn(async () => ({
  templateId: "template_123",
}));
const syncWhatsAppTemplates = vi.fn(async () => ({ count: 1 }));
const refreshWhatsAppLifecycle = vi.fn(async () => ({ refreshed: true }));
const requestPhoneVerificationCode = vi.fn(async () => ({}));
const verifyPhoneVerificationCode = vi.fn(async () => ({}));
const apiMock = vi.hoisted(() => ({
  whatsapp: {
    getWhatsAppIntegrationState: {},
    saveWhatsAppIntegration: {},
    saveWhatsAppTemplate: {},
    archiveWhatsAppTemplate: {},
  },
  whatsappAction: {
    syncWhatsAppTemplates: {},
    refreshWhatsAppLifecycle: {},
    requestPhoneVerificationCode: {},
    verifyPhoneVerificationCode: {},
  },
}));
const whatsappIntegrationState = {
  canManage: true,
  botConfigured: true,
  linkedBotName: "Customer Assistant",
  blockers: [],
  templates: [],
  templateSyncLogs: [],
  lifecycleEvents: [],
  state: {
    integrationId: "integration_123",
    phoneNumberId: "",
    businessAccountId: "",
    enabled: false,
    connectionStatus: "not_connected",
    hasAccessToken: false,
    hasAppSecret: false,
    hasVerifyToken: false,
    approvalStatus: "pending",
    phoneVerificationStatus: "missing",
    businessProfileStatus: "pending",
    displayNameReviewStatus: "pending",
    messagingLimitTier: null,
    lastWebhookEventAt: null,
    lastTemplateSyncAt: null,
    lastTemplateSyncError: null,
    lastLifecycleRefreshAt: null,
    lastLifecycleError: null,
    businessProfile: null,
  },
};

vi.mock("convex/react", () => ({
  useQuery: () => whatsappIntegrationState,
  useMutation: (ref: unknown) => {
    switch (ref) {
      case apiMock.whatsapp.saveWhatsAppIntegration:
        return saveWhatsAppIntegration;
      case apiMock.whatsapp.saveWhatsAppTemplate:
        return saveWhatsAppTemplate;
      case apiMock.whatsapp.archiveWhatsAppTemplate:
        return archiveWhatsAppTemplate;
      default:
        return vi.fn();
    }
  },
  useAction: (ref: unknown) => {
    switch (ref) {
      case apiMock.whatsappAction.syncWhatsAppTemplates:
        return syncWhatsAppTemplates;
      case apiMock.whatsappAction.refreshWhatsAppLifecycle:
        return refreshWhatsAppLifecycle;
      case apiMock.whatsappAction.requestPhoneVerificationCode:
        return requestPhoneVerificationCode;
      case apiMock.whatsappAction.verifyPhoneVerificationCode:
        return verifyPhoneVerificationCode;
      default:
        return vi.fn();
    }
  },
}));

vi.mock("@wabrix/backend/convex/_generated/api", () => ({
  api: apiMock,
}));

describe("WhatsApp integration", () => {
  it("submits the integration form and renders the active integration blocks", async () => {
    render(
      <WhatsAppIntegrationClient
        webhookUrl="http://localhost:8787/webhooks/whatsapp"
        copy={{
          headline: "WhatsApp Integration Setup",
          subheadline: "Production-safe WhatsApp admin ops for the active tenant.",
          loading: "Loading",
          save: "Save integration",
          savePending: "Saving",
          saveSuccess: "WhatsApp integration saved",
          configureBotFirst: "Configure Bot Studio first",
          phoneNumberId: "Phone number ID",
          businessAccountId: "Business account ID",
          accessToken: "Access token",
          accessTokenPlaceholder:
            "Leave blank to keep the current encrypted access token",
          appSecret: "App secret",
          appSecretPlaceholder:
            "Leave blank to keep the current encrypted app secret",
          verifyToken: "Verify token",
          verifyTokenPlaceholder:
            "Leave blank to keep the current hashed verify token",
          enabled: "Enable WhatsApp integration",
          webhookUrl: "Webhook URL",
          connectionStatus: "Connection status",
          linkedBot: "Linked bot",
          notConfigured: "Not configured",
          configured: "Configured",
          keepSecretHint: "Secret fields stay blank after save.",
          secretStatuses: "Credential status",
          accessTokenStatus: "Access token",
          appSecretStatus: "App secret",
          verifyTokenStatus: "Verify token",
          lifecycleTitle: "WABA lifecycle",
          approvalStatus: "Approval",
          phoneVerificationStatus: "Phone verification",
          businessProfileStatus: "Business profile",
          displayNameReviewStatus: "Display name review",
          messagingTier: "Messaging tier",
          blockers: "Blockers",
          refreshLifecycle: "Refresh lifecycle",
          refreshTemplates: "Sync templates",
          requestOtp: "Request OTP",
          verifyOtp: "Verify OTP",
          otpCode: "OTP code",
          otpMethodSms: "SMS",
          otpMethodVoice: "Voice",
          actionPending: "Working",
          templatesTitle: "Templates",
          templateName: "Template name",
          templateLanguageCode: "Language code",
          templateCategory: "Category",
          templateBody: "Template body",
          templateSave: "Save template",
          templateSaved: "Template saved",
          templateArchive: "Archive",
          templateStatus: "Template status",
          templateRejectionReason: "Rejection reason",
          templateEmpty: "No templates",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Phone number ID"), {
      target: { value: "123456789" },
    });
    fireEvent.change(screen.getByLabelText("Business account ID"), {
      target: { value: "987654321" },
    });
    fireEvent.change(screen.getByLabelText("Access token"), {
      target: { value: "meta-access-token" },
    });
    fireEvent.change(screen.getByLabelText("App secret"), {
      target: { value: "meta-app-secret" },
    });
    fireEvent.change(screen.getByLabelText("Verify token"), {
      target: { value: "meta-verify-token" },
    });
    fireEvent.click(screen.getByLabelText("Enable WhatsApp integration"));
    fireEvent.click(screen.getByText("Save integration"));

    await waitFor(() => {
      expect(saveWhatsAppIntegration).toHaveBeenCalledWith({
        phoneNumberId: "123456789",
        businessAccountId: "987654321",
        accessToken: "meta-access-token",
        appSecret: "meta-app-secret",
        verifyToken: "meta-verify-token",
        enabled: true,
      });
    });

    expect(screen.getByText("http://localhost:8787/webhooks/whatsapp")).toBeDefined();
    expect(screen.getByText("Customer Assistant")).toBeDefined();
  });
});
