import { describe, expect, it } from "vitest";
import {
  buildUsageLimitErrorMessage,
  normalizeMidtransSubscriptionStatus,
  normalizePolarSubscriptionStatus,
  resolveGatewayForCountry,
} from "../convex/lib/billing";

describe("billing helpers", () => {
  it("routes Indonesia to Midtrans with IDR", () => {
    expect(resolveGatewayForCountry("ID")).toEqual({
      gateway: "midtrans",
      currency: "IDR",
    });
  });

  it("routes non-Indonesia countries to Polar with USD", () => {
    expect(resolveGatewayForCountry("US")).toEqual({
      gateway: "polar",
      currency: "USD",
    });
  });

  it("normalizes Polar statuses into provider-agnostic states", () => {
    expect(normalizePolarSubscriptionStatus("subscription.active")).toBe("active");
    expect(normalizePolarSubscriptionStatus("subscription.canceled")).toBe("canceled");
  });

  it("normalizes Midtrans statuses into provider-agnostic states", () => {
    expect(normalizeMidtransSubscriptionStatus("settlement")).toBe("active");
    expect(normalizeMidtransSubscriptionStatus("pending")).toBe("incomplete");
    expect(normalizeMidtransSubscriptionStatus("expire")).toBe(
      "incomplete_expired",
    );
  });

  it("builds explicit limit messages", () => {
    expect(
      buildUsageLimitErrorMessage({
        kind: "outbound_messages",
        planName: "Starter",
      }),
    ).toContain("Starter");
  });
});
