import { describe, expect, it } from "vitest";
import { estimateAiCostUsd } from "../convex/lib/aiCost";

describe("estimateAiCostUsd", () => {
  it("returns undefined when no token usage is present", () => {
    expect(
      estimateAiCostUsd({
        provider: "google",
        modelId: "gemini-1.5-flash",
        usage: {},
      }),
    ).toBeUndefined();
  });

  it("estimates using prompt + completion tokens", () => {
    // gemini-1.5-flash default: input 0.35 / 1M, output 1.05 / 1M
    const cost = estimateAiCostUsd({
      provider: "google",
      modelId: "gemini-1.5-flash",
      usage: { promptTokens: 1000, completionTokens: 500 },
    });

    // 1000/1e6*0.35 + 500/1e6*1.05 = 0.000875
    expect(cost).toBe(0.000875);
  });

  it("supports env override pricing rules", () => {
    const previous = process.env.AI_MODEL_PRICING_USD_JSON;
    process.env.AI_MODEL_PRICING_USD_JSON = JSON.stringify({
      "google:gemini-1.5-flash": {
        inputUsdPer1MTokens: 1,
        outputUsdPer1MTokens: 2,
      },
    });

    try {
      const cost = estimateAiCostUsd({
        provider: "google",
        modelId: "gemini-1.5-flash",
        usage: { promptTokens: 1000, completionTokens: 500 },
      });
      // 1000/1e6*1 + 500/1e6*2 = 0.002
      expect(cost).toBe(0.002);
    } finally {
      process.env.AI_MODEL_PRICING_USD_JSON = previous;
    }
  });

  it("estimates DigitalOcean reference pricing for deepseek-3.2", () => {
    const cost = estimateAiCostUsd({
      provider: "digitalocean_reference",
      modelId: "deepseek-3.2",
      usage: { promptTokens: 1000, completionTokens: 500 },
    });

    expect(cost).toBe(0.0013);
  });
});
