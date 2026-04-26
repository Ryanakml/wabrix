export type OverviewUsageCounter = {
  id: string;
  periodKey: string;
  periodStart: number;
  aiRunCount: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
  aiTotalTokens: number;
  inboundMessageCount: number;
  outboundMessageCount: number;
  deliverySentCount: number;
  deliveryDeliveredCount: number;
  deliveryReadCount: number;
  deliveryFailedCount: number;
};

export type OverviewAnalyticsState = {
  usageCounters: OverviewUsageCounter[];
  conversationBreakdown: {
    open: number;
    closed: number;
    handoff: number;
    botPaused: number;
  };
  recentActivity: Array<{
    id: string;
    role: "user" | "assistant" | "agent" | "system";
    content: string;
    createdAt: number;
  }>;
};

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return value.toLocaleString();
}

function monthLabel(periodStart: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(periodStart));
}

function deliverySuccessRate(counter?: OverviewUsageCounter) {
  if (!counter || counter.deliverySentCount <= 0) {
    return 0;
  }

  return (counter.deliveryDeliveredCount / counter.deliverySentCount) * 100;
}

function recentPreview(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 56) {
    return trimmed || "No content";
  }

  return `${trimmed.slice(0, 56)}...`;
}

function roleLabel(role: OverviewAnalyticsState["recentActivity"][number]["role"]) {
  switch (role) {
    case "assistant":
      return "Assistant";
    case "agent":
      return "Agent";
    case "system":
      return "System";
    default:
      return "User";
  }
}

export function buildOverviewCards(analytics?: OverviewAnalyticsState) {
  const counters = analytics?.usageCounters ?? [];
  const latest = counters.at(-1);
  const previous = counters.at(-2);

  const currentDeliveryRate = deliverySuccessRate(latest);
  const previousDeliveryRate = deliverySuccessRate(previous);

  return [
    {
      description: "Total AI Tokens",
      value: formatCompactNumber(latest?.aiTotalTokens ?? 0),
      trend: formatSignedPercent(
        percentChange(latest?.aiTotalTokens ?? 0, previous?.aiTotalTokens ?? 0),
      ),
      positive: (latest?.aiTotalTokens ?? 0) >= (previous?.aiTotalTokens ?? 0),
      summary: "Token usage recorded in the latest period",
      detail: latest ? latest.periodKey : "No usage periods yet",
    },
    {
      description: "Outbound Messages",
      value: formatCompactNumber(latest?.outboundMessageCount ?? 0),
      trend: formatSignedPercent(
        percentChange(
          latest?.outboundMessageCount ?? 0,
          previous?.outboundMessageCount ?? 0,
        ),
      ),
      positive:
        (latest?.outboundMessageCount ?? 0) >= (previous?.outboundMessageCount ?? 0),
      summary: "Outbound delivery attempts in the latest period",
      detail: latest
        ? `${latest.inboundMessageCount.toLocaleString()} inbound in the same period`
        : "No usage periods yet",
    },
    {
      description: "AI Runs",
      value: formatCompactNumber(latest?.aiRunCount ?? 0),
      trend: formatSignedPercent(
        percentChange(latest?.aiRunCount ?? 0, previous?.aiRunCount ?? 0),
      ),
      positive: (latest?.aiRunCount ?? 0) >= (previous?.aiRunCount ?? 0),
      summary: "Model execution volume in the latest period",
      detail: latest ? `${latest.periodKey} tracked runs` : "No usage periods yet",
    },
    {
      description: "Delivery Success Rate",
      value: `${currentDeliveryRate.toFixed(1)}%`,
      trend: formatSignedPercent(currentDeliveryRate - previousDeliveryRate),
      positive: currentDeliveryRate >= previousDeliveryRate,
      summary: "Delivered vs sent ratio from the latest period",
      detail: latest
        ? `${latest.deliveryDeliveredCount.toLocaleString()} delivered of ${latest.deliverySentCount.toLocaleString()} sent`
        : "No delivery stats yet",
    },
  ];
}

export function buildBarChartData(analytics?: OverviewAnalyticsState) {
  return (analytics?.usageCounters ?? []).map((counter) => ({
    month: monthLabel(counter.periodStart),
    desktop: counter.inboundMessageCount,
    mobile: counter.outboundMessageCount,
  }));
}

export function buildAreaChartData(analytics?: OverviewAnalyticsState) {
  return (analytics?.usageCounters ?? []).map((counter) => ({
    month: monthLabel(counter.periodStart),
    desktop: counter.aiPromptTokens,
    mobile: counter.aiCompletionTokens,
    total: counter.aiTotalTokens,
  }));
}

export function buildPieChartData(analytics?: OverviewAnalyticsState) {
  const breakdown = analytics?.conversationBreakdown;
  return [
    { browser: "open", visitors: breakdown?.open ?? 0, fill: "var(--color-open)" },
    { browser: "closed", visitors: breakdown?.closed ?? 0, fill: "var(--color-closed)" },
    { browser: "handoff", visitors: breakdown?.handoff ?? 0, fill: "var(--color-handoff)" },
    {
      browser: "botPaused",
      visitors: breakdown?.botPaused ?? 0,
      fill: "var(--color-botPaused)",
    },
  ].filter((item) => item.visitors > 0);
}

export function buildRecentActivity(analytics?: OverviewAnalyticsState) {
  return (analytics?.recentActivity ?? []).map((item) => {
    const label = roleLabel(item.role);
    return {
      id: item.id,
      name: label,
      avatar: undefined,
      email: recentPreview(item.content),
      fallback: label.slice(0, 2).toUpperCase(),
      amount: new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(item.createdAt),
    };
  });
}

export function buildBarTrend(analytics?: OverviewAnalyticsState) {
  const counters = analytics?.usageCounters ?? [];
  const latest = counters.at(-1);
  const previous = counters.at(-2);
  const change = percentChange(
    latest?.outboundMessageCount ?? 0,
    previous?.outboundMessageCount ?? 0,
  );

  return {
    change,
    badge: formatSignedPercent(change),
    description:
      counters.length > 0
        ? "Inbound and outbound messages grouped by usage period"
        : "Waiting for usage counters",
  };
}

export function buildAreaTrend(analytics?: OverviewAnalyticsState) {
  const counters = analytics?.usageCounters ?? [];
  const latest = counters.at(-1);
  const previous = counters.at(-2);
  const change = percentChange(latest?.aiTotalTokens ?? 0, previous?.aiTotalTokens ?? 0);

  return {
    change,
    badge: formatSignedPercent(change),
    description:
      counters.length > 0
        ? "Prompt and completion tokens across recorded usage periods"
        : "Waiting for usage counters",
  };
}

export function buildPieTrend(analytics?: OverviewAnalyticsState) {
  const breakdown = analytics?.conversationBreakdown;
  const total =
    (breakdown?.open ?? 0) +
    (breakdown?.closed ?? 0) +
    (breakdown?.handoff ?? 0) +
    (breakdown?.botPaused ?? 0);
  const openRatio = total > 0 ? ((breakdown?.open ?? 0) / total) * 100 : 0;

  return {
    badge: formatSignedPercent(openRatio),
    description:
      total > 0
        ? "Conversation states across open, closed, handoff, and bot-paused threads"
        : "Waiting for conversation data",
  };
}
