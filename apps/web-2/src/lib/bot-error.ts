export type BotErrorKind = "ai_tokens_exhausted" | "other";

export type BotErrorDisplay = {
  kind: BotErrorKind;
  title: string;
  message: string;
  details: string[];
  raw: string;
};

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractPlanNameFromPlanLimit(message: string): string | null {
  const match = message.match(
    /Plan limit reached:\s*(.+?)\s+has\s+no\s+AI\s+tokens\s+left/i,
  );
  return match?.[1]?.trim() ?? null;
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function normalizeProviderFailureEntries(parsed: unknown): Array<{
  errorCode?: string;
  provider?: string;
  model?: string;
  status?: string;
}> {
  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord).map((entry) => ({
      errorCode: pickString(entry.errorCode) ?? undefined,
      provider: pickString(entry.provider) ?? undefined,
      model: pickString(entry.model) ?? undefined,
      status: pickString(entry.status) ?? undefined,
    }));
  }

  if (isRecord(parsed)) {
    return [
      {
        errorCode:
          pickString(parsed.errorCode) ??
          pickString(parsed.message) ??
          undefined,
        provider: pickString(parsed.provider) ?? undefined,
        model: pickString(parsed.model) ?? undefined,
        status: pickString(parsed.status) ?? undefined,
      },
    ];
  }

  return [];
}

export function formatBotErrorForDisplay(
  raw: string | null | undefined,
): BotErrorDisplay | null {
  if (!raw || !raw.trim()) {
    return null;
  }

  const trimmed = raw.trim();

  const parsed = looksLikeJson(trimmed) ? safeJsonParse(trimmed) : null;
  const providerFailures = parsed
    ? normalizeProviderFailureEntries(parsed)
    : [];

  const candidateMessages: string[] = [];
  if (providerFailures.length > 0) {
    for (const failure of providerFailures) {
      if (failure.errorCode) {
        candidateMessages.push(failure.errorCode);
      }
    }
  } else {
    candidateMessages.push(trimmed);
  }

  const planLimitMessage = candidateMessages.find(
    (message) =>
      /Plan limit reached:/i.test(message) &&
      /no\s+AI\s+tokens\s+left/i.test(message),
  );

  if (planLimitMessage) {
    const planName = extractPlanNameFromPlanLimit(planLimitMessage);
    const details: string[] = [];

    if (planName) {
      details.push(`Plan: ${planName}`);
    }

    const firstFailure = providerFailures[0];
    if (firstFailure?.provider)
      details.push(`Provider: ${firstFailure.provider}`);
    if (firstFailure?.model) details.push(`Model: ${firstFailure.model}`);

    // Keep the raw backend message visible for debugging.
    details.push(planLimitMessage);

    return {
      kind: "ai_tokens_exhausted",
      title: "Upgrade required",
      message:
        "AI tidak memproses pesan karena limit AI tokens sudah habis untuk periode billing ini. Upgrade plan untuk melanjutkan.",
      details,
      raw: trimmed,
    };
  }

  if (providerFailures.length > 0) {
    const firstFailure = providerFailures[0];
    const details: string[] = [];
    if (firstFailure.status) details.push(`Status: ${firstFailure.status}`);
    if (firstFailure.provider)
      details.push(`Provider: ${firstFailure.provider}`);
    if (firstFailure.model) details.push(`Model: ${firstFailure.model}`);

    const errorCode = firstFailure.errorCode;
    if (errorCode) {
      details.push(errorCode);
    }

    return {
      kind: "other",
      title: "Bot error",
      message: errorCode ?? "Bot gagal memproses pesan.",
      details,
      raw: trimmed,
    };
  }

  return {
    kind: "other",
    title: "Bot error",
    message: trimmed,
    details: [trimmed],
    raw: trimmed,
  };
}

export function formatBotErrorText(raw: string): string {
  const display = formatBotErrorForDisplay(raw);
  if (!display) return raw;

  const lines: string[] = [];

  if (display.kind === "ai_tokens_exhausted") {
    lines.push(display.message);
  } else {
    lines.push(display.message);
  }

  const detailLines = display.details
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => `- ${line}`);

  if (detailLines.length > 0) {
    lines.push("", ...detailLines);
  }

  return lines.join("\n");
}
