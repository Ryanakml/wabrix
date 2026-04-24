import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingClient } from "../app/[locale]/pricing/pricing-client";

describe("Pricing page", () => {
  it("switches provider and currency based on the selected country", () => {
    render(
      <PricingClient
        locale="en"
        detectedCountry="ID"
        copy={{
          eyebrow: "Phase 12",
          headline: "Pricing",
          subheadline: "Routing preview",
          countryLabel: "Billing country",
          providerLabel: "Checkout provider",
          currencyLabel: "Currency",
          cta: "Open billing workspace",
          perMonth: "per month",
          seats: "Seats",
          aiTokens: "AI tokens",
          outboundMessages: "Outbound messages",
        }}
      />,
    );

    expect(screen.getByText("midtrans")).toBeDefined();
    expect(screen.getByText("IDR")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Billing country"), {
      target: { value: "US" },
    });

    expect(screen.getByText("polar")).toBeDefined();
    expect(screen.getByText("USD")).toBeDefined();
  });
});
