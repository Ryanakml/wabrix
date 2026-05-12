import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server.js";
import {
  buildUsageLimitErrorMessage,
  clampRatio,
  DEFAULT_PLAN_DEFINITIONS,
  getDefaultPlanDefinition,
  getUtcMonthPeriod,
  normalizeMidtransSubscriptionStatus,
  normalizePolarSubscriptionStatus,
  type PlanKey,
} from "./lib/billing.js";
import { assertHasRole, requireOrgContext } from "./rbac.js";

type UsageIncrementInput = {
  aiRunCount?: number;
  aiPromptTokens?: number;
  aiCompletionTokens?: number;
  aiTotalTokens?: number;
  aiEstimatedCostUsd?: number;
  inboundMessageCount?: number;
  outboundMessageCount?: number;
  outboundTemplateMessageCount?: number;
  deliverySentCount?: number;
  deliveryDeliveredCount?: number;
  deliveryReadCount?: number;
  deliveryFailedCount?: number;
  queueFailureCount?: number;
  mediaProcessedCount?: number;
};

type BillingCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

type PlanRowLike = {
  _id?: Id<"plans">;
  key: string;
  name: string;
  monthlyPriceUsdCents: number;
  monthlyPriceIdr: number;
  includedAiTokens: number;
  includedOutboundMessages: number;
  includedSeats: number;
  tagline: string;
  active: boolean;
};

function getPeriodEndFromStart(periodStart: number) {
  const date = new Date(periodStart);
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0) - 1
  );
}

async function listPlanCatalog(ctx: BillingCtx): Promise<PlanRowLike[]> {
  let rows: Doc<"plans">[] = [];

  try {
    rows = await ctx.db
      .query("plans")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  } catch {
    rows = [];
  }

  if (rows.length > 0) {
    return rows;
  }

  return DEFAULT_PLAN_DEFINITIONS.map((plan) => ({
    key: plan.key,
    name: plan.name,
    monthlyPriceUsdCents: plan.monthlyPriceUsdCents,
    monthlyPriceIdr: plan.monthlyPriceIdr,
    includedAiTokens: plan.includedAiTokens,
    includedOutboundMessages: plan.includedOutboundMessages,
    includedSeats: plan.includedSeats,
    tagline: plan.tagline,
    active: true,
  }));
}

async function ensureDefaultPlans(ctx: Pick<MutationCtx, "db">) {
  const now = Date.now();

  for (const definition of DEFAULT_PLAN_DEFINITIONS) {
    const existing = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", definition.key))
      .first();

    if (!existing) {
      await ctx.db.insert("plans", {
        ...definition,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    await ctx.db.patch(existing._id, {
      name: definition.name,
      monthlyPriceUsdCents: definition.monthlyPriceUsdCents,
      monthlyPriceIdr: definition.monthlyPriceIdr,
      includedAiTokens: definition.includedAiTokens,
      includedOutboundMessages: definition.includedOutboundMessages,
      includedSeats: definition.includedSeats,
      tagline: definition.tagline,
      active: true,
      updatedAt: now,
    });
  }
}

async function getPlanByKey(
  ctx: BillingCtx,
  planKey: string,
): Promise<PlanRowLike> {
  const plans = await listPlanCatalog(ctx);
  const match = plans.find((plan) => plan.key === planKey);

  if (!match) {
    throw new Error(`Unknown plan key: ${planKey}`);
  }

  return match;
}

async function findPlanDocumentId(
  ctx: Pick<MutationCtx, "db">,
  planKey: string,
) {
  const existing = await ctx.db
    .query("plans")
    .withIndex("by_key", (q) => q.eq("key", planKey))
    .first();

  return existing?._id;
}

async function getCurrentUsageCounter(
  ctx: BillingCtx,
  organizationId: Id<"organizations">,
  now: number,
) {
  const period = getUtcMonthPeriod(now);
  let counter: Doc<"usageCounters"> | null = null;

  try {
    counter = await ctx.db
      .query("usageCounters")
      .withIndex("by_org_period_key", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("periodKey", period.periodKey),
      )
      .first();
  } catch {
    counter = null;
  }

  return {
    period,
    counter,
  };
}

async function incrementUsageCounters(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    increments,
    now = Date.now(),
  }: {
    organizationId: Id<"organizations">;
    increments: UsageIncrementInput;
    now?: number;
  },
) {
  const { period, counter } = await getCurrentUsageCounter(
    ctx,
    organizationId,
    now,
  );
  const nextValues = {
    aiRunCount: (counter?.aiRunCount ?? 0) + (increments.aiRunCount ?? 0),
    aiPromptTokens:
      (counter?.aiPromptTokens ?? 0) + (increments.aiPromptTokens ?? 0),
    aiCompletionTokens:
      (counter?.aiCompletionTokens ?? 0) + (increments.aiCompletionTokens ?? 0),
    aiTotalTokens:
      (counter?.aiTotalTokens ?? 0) + (increments.aiTotalTokens ?? 0),
    aiEstimatedCostUsd:
      (counter?.aiEstimatedCostUsd ?? 0) + (increments.aiEstimatedCostUsd ?? 0),
    inboundMessageCount:
      (counter?.inboundMessageCount ?? 0) +
      (increments.inboundMessageCount ?? 0),
    outboundMessageCount:
      (counter?.outboundMessageCount ?? 0) +
      (increments.outboundMessageCount ?? 0),
    outboundTemplateMessageCount:
      (counter?.outboundTemplateMessageCount ?? 0) +
      (increments.outboundTemplateMessageCount ?? 0),
    deliverySentCount:
      (counter?.deliverySentCount ?? 0) + (increments.deliverySentCount ?? 0),
    deliveryDeliveredCount:
      (counter?.deliveryDeliveredCount ?? 0) +
      (increments.deliveryDeliveredCount ?? 0),
    deliveryReadCount:
      (counter?.deliveryReadCount ?? 0) + (increments.deliveryReadCount ?? 0),
    deliveryFailedCount:
      (counter?.deliveryFailedCount ?? 0) +
      (increments.deliveryFailedCount ?? 0),
    queueFailureCount:
      (counter?.queueFailureCount ?? 0) + (increments.queueFailureCount ?? 0),
    mediaProcessedCount:
      (counter?.mediaProcessedCount ?? 0) +
      (increments.mediaProcessedCount ?? 0),
    updatedAt: now,
  };

  if (counter) {
    await ctx.db.patch(counter._id, nextValues);
    return counter._id;
  }

  return ctx.db.insert("usageCounters", {
    organizationId,
    periodKey: period.periodKey,
    periodStart: period.periodStart,
    ...nextValues,
    createdAt: now,
  });
}

async function getActiveSubscription(
  ctx: BillingCtx,
  organizationId: Id<"organizations">,
) {
  let subscriptions: Doc<"subscriptions">[] = [];

  try {
    subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
  } catch {
    subscriptions = [];
  }

  return (
    subscriptions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .find((subscription) =>
        ["active", "trialing", "past_due", "incomplete"].includes(
          subscription.status,
        ),
      ) ?? null
  );
}

async function getLatestPersistedSubscription(
  ctx: BillingCtx,
  organizationId: Id<"organizations">,
) {
  let subscriptions: Doc<"subscriptions">[] = [];

  try {
    subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
  } catch {
    subscriptions = [];
  }

  return subscriptions.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

async function getEntitlementSnapshot(
  ctx: BillingCtx,
  organizationId: Id<"organizations">,
  now: number,
) {
  const subscription = await getActiveSubscription(ctx, organizationId);
  const plan = await getPlanByKey(ctx, subscription?.planKey ?? "starter");
  const { period, counter } = await getCurrentUsageCounter(
    ctx,
    organizationId,
    now,
  );

  const entitlements = subscription?.entitlements ?? {
    aiTokens: plan.includedAiTokens,
    outboundMessages: plan.includedOutboundMessages,
    seats: plan.includedSeats,
  };
  let seatsUsed = 0;

  try {
    seatsUsed = (
      await ctx.db
        .query("orgMembers")
        .withIndex("by_org", (q) => q.eq("orgId", organizationId))
        .collect()
    ).length;
  } catch {
    seatsUsed = 0;
  }

  return {
    period,
    subscription,
    plan,
    entitlements,
    usage: {
      aiTokens: counter?.aiTotalTokens ?? 0,
      outboundMessages: counter?.outboundMessageCount ?? 0,
      seats: seatsUsed,
      counter,
    },
  };
}

export async function assertUsageAllowed(
  ctx: BillingCtx,
  {
    organizationId,
    kind,
    now = Date.now(),
  }: {
    organizationId: Id<"organizations">;
    kind: "ai_tokens" | "outbound_messages" | "seats";
    now?: number;
  },
) {
  const snapshot = await getEntitlementSnapshot(ctx, organizationId, now);

  if (
    kind === "ai_tokens" &&
    snapshot.usage.aiTokens >= snapshot.entitlements.aiTokens
  ) {
    throw new Error(
      buildUsageLimitErrorMessage({
        kind,
        planName: snapshot.plan.name,
      }),
    );
  }

  if (
    kind === "outbound_messages" &&
    snapshot.usage.outboundMessages >= snapshot.entitlements.outboundMessages
  ) {
    throw new Error(
      buildUsageLimitErrorMessage({
        kind,
        planName: snapshot.plan.name,
      }),
    );
  }

  if (kind === "seats" && snapshot.usage.seats >= snapshot.entitlements.seats) {
    throw new Error(
      buildUsageLimitErrorMessage({
        kind,
        planName: snapshot.plan.name,
      }),
    );
  }

  return snapshot;
}

function toSubscriptionEntitlements(planKey: string) {
  const plan = getDefaultPlanDefinition(planKey as PlanKey);
  return {
    aiTokens: plan.includedAiTokens,
    outboundMessages: plan.includedOutboundMessages,
    seats: plan.includedSeats,
  };
}

async function findSubscriptionForWebhook(
  ctx: Pick<MutationCtx, "db">,
  args: {
    organizationId?: Id<"organizations">;
    providerSubscriptionId?: string;
    providerCheckoutId?: string;
    providerOrderId?: string;
  },
) {
  if (args.providerSubscriptionId) {
    const bySubscriptionId = await ctx.db
      .query("subscriptions")
      .withIndex("by_provider_subscription_id", (q) =>
        q.eq("providerSubscriptionId", args.providerSubscriptionId!),
      )
      .first();

    if (bySubscriptionId) {
      return bySubscriptionId;
    }
  }

  if (args.providerCheckoutId) {
    const byCheckoutId = await ctx.db
      .query("subscriptions")
      .withIndex("by_provider_checkout_id", (q) =>
        q.eq("providerCheckoutId", args.providerCheckoutId!),
      )
      .first();

    if (byCheckoutId) {
      return byCheckoutId;
    }
  }

  if (args.providerOrderId) {
    const byOrderId = await ctx.db
      .query("subscriptions")
      .withIndex("by_provider_order_id", (q) =>
        q.eq("providerOrderId", args.providerOrderId!),
      )
      .first();

    if (byOrderId) {
      return byOrderId;
    }
  }

  if (!args.organizationId) {
    return null;
  }

  return getActiveSubscription(ctx, args.organizationId);
}

export const getUsageGuardState = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const snapshot = await getEntitlementSnapshot(
      ctx,
      args.organizationId,
      Date.now(),
    );

    return {
      organizationId: args.organizationId,
      planKey: snapshot.plan.key,
      planName: snapshot.plan.name,
      limits: snapshot.entitlements,
      usage: {
        aiTokens: snapshot.usage.aiTokens,
        outboundMessages: snapshot.usage.outboundMessages,
        seats: snapshot.usage.seats,
      },
    };
  },
});

export const incrementUsageCountersMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    aiRunCount: v.optional(v.number()),
    aiPromptTokens: v.optional(v.number()),
    aiCompletionTokens: v.optional(v.number()),
    aiTotalTokens: v.optional(v.number()),
    aiEstimatedCostUsd: v.optional(v.number()),
    inboundMessageCount: v.optional(v.number()),
    outboundMessageCount: v.optional(v.number()),
    outboundTemplateMessageCount: v.optional(v.number()),
    deliverySentCount: v.optional(v.number()),
    deliveryDeliveredCount: v.optional(v.number()),
    deliveryReadCount: v.optional(v.number()),
    deliveryFailedCount: v.optional(v.number()),
    queueFailureCount: v.optional(v.number()),
    mediaProcessedCount: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    incrementUsageCounters(ctx, {
      organizationId: args.organizationId,
      now: args.now,
      increments: args,
    }),
});

export const syncDefaultPlansMutation = internalMutation({
  args: {},
  handler: async (ctx) => ensureDefaultPlans(ctx),
});

export const recordCheckoutSessionMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    planKey: v.string(),
    gateway: v.union(v.literal("polar"), v.literal("midtrans")),
    billingCountry: v.string(),
    currency: v.union(v.literal("USD"), v.literal("IDR")),
    amount: v.number(),
    providerCheckoutId: v.optional(v.string()),
    providerOrderId: v.optional(v.string()),
    externalReferenceId: v.string(),
    checkoutUrl: v.optional(v.string()),
    rawPayload: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureDefaultPlans(ctx);

    const now = Date.now();
    const planId = await findPlanDocumentId(ctx, args.planKey);
    const existing = await findSubscriptionForWebhook(ctx, {
      organizationId: args.organizationId,
      providerCheckoutId: args.providerCheckoutId,
      providerOrderId: args.providerOrderId,
    });

    const payloadMetadata = {
      checkoutUrl: args.checkoutUrl,
    };

    const subscriptionId =
      existing?._id ??
      (await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        planId,
        planKey: args.planKey,
        status: "incomplete",
        gateway: args.gateway,
        billingCountry: args.billingCountry,
        currency: args.currency,
        amount: args.amount,
        providerCustomerId: undefined,
        providerSubscriptionId: undefined,
        providerCheckoutId: args.providerCheckoutId,
        providerOrderId: args.providerOrderId,
        externalReferenceId: args.externalReferenceId,
        interval: "month",
        currentPeriodStart: undefined,
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: false,
        canceledAt: undefined,
        entitlements: toSubscriptionEntitlements(args.planKey),
        metadata: payloadMetadata,
        createdAt: now,
        updatedAt: now,
      }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        planId,
        planKey: args.planKey,
        gateway: args.gateway,
        billingCountry: args.billingCountry,
        currency: args.currency,
        amount: args.amount,
        providerCheckoutId:
          args.providerCheckoutId ?? existing.providerCheckoutId,
        providerOrderId: args.providerOrderId ?? existing.providerOrderId,
        externalReferenceId: args.externalReferenceId,
        entitlements: toSubscriptionEntitlements(args.planKey),
        metadata: payloadMetadata,
        updatedAt: now,
      });
    }

    const idempotencyKey = `${args.gateway}:checkout:${args.providerCheckoutId ?? args.providerOrderId ?? args.externalReferenceId}`;
    const existingEvent = await ctx.db
      .query("billingEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();

    if (!existingEvent) {
      await ctx.db.insert("billingEvents", {
        organizationId: args.organizationId,
        subscriptionId,
        gateway: args.gateway,
        providerEventId:
          args.providerCheckoutId ??
          args.providerOrderId ??
          args.externalReferenceId,
        eventType: "checkout_session_created",
        externalReferenceId: args.externalReferenceId,
        providerCustomerId: undefined,
        providerSubscriptionId: undefined,
        providerCheckoutId: args.providerCheckoutId,
        providerOrderId: args.providerOrderId,
        currency: args.currency,
        amount: args.amount,
        status: "incomplete",
        rawPayload: args.rawPayload,
        idempotencyKey,
        processedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      subscriptionId,
      status: "recorded" as const,
    };
  },
});

export const processBillingWebhookMutation = internalMutation({
  args: {
    gateway: v.union(v.literal("polar"), v.literal("midtrans")),
    providerEventId: v.string(),
    eventType: v.string(),
    status: v.string(),
    organizationId: v.optional(v.id("organizations")),
    clerkOrgId: v.optional(v.string()),
    planKey: v.optional(v.string()),
    billingCountry: v.optional(v.string()),
    currency: v.optional(v.union(v.literal("USD"), v.literal("IDR"))),
    amount: v.optional(v.number()),
    providerCustomerId: v.optional(v.string()),
    providerSubscriptionId: v.optional(v.string()),
    providerCheckoutId: v.optional(v.string()),
    providerOrderId: v.optional(v.string()),
    externalReferenceId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    rawPayload: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureDefaultPlans(ctx);

    const now = Date.now();
    const idempotencyKey = `${args.gateway}:${args.providerEventId}`;
    const existingEvent = await ctx.db
      .query("billingEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();

    if (existingEvent) {
      return {
        status: "duplicate" as const,
        billingEventId: existingEvent._id,
      };
    }

    let organizationId = args.organizationId;

    if (!organizationId && args.clerkOrgId) {
      const organization = await ctx.db
        .query("organizations")
        .withIndex("by_clerk_org_id", (q) =>
          q.eq("clerkOrgId", args.clerkOrgId!),
        )
        .first();
      organizationId = organization?._id;
    }

    const existingSubscription = await findSubscriptionForWebhook(ctx, {
      organizationId,
      providerSubscriptionId: args.providerSubscriptionId,
      providerCheckoutId: args.providerCheckoutId,
      providerOrderId: args.providerOrderId,
    });

    const planKey = args.planKey ?? existingSubscription?.planKey ?? "starter";
    const normalizedStatus =
      args.gateway === "polar"
        ? normalizePolarSubscriptionStatus(args.eventType, args.status)
        : normalizeMidtransSubscriptionStatus(args.status);
    const planId = await findPlanDocumentId(ctx, planKey);
    organizationId = organizationId ?? existingSubscription?.organizationId;

    if (!organizationId) {
      throw new Error(
        "Billing webhook could not be mapped to an organization.",
      );
    }

    const subscriptionId =
      existingSubscription?._id ??
      (await ctx.db.insert("subscriptions", {
        organizationId,
        planId,
        planKey,
        status: normalizedStatus,
        gateway: args.gateway,
        billingCountry: args.billingCountry ?? "US",
        currency:
          args.currency ?? (args.gateway === "midtrans" ? "IDR" : "USD"),
        amount: args.amount ?? 0,
        providerCustomerId: args.providerCustomerId,
        providerSubscriptionId: args.providerSubscriptionId,
        providerCheckoutId: args.providerCheckoutId,
        providerOrderId: args.providerOrderId,
        externalReferenceId: args.externalReferenceId,
        interval: "month",
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
        canceledAt: args.canceledAt,
        entitlements: toSubscriptionEntitlements(planKey),
        metadata: undefined,
        createdAt: now,
        updatedAt: now,
      }));

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        planId,
        planKey,
        status: normalizedStatus,
        gateway: args.gateway,
        billingCountry:
          args.billingCountry ?? existingSubscription.billingCountry,
        currency: args.currency ?? existingSubscription.currency,
        amount: args.amount ?? existingSubscription.amount,
        providerCustomerId:
          args.providerCustomerId ?? existingSubscription.providerCustomerId,
        providerSubscriptionId:
          args.providerSubscriptionId ??
          existingSubscription.providerSubscriptionId,
        providerCheckoutId:
          args.providerCheckoutId ?? existingSubscription.providerCheckoutId,
        providerOrderId:
          args.providerOrderId ?? existingSubscription.providerOrderId,
        externalReferenceId:
          args.externalReferenceId ?? existingSubscription.externalReferenceId,
        currentPeriodStart:
          args.currentPeriodStart ?? existingSubscription.currentPeriodStart,
        currentPeriodEnd:
          args.currentPeriodEnd ?? existingSubscription.currentPeriodEnd,
        cancelAtPeriodEnd:
          args.cancelAtPeriodEnd ?? existingSubscription.cancelAtPeriodEnd,
        canceledAt: args.canceledAt ?? existingSubscription.canceledAt,
        entitlements: toSubscriptionEntitlements(planKey),
        updatedAt: now,
      });
    }

    const billingEventId = await ctx.db.insert("billingEvents", {
      organizationId,
      subscriptionId,
      gateway: args.gateway,
      providerEventId: args.providerEventId,
      eventType: args.eventType,
      externalReferenceId: args.externalReferenceId,
      providerCustomerId: args.providerCustomerId,
      providerSubscriptionId: args.providerSubscriptionId,
      providerCheckoutId: args.providerCheckoutId,
      providerOrderId: args.providerOrderId,
      currency: args.currency,
      amount: args.amount,
      status: normalizedStatus,
      rawPayload: args.rawPayload,
      idempotencyKey,
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: organizationId,
      action: "billing_webhook_processed",
      details: {
        gateway: args.gateway,
        providerEventId: args.providerEventId,
        eventType: args.eventType,
        normalizedStatus,
        subscriptionId,
        billingEventId,
      },
      createdAt: now,
    });

    return {
      status: "processed" as const,
      subscriptionId,
      billingEventId,
    };
  },
});

export const getBillingDashboardState = query({
  args: {},
  handler: async (ctx) => {
    const access = await assertHasRole(ctx, "org:admin");
    const now = Date.now();
    const snapshot = await getEntitlementSnapshot(
      ctx,
      access.organizationId,
      now,
    );
    const plans = await listPlanCatalog(ctx);
    const recentEvents = await ctx.db
      .query("billingEvents")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(12);
    const fallbackSubscription =
      snapshot.subscription ??
      (recentEvents.length > 0
        ? await getLatestPersistedSubscription(ctx, access.organizationId)
        : null);
    const currentPlan = fallbackSubscription
      ? (plans.find((plan) => plan.key === fallbackSubscription.planKey) ??
        null)
      : null;
    const usagePeriodStart = snapshot.period.periodStart;
    const usagePeriodEnd = getPeriodEndFromStart(usagePeriodStart);

    return {
      planCatalog: plans.map((plan) => ({
        key: plan.key,
        name: plan.name,
        monthlyPriceUsdCents: plan.monthlyPriceUsdCents,
        monthlyPriceIdr: plan.monthlyPriceIdr,
        includedAiTokens: plan.includedAiTokens,
        includedOutboundMessages: plan.includedOutboundMessages,
        includedSeats: plan.includedSeats,
        tagline: plan.tagline,
      })),
      currentSubscription: fallbackSubscription
        ? {
            id: fallbackSubscription._id,
            planKey: fallbackSubscription.planKey,
            status: fallbackSubscription.status,
            gateway: fallbackSubscription.gateway,
            billingCountry: fallbackSubscription.billingCountry,
            currency: fallbackSubscription.currency,
            amount: fallbackSubscription.amount,
            currentPeriodStart:
              fallbackSubscription.currentPeriodStart ?? usagePeriodStart,
            currentPeriodEnd:
              fallbackSubscription.currentPeriodEnd ?? usagePeriodEnd,
            cancelAtPeriodEnd: fallbackSubscription.cancelAtPeriodEnd,
          }
        : null,
      currentPlan: currentPlan
        ? {
            key: currentPlan.key,
            name: currentPlan.name,
            tagline: currentPlan.tagline,
          }
        : null,
      currentUsage: {
        periodKey: snapshot.period.periodKey,
        aiTokensUsed: snapshot.usage.aiTokens,
        aiTokensLimit: snapshot.entitlements.aiTokens,
        outboundMessagesUsed: snapshot.usage.outboundMessages,
        outboundMessagesLimit: snapshot.entitlements.outboundMessages,
        seatsUsed: snapshot.usage.seats,
        seatsLimit: snapshot.entitlements.seats,
      },
      recentEvents: recentEvents.map((event) => ({
        id: event._id,
        gateway: event.gateway,
        eventType: event.eventType,
        status: event.status,
        currency: event.currency,
        amount: event.amount,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const getAnalyticsDashboardState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const snapshot = await getEntitlementSnapshot(
      ctx,
      access.organizationId,
      Date.now(),
    );
    const recentAiRuns = await ctx.db
      .query("aiRuns")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(100);
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(200);
    const recentQueue = await ctx.db
      .query("outboundQueue")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(200);

    const queueMetrics = recentQueue.reduce(
      (acc, job) => {
        if (job.status === "queued") acc.queued += 1;
        if (job.status === "processing") acc.processing += 1;
        if (job.status === "sent") acc.sent += 1;
        if (job.status === "failed") acc.failed += 1;
        return acc;
      },
      { queued: 0, processing: 0, sent: 0, failed: 0 },
    );

    const deliveryMetrics = recentMessages.reduce(
      (acc, message) => {
        if (message.deliveryState === "sent") acc.sent += 1;
        if (message.deliveryState === "delivered") acc.delivered += 1;
        if (message.deliveryState === "read") acc.read += 1;
        if (message.deliveryState === "failed") acc.failed += 1;
        return acc;
      },
      { sent: 0, delivered: 0, read: 0, failed: 0 },
    );

    const dailyBuckets = new Map<
      string,
      { aiRuns: number; inbound: number; outbound: number }
    >();
    const bucketKeyFor = (timestamp: number) => {
      const date = new Date(timestamp);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    };

    for (const run of recentAiRuns) {
      const key = bucketKeyFor(run.createdAt);
      const bucket = dailyBuckets.get(key) ?? {
        aiRuns: 0,
        inbound: 0,
        outbound: 0,
      };
      bucket.aiRuns += 1;
      dailyBuckets.set(key, bucket);
    }

    for (const message of recentMessages) {
      const key = bucketKeyFor(message.createdAt);
      const bucket = dailyBuckets.get(key) ?? {
        aiRuns: 0,
        inbound: 0,
        outbound: 0,
      };
      if (message.role === "user") {
        bucket.inbound += 1;
      }
      if (message.role === "assistant" || message.role === "agent") {
        bucket.outbound += 1;
      }
      dailyBuckets.set(key, bucket);
    }

    return {
      currentPeriod: snapshot.period.periodKey,
      usage: {
        aiTokensUsed: snapshot.usage.aiTokens,
        aiTokensLimit: snapshot.entitlements.aiTokens,
        outboundMessagesUsed: snapshot.usage.outboundMessages,
        outboundMessagesLimit: snapshot.entitlements.outboundMessages,
      },
      utilization: {
        aiTokensRatio: clampRatio(
          snapshot.usage.aiTokens,
          snapshot.entitlements.aiTokens,
        ),
        outboundMessagesRatio: clampRatio(
          snapshot.usage.outboundMessages,
          snapshot.entitlements.outboundMessages,
        ),
      },
      queueMetrics,
      deliveryMetrics,
      dailySeries: [...dailyBuckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-7)
        .map(([date, counts]) => ({
          date,
          ...counts,
        })),
      recentAiRuns: recentAiRuns.slice(0, 8).map((run) => ({
        id: run._id,
        model: run.selectedModel,
        provider: run.selectedProvider,
        totalTokens: run.totalTokens ?? 0,
        createdAt: run.createdAt,
      })),
    };
  },
});

type BillingEventLike = Doc<"billingEvents">;
type UsageCounterLike = Doc<"usageCounters">;

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

function formatMonthLabel(
  timestamp: number,
  format: "short" | "long" = "long",
) {
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

function formatMonthRangeLabel(starts: number[]) {
  if (starts.length === 0) {
    return "";
  }

  const first = starts[0] ?? 0;
  const last = starts[starts.length - 1] ?? first;

  if (first === last) {
    return formatMonthYearLabel(first);
  }

  return `${formatMonthLabel(first)} - ${formatMonthYearLabel(last)}`;
}

function calculateTrendPercent(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildUsageCounterMap(counters: UsageCounterLike[]) {
  return new Map(counters.map((counter) => [counter.periodStart, counter]));
}

function getCounterCount(
  counter: UsageCounterLike | null | undefined,
  field: keyof UsageCounterLike,
) {
  const value = counter?.[field];
  return typeof value === "number" ? value : 0;
}

function isRevenueEvent(event: BillingEventLike, currency: "USD" | "IDR") {
  return (
    event.currency === currency &&
    typeof event.amount === "number" &&
    event.amount > 0 &&
    (event.status === "active" || event.status === "trialing")
  );
}

function formatBillingEventTitle(eventType: string) {
  return eventType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildSalesFallbackLabel(event: BillingEventLike) {
  return `${event.gateway.toUpperCase()} · ${event.status}`;
}

function buildInitials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "NA";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

async function listRecentUsageCounters(
  ctx: Pick<QueryCtx, "db">,
  organizationId: Id<"organizations">,
  limit: number,
) {
  return ctx.db
    .query("usageCounters")
    .withIndex("by_org_period_start", (q) =>
      q.eq("organizationId", organizationId),
    )
    .order("desc")
    .take(limit);
}

async function listRecentBillingEvents(
  ctx: Pick<QueryCtx, "db">,
  organizationId: Id<"organizations">,
  limit: number,
) {
  return ctx.db
    .query("billingEvents")
    .withIndex("by_org_created_at", (q) =>
      q.eq("organizationId", organizationId),
    )
    .order("desc")
    .take(limit);
}

export const getOverviewSummaryState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const snapshot = await getEntitlementSnapshot(
      ctx,
      access.organizationId,
      now,
    );
    const monthStarts = buildMonthStarts(2, now);
    const previousMonthStart = monthStarts[0] ?? shiftUtcMonth(now, -1);
    const currentMonthStart = monthStarts[1] ?? startOfUtcMonth(now);
    const nextMonthStart = shiftUtcMonth(currentMonthStart, 1);
    const recentUsageCounters = await listRecentUsageCounters(
      ctx,
      access.organizationId,
      2,
    );
    const usageCounterMap = buildUsageCounterMap(recentUsageCounters);
    const currentCounter = usageCounterMap.get(currentMonthStart) ?? null;
    const previousCounter = usageCounterMap.get(previousMonthStart) ?? null;
    const recentBillingEvents = await listRecentBillingEvents(
      ctx,
      access.organizationId,
      48,
    );
    const revenueCurrency =
      snapshot.subscription?.currency ??
      recentBillingEvents.find(
        (event) => event.currency === "IDR" || event.currency === "USD",
      )?.currency ??
      "USD";

    const currentRevenue = recentBillingEvents
      .filter(
        (event) =>
          isRevenueEvent(event, revenueCurrency) &&
          event.createdAt >= currentMonthStart &&
          event.createdAt < nextMonthStart,
      )
      .reduce((sum, event) => sum + (event.amount ?? 0), 0);
    const previousRevenue = recentBillingEvents
      .filter(
        (event) =>
          isRevenueEvent(event, revenueCurrency) &&
          event.createdAt >= previousMonthStart &&
          event.createdAt < currentMonthStart,
      )
      .reduce((sum, event) => sum + (event.amount ?? 0), 0);

    const effectiveCurrentRevenue =
      currentRevenue === 0 &&
      snapshot.subscription &&
      ["active", "trialing", "past_due"].includes(snapshot.subscription.status)
        ? snapshot.subscription.amount
        : currentRevenue;

    const inboundCurrent = getCounterCount(
      currentCounter,
      "inboundMessageCount",
    );
    const inboundPrevious = getCounterCount(
      previousCounter,
      "inboundMessageCount",
    );
    const activityCurrent =
      getCounterCount(currentCounter, "aiRunCount") +
      inboundCurrent +
      getCounterCount(currentCounter, "outboundMessageCount");
    const activityPrevious =
      getCounterCount(previousCounter, "aiRunCount") +
      inboundPrevious +
      getCounterCount(previousCounter, "outboundMessageCount");

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", access.organizationId))
      .collect();
    const activeSeats = memberships.length;
    const previousSeats = memberships.filter(
      (membership) => membership.createdAt < currentMonthStart,
    ).length;
    const growthRate = calculateTrendPercent(activityCurrent, activityPrevious);

    return {
      currentPeriodLabel: formatMonthYearLabel(currentMonthStart),
      comparisonPeriodLabel: formatMonthYearLabel(previousMonthStart),
      revenue: {
        amount: effectiveCurrentRevenue,
        currency: revenueCurrency,
        changePercent: calculateTrendPercent(
          effectiveCurrentRevenue,
          previousRevenue,
        ),
      },
      newCustomers: {
        value: inboundCurrent,
        changePercent: calculateTrendPercent(inboundCurrent, inboundPrevious),
      },
      activeAccounts: {
        value: activeSeats,
        changePercent: calculateTrendPercent(activeSeats, previousSeats),
      },
      growthRate: {
        value: growthRate,
        changePercent: growthRate,
      },
    };
  },
});

export const getOverviewBarChartState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const monthStarts = buildMonthStarts(6, now);
    const earliestMonthStart = monthStarts[0] ?? startOfUtcMonth(now);
    const counters = (
      await listRecentUsageCounters(ctx, access.organizationId, 6)
    ).filter((counter) => counter.periodStart >= earliestMonthStart);
    const counterMap = buildUsageCounterMap(counters);
    const series = monthStarts.map((monthStart) => {
      const counter = counterMap.get(monthStart) ?? null;
      return {
        month: formatMonthLabel(monthStart),
        inbound: getCounterCount(counter, "inboundMessageCount"),
        outbound: getCounterCount(counter, "outboundMessageCount"),
      };
    });
    const currentPoint = series[series.length - 1] ?? {
      inbound: 0,
      outbound: 0,
    };
    const previousPoint = series[series.length - 2] ?? {
      inbound: 0,
      outbound: 0,
    };

    return {
      rangeLabel: formatMonthRangeLabel(monthStarts),
      trendPercent: calculateTrendPercent(
        currentPoint.inbound + currentPoint.outbound,
        previousPoint.inbound + previousPoint.outbound,
      ),
      series,
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
    const counters = (
      await listRecentUsageCounters(ctx, access.organizationId, 12)
    ).filter((counter) => counter.periodStart >= earliestMonthStart);
    const counterMap = buildUsageCounterMap(counters);
    const series = monthStarts.map((monthStart) => {
      const counter = counterMap.get(monthStart) ?? null;
      return {
        month: formatMonthLabel(monthStart),
        aiRuns: getCounterCount(counter, "aiRunCount"),
        delivered: getCounterCount(counter, "deliveryDeliveredCount"),
      };
    });
    const currentPoint = series[series.length - 1] ?? {
      aiRuns: 0,
      delivered: 0,
    };
    const previousPoint = series[series.length - 2] ?? {
      aiRuns: 0,
      delivered: 0,
    };

    return {
      trendPercent: calculateTrendPercent(
        currentPoint.aiRuns + currentPoint.delivered,
        previousPoint.aiRuns + previousPoint.delivered,
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
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_org_created_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(200);
    const contentMix = recentMessages.reduce(
      (acc, message) => {
        if (message.contentType === "text") acc.text += 1;
        else if (message.contentType === "image") acc.image += 1;
        else if (message.contentType === "document") acc.document += 1;
        else if (message.contentType === "audio") acc.audio += 1;
        else acc.other += 1;
        return acc;
      },
      { text: 0, image: 0, document: 0, audio: 0, other: 0 },
    );
    const recentUsageCounters = await listRecentUsageCounters(
      ctx,
      access.organizationId,
      2,
    );
    const usageCounterMap = buildUsageCounterMap(recentUsageCounters);
    const currentCounter = usageCounterMap.get(currentMonthStart) ?? null;
    const previousCounter = usageCounterMap.get(previousMonthStart) ?? null;
    const currentMessages =
      getCounterCount(currentCounter, "inboundMessageCount") +
      getCounterCount(currentCounter, "outboundMessageCount");
    const previousMessages =
      getCounterCount(previousCounter, "inboundMessageCount") +
      getCounterCount(previousCounter, "outboundMessageCount");

    return {
      periodLabel: formatMonthYearLabel(currentMonthStart),
      trendPercent: calculateTrendPercent(currentMessages, previousMessages),
      segments: [
        { type: "text" as const, value: contentMix.text },
        { type: "image" as const, value: contentMix.image },
        { type: "document" as const, value: contentMix.document },
        { type: "audio" as const, value: contentMix.audio },
        { type: "other" as const, value: contentMix.other },
      ],
    };
  },
});

export const getOverviewRecentSalesState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const currentMonthStart = startOfUtcMonth(now);
    const nextMonthStart = shiftUtcMonth(currentMonthStart, 1);
    const recentBillingEvents = await listRecentBillingEvents(
      ctx,
      access.organizationId,
      24,
    );
    const recentSales = recentBillingEvents.filter(
      (event) =>
        (event.currency === "USD" || event.currency === "IDR") &&
        typeof event.amount === "number" &&
        event.amount > 0 &&
        (event.status === "active" || event.status === "trialing"),
    );

    return {
      currentMonthSalesCount: recentSales.filter(
        (event) =>
          event.createdAt >= currentMonthStart &&
          event.createdAt < nextMonthStart,
      ).length,
      sales: recentSales.slice(0, 5).map((event) => {
        const name = formatBillingEventTitle(event.eventType);

        return {
          id: event._id.toString(),
          name,
          email:
            event.externalReferenceId ??
            event.providerCustomerId ??
            buildSalesFallbackLabel(event),
          avatar: null,
          fallback: buildInitials(name),
          amount: event.amount ?? 0,
          currency: event.currency ?? "USD",
        };
      }),
    };
  },
});
