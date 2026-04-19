import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingPage from "../app/[locale]/onboarding/page";

// Mock Clerk components since they aren't available in standard jsdom natively
vi.mock("@clerk/nextjs", () => {
  return {
    OrganizationList: () => <div data-testid="clerk-org-list">OrganizationList Mock</div>,
    useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

describe("Onboarding Flow", () => {
  it("renders the onboarding page correctly", () => {
    render(<OnboardingPage />);
    
    // Check main text
    expect(screen.getByText("Welcome!")).toBeDefined();
    expect(screen.getByText("Please select or create an organization to continue.")).toBeDefined();
    
    // Check Clerk component rendered
    expect(screen.getByTestId("clerk-org-list")).toBeDefined();
  });
});
