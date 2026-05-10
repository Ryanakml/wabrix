export type AiCostProvider = "google" | "digitalocean_reference";

export type AiUsageLike = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type Pricing = {
  inputUsdPer1MTokens: number;
  outputUsdPer1MTokens: number;
};

type PricingRule = {
  provider: AiCostProvider;
  modelPrefix: string;
  pricing: Pricing;
};

type EnvPricingJson = Record<
  string,
  { inputUsdPer1MTokens: number; outputUsdPer1MTokens: number }
>;

const DEFAULT_RULES: PricingRule[] = [
  // Defaults are intentionally limited and only act as an *estimator*.
  // Override via AI_MODEL_PRICING_USD_JSON if you want exact costs.
  {
    provider: "google",
    modelPrefix: "gemini-1.5-flash",
    pricing: { inputUsdPer1MTokens: 0.35, outputUsdPer1MTokens: 1.05 },
  },
  {
    provider: "google",
    modelPrefix: "gemini-1.5-pro",
    pricing: { inputUsdPer1MTokens: 3.5, outputUsdPer1MTokens: 10.5 },
  },
  {
    provider: "google",
    modelPrefix: "gemini-2.0-flash",
    pricing: { inputUsdPer1MTokens: 0.35, outputUsdPer1MTokens: 1.05 },
  },
];

let cachedEnvJson: string | undefined;
let cachedRules: PricingRule[] | undefined;

function parseEnvPricingRules(envJson: string): PricingRule[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(envJson);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object") return [];

  const rules: PricingRule[] = [];
  for (const [key, value] of Object.entries(parsed as EnvPricingJson)) {
    if (!key || !value) continue;
    const [providerRaw, ...modelPrefixParts] = key.split(":");
    if (!providerRaw) continue;
    const modelPrefix = modelPrefixParts.join(":").trim();
    if (!modelPrefix) continue;

    const provider = providerRaw.trim() as AiCostProvider;
    if (provider !== "google" && provider !== "digitalocean_reference") {
      continue;
    }

    const inputUsdPer1MTokens = Number(value.inputUsdPer1MTokens);
    const outputUsdPer1MTokens = Number(value.outputUsdPer1MTokens);
    if (
      !Number.isFinite(inputUsdPer1MTokens) ||
      !Number.isFinite(outputUsdPer1MTokens)
    ) {
      continue;
    }

    rules.push({
      provider,
      modelPrefix,
      pricing: { inputUsdPer1MTokens, outputUsdPer1MTokens },
    });
  }

  return rules;
}

function getPricingRules(): PricingRule[] {
  const envJson = process.env.AI_MODEL_PRICING_USD_JSON;
  if (envJson === cachedEnvJson && cachedRules) {
    return cachedRules;
  }

  const envRules = envJson ? parseEnvPricingRules(envJson) : [];
  // Prefer longest modelPrefix matches first.
  const combined = [...envRules, ...DEFAULT_RULES].sort(
    (a, b) => b.modelPrefix.length - a.modelPrefix.length,
  );

  cachedEnvJson = envJson;
  cachedRules = combined;
  return combined;
}

function findPricingRule(
  provider: AiCostProvider,
  modelId: string,
): PricingRule | null {
  const normalizedModel = (modelId ?? "").trim();
  if (!normalizedModel) return null;

  const rules = getPricingRules();
  for (const rule of rules) {
    if (rule.provider !== provider) continue;
    if (normalizedModel.startsWith(rule.modelPrefix)) {
      return rule;
    }
  }

  // Fallback: if it's Google and looks like a Gemini model, assume Flash-like pricing.
  if (provider === "google" && /^gemini[-_]/i.test(normalizedModel)) {
    return {
      provider,
      modelPrefix: "gemini",
      pricing: { inputUsdPer1MTokens: 0.35, outputUsdPer1MTokens: 1.05 },
    };
  }

  return null;
}

function clampNonNegative(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function estimateAiCostUsd(args: {
  provider: AiCostProvider;
  modelId: string;
  usage: AiUsageLike | null | undefined;
}): number | undefined {
  const promptTokensRaw = args.usage?.promptTokens;
  const completionTokensRaw = args.usage?.completionTokens;
  const totalTokensRaw = args.usage?.totalTokens;

  const promptTokens =
    typeof promptTokensRaw === "number"
      ? clampNonNegative(promptTokensRaw)
      : undefined;
  const completionTokens =
    typeof completionTokensRaw === "number"
      ? clampNonNegative(completionTokensRaw)
      : undefined;
  const totalTokens =
    typeof totalTokensRaw === "number"
      ? clampNonNegative(totalTokensRaw)
      : undefined;

  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  const rule = findPricingRule(args.provider, args.modelId);
  if (!rule) {
    return undefined;
  }

  const inputTokens = promptTokens ?? totalTokens ?? 0;
  const outputTokens = completionTokens ?? 0;

  const cost =
    (inputTokens / 1_000_000) * rule.pricing.inputUsdPer1MTokens +
    (outputTokens / 1_000_000) * rule.pricing.outputUsdPer1MTokens;

  // Keep a stable precision for storage/aggregation.
  return Number(cost.toFixed(6));
}
