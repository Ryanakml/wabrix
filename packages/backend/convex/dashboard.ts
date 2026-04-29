import { query } from "./_generated/server.js";
import { requireOrgContext } from "./rbac.js";
import type { Doc } from "./_generated/dataModel.js";

function startOfUtcMonth(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function shiftUtcMonth(timestamp: number, delta: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1);
}

function buildMonthStarts(count: number, now: number) {
  const currentMonthStart = startOfUtcMonth(now);
  return Array.from({ length: count }, (_, index) =>
    shiftUtcMonth(currentMonthStart, index - (count - 1)),
  );
}

function formatMonthLabel(timestamp: number, format: "short" | "long" = "long") {
  return new Intl.DateTimeFormat("en-US", {
    month: format,
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatMonthYearLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}


function calculateTrendPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function getCounterCount(counter: Doc<"usageCounters"> | null | undefined, field: keyof Doc<"usageCounters">) {
  const value = counter?.[field];
  return typeof value === "number" ? value : 0;
}

export const getOverviewSummaryState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();

    const monthStarts = buildMonthStarts(2, now);
    const previousMonthStart = monthStarts[0] ?? shiftUtcMonth(now, -1);
    const currentMonthStart = monthStarts[1] ?? startOfUtcMonth(now);

    const usageCounters = await ctx.db
      .query("usageCounters")
      .withIndex("by_org_period_start", (q) => q.eq("organizationId", access.organizationId))
      .order("desc")
      .take(2);

    const currentCounter = usageCounters.find((c) => c.periodStart === currentMonthStart) ?? null;
    const previousCounter = usageCounters.find((c) => c.periodStart === previousMonthStart) ?? null;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_org_last_message_at", (q) => q.eq("organizationId", access.organizationId))
      .collect();

    const activeConversationsCurrent = conversations.filter(c => c.status === "open").length;
    // We don't have historical active conversations state, so we just use current for both
    const activeConversationsPrevious = activeConversationsCurrent;

    const needsAttentionCurrent = conversations.filter(c => c.handoffRequested).length;
    const needsAttentionPrevious = needsAttentionCurrent;

    const messagesProcessedCurrent =
      getCounterCount(currentCounter, "inboundMessageCount") +
      getCounterCount(currentCounter, "outboundMessageCount");
    const messagesProcessedPrevious =
      getCounterCount(previousCounter, "inboundMessageCount") +
      getCounterCount(previousCounter, "outboundMessageCount");

    const aiCostCurrent = getCounterCount(currentCounter, "aiEstimatedCostUsd");
    const aiCostPrevious = getCounterCount(previousCounter, "aiEstimatedCostUsd");

    return {
      currentPeriodLabel: formatMonthYearLabel(currentMonthStart),
      comparisonPeriodLabel: formatMonthYearLabel(previousMonthStart),
      activeConversations: {
        value: activeConversationsCurrent,
        changePercent: calculateTrendPercent(activeConversationsCurrent, activeConversationsPrevious),
      },
      needsAttention: {
        value: needsAttentionCurrent,
        changePercent: calculateTrendPercent(needsAttentionCurrent, needsAttentionPrevious),
      },
      messagesProcessed: {
        value: messagesProcessedCurrent,
        changePercent: calculateTrendPercent(messagesProcessedCurrent, messagesProcessedPrevious),
      },
      aiCostEstimator: {
        value: aiCostCurrent,
        currency: "USD",
        changePercent: calculateTrendPercent(aiCostCurrent, aiCostPrevious),
      },
    };
  },
});

export const getOverviewAreaChartState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const monthStarts = buildMonthStarts(12, now);
    const earliestMonthStart = monthStarts[0] ?? startOfUtcMonth(now);
    
    const counters = await ctx.db
      .query("usageCounters")
      .withIndex("by_org_period_start", (q) => q.eq("organizationId", access.organizationId))
      .order("desc")
      .take(12);
      
    const validCounters = counters.filter((counter) => counter.periodStart >= earliestMonthStart);
    const counterMap = new Map(validCounters.map(c => [c.periodStart, c]));

    const series = monthStarts.map((monthStart) => {
      const counter = counterMap.get(monthStart) ?? null;
      return {
        month: formatMonthLabel(monthStart),
        inbound: getCounterCount(counter, "inboundMessageCount"),
        outbound: getCounterCount(counter, "outboundMessageCount"),
      };
    });

    const currentPoint = series[series.length - 1] ?? { inbound: 0, outbound: 0 };
    const previousPoint = series[series.length - 2] ?? { inbound: 0, outbound: 0 };

    return {
      trendPercent: calculateTrendPercent(
        currentPoint.inbound + currentPoint.outbound,
        previousPoint.inbound + previousPoint.outbound,
      ),
      series,
    };
  },
});

export const getOverviewPieChartState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    
    const monthStarts = buildMonthStarts(2, now);
    const previousMonthStart = monthStarts[0] ?? shiftUtcMonth(now, -1);
    const currentMonthStart = monthStarts[1] ?? startOfUtcMonth(now);
    
    const usageCounters = await ctx.db
      .query("usageCounters")
      .withIndex("by_org_period_start", (q) => q.eq("organizationId", access.organizationId))
      .order("desc")
      .take(2);

    const currentCounter = usageCounters.find((c) => c.periodStart === currentMonthStart) ?? null;
    const previousCounter = usageCounters.find((c) => c.periodStart === previousMonthStart) ?? null;

    const currentMessages =
      getCounterCount(currentCounter, "inboundMessageCount") +
      getCounterCount(currentCounter, "outboundMessageCount");
    const previousMessages =
      getCounterCount(previousCounter, "inboundMessageCount") +
      getCounterCount(previousCounter, "outboundMessageCount");

    const sent = getCounterCount(currentCounter, "deliverySentCount");
    const delivered = getCounterCount(currentCounter, "deliveryDeliveredCount");
    const read = getCounterCount(currentCounter, "deliveryReadCount");
    const failed = getCounterCount(currentCounter, "deliveryFailedCount");

    return {
      periodLabel: formatMonthYearLabel(currentMonthStart),
      trendPercent: calculateTrendPercent(currentMessages, previousMessages),
      segments: [
        { type: "sent", value: sent },
        { type: "delivered", value: delivered },
        { type: "read", value: read },
        { type: "failed", value: failed },
      ],
    };
  },
});

export const getOverviewRecentConversationsState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_org_last_message_at", (q) => q.eq("organizationId", access.organizationId))
      .order("desc")
      .take(5);

    const recentConversations = [];
    for (const conv of conversations) {
      let contactName = "Unknown";
      let initials = "UN";
      
      if (conv.contactId) {
        const contact = await ctx.db.get(conv.contactId);
        if (contact) {
          contactName = contact.profileName || contact.waId || "Unknown";
          initials = (contact.profileName || contact.waId || "U").slice(0, 2).toUpperCase();
        }
      }

      recentConversations.push({
        id: conv._id,
        contactName,
        initials,
        lastMessagePreview: conv.lastMessagePreview ?? "No messages yet",
        lastMessageAt: conv.lastMessageAt,
        handoffRequested: conv.handoffRequested,
      });
    }

    return {
      recentConversations
    };
  },
});
