import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingClient } from "../app/[locale]/dashboard/billing/billing-client";

const billingState = {
  planCatalog: [
    {
      key: "starter",
      name: "Starter",
      monthlyPriceUsdCents: 1900,
      monthlyPriceIdr: 249000,
      includedAiTokens: 50000,
      includedOutboundMessages: 500,
      includedSeats: 1,
      tagline: "Starter plan",
    },
    {
      key: "growth",
      name: "Growth",
      monthlyPriceUsdCents: 4900,
      monthlyPriceIdr: 649000,
      includedAiTokens: 250000,
      includedOutboundMessages: 2500,
      includedSeats: 5,
      tagline: "Growth plan",
    },
  ],
  currentSubscription: {
    id: "sub_123",
    planKey: "starter",
    status: "active",
    gateway: "polar",
    billingCountry: "US",
    currency: "USD",
    amount: 1900,
    currentPeriodStart: Date.UTC(2026, 3, 1),
    currentPeriodEnd: Date.UTC(2026, 3, 30),
    cancelAtPeriodEnd: false,
  },
  currentUsage: {
    periodKey: "2026-04",
    aiTokensUsed: 1200,
    aiTokensLimit: 50000,
    outboundMessagesUsed: 12,
    outboundMessagesLimit: 500,
    seatsUsed: 1,
    seatsLimit: 1,
  },
  recentEvents: [
    {
      id: "event_123",
      gateway: "polar",
      eventType: "checkout_session_created",
      status: "incomplete",
      currency: "USD",
      amount: 1900,
      createdAt: Date.UTC(2026, 3, 20),
    },
  ],
};

vi.mock("convex/react", () => ({
  useQuery: () => billingState,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("Billing page", () => {
  it("renders usage and starts checkout for the selected plan", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        checkoutUrl: "https://checkout.example.com/session_123",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BillingClient
        locale="en"
        detectedCountry="US"
        copy={{
          loading: "Loading",
          currentPlan: "Current subscription",
          noSubscription: "No subscription",
          status: "Status",
          gateway: "Gateway",
          period: "Period",
          usage: "Usage",
          aiTokens: "AI tokens",
          outboundMessages: "Outbound messages",
          seats: "Seats",
          recentEvents: "Recent billing events",
          noEvents: "No events",
          countryLabel: "Billing country",
          startCheckout: "Start checkout",
          checkoutPending: "Opening checkout…",
          checkoutFailed: "Checkout failed",
          managePlans: "Plan catalog",
          perMonth: "per month",
        }}
      />,
    );

    expect(screen.getAllByText("Starter")).toHaveLength(2);
    expect(screen.getByText("1,200 / 50,000")).toBeDefined();
    expect(screen.getByText("Checkout Session Created")).toBeDefined();

    fireEvent.click(screen.getByText("Upgrade"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/checkout",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/checkout",
      expect.objectContaining({
        body: JSON.stringify({
          planKey: "growth",
          billingCountry: "US",
          locale: "en",
        }),
      }),
    );
  });
});
