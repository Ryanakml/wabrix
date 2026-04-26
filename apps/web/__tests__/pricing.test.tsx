import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingClient } from "../app/[locale]/(marketing)/pricing/pricing-client";

describe("Pricing page", () => {
  it("switches provider and currency based on the selected country", () => {
    render(
      <PricingClient
        locale="en"
        detectedCountry="ID"
        copy={{
          eyebrow: "Phase 13 pricing",
          headline: "Pricing",
          subheadline: "Routing preview",
          detectedLabel: "Detected country",
          indiaNotSupportedHint: "Routing note",
          gatewayLabel: "Checkout provider",
          currencyLabel: "Currency",
          monthlyLabel: "per month",
          recommended: "Most popular",
          startCta: "Open billing workspace",
          contactCta: "Need procurement context first?",
          regionIndonesia: "Indonesia",
          regionGlobal: "Global",
          regionIndonesiaBody: "ID checkout",
          regionGlobalBody: "USD checkout",
          included: "Included",
          seats: "Seats",
          aiTokens: "AI tokens",
          outboundMessages: "Outbound messages",
          trustedLabel: "Routing notes",
          trustedBody: "Geo-aware routing",
          docsCta: "Read docs",
          compareTitle: "Compare",
          compareBody: "Real logic",
        }}
      />,
    );

    expect(screen.getAllByText("midtrans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IDR").length).toBeGreaterThan(0);

    const globalTab = screen.getByRole("tab", { name: "Global" });
    fireEvent.focus(globalTab);
    fireEvent.keyDown(globalTab, { key: "Enter", code: "Enter" });

    expect(screen.getAllByText("polar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USD").length).toBeGreaterThan(0);
  });
});
