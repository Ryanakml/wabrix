import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsAppSettingsClient } from "../app/[locale]/dashboard/whatsapp/whatsapp-settings-client";

const saveWhatsAppIntegration = vi.fn(async () => ({
  integrationId: "integration_123",
  connectionStatus: "configured",
}));
const whatsappIntegrationState = {
  canManage: true,
  botConfigured: true,
  linkedBotName: "Customer Assistant",
  state: {
    integrationId: "integration_123",
    phoneNumberId: "",
    businessAccountId: "",
    enabled: false,
    connectionStatus: "not_connected",
    hasAccessToken: false,
    hasAppSecret: false,
    hasVerifyToken: false,
  },
};

vi.mock("convex/react", () => ({
  useQuery: () => whatsappIntegrationState,
  useMutation: () => saveWhatsAppIntegration,
}));

vi.mock("@wabrix/backend/convex/_generated/api", () => ({
  api: {
    whatsapp: {
      getWhatsAppIntegrationState: {},
      saveWhatsAppIntegration: {},
    },
  },
}));

describe("WhatsApp setup", () => {
  it("submits the setup form without exposing raw secrets in the UI state contract", async () => {
    render(
      <WhatsAppSettingsClient
        webhookUrl="http://localhost:8787/webhooks/whatsapp"
        copy={{
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
