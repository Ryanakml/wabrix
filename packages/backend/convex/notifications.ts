import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireOrgContext } from "./rbac.js";

const DEFAULT_NOTIFICATION_LIMIT = 100;
const MAX_NOTIFICATION_LIMIT = 100;
const MAX_NOTIFICATION_PREVIEW_LENGTH = 240;

type DashboardNotificationType =
  | "inbound_message"
  | "service_window_expiring"
  | "bot_reply_failed"
  | "outbound_send_failed"
  | "template_rejected"
  | "waba_action_required";

function clampLimit(limit?: number) {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.max(1, Math.min(MAX_NOTIFICATION_LIMIT, Math.floor(limit)));
}

function truncateNotificationPreview(content: string) {
  const normalized = content.trim().replace(/\s+/g, " ");

  if (normalized.length <= MAX_NOTIFICATION_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_NOTIFICATION_PREVIEW_LENGTH - 1)}…`;
}

function getNotificationAction(notification: {
  _id: Id<"dashboardNotifications">;
  type: DashboardNotificationType;
  conversationId?: Id<"conversations">;
  focusMessageId?: Id<"messages">;
}) {
  switch (notification.type) {
    case "inbound_message":
    case "service_window_expiring":
    case "bot_reply_failed":
    case "outbound_send_failed": {
      const params = new URLSearchParams();
      if (notification.conversationId) {
        params.set("conversationId", notification.conversationId.toString());
      }
      if (notification.focusMessageId) {
        params.set("focusMessageId", notification.focusMessageId.toString());
      }
      params.set("notificationId", notification._id.toString());

      const query = params.toString();
      return {
        label: "Open chat",
        url: query ? `/chat?${query}` : "/chat",
      };
    }
    case "template_rejected":
      return {
        label: "Review templates",
        url: "/whatsapp-integration",
      };
    case "waba_action_required":
      return {
        label: "Open setup",
        url: "/whatsapp-integration",
      };
    default:
      return null;
  }
}

function getInboundNotificationTitle({
  profileName,
  waId,
  messageType,
  content,
}: {
  profileName?: string;
  waId: string;
  messageType: "text" | "audio" | "image" | "document" | "unsupported";
  content: string;
}) {
  const sender = profileName?.trim() || waId;

  if (content === "[Sticker received]") {
    return `New sticker from ${sender}`;
  }

  switch (messageType) {
    case "audio":
      return `New voice note from ${sender}`;
    case "image":
      return `New image from ${sender}`;
    case "document":
      return `New document from ${sender}`;
    default:
      return `New message from ${sender}`;
  }
}

function hasWebPushVapidConfig() {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY &&
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY &&
      process.env.WEB_PUSH_VAPID_SUBJECT,
  );
}

function buildInboundMessageNotificationDedupeKey(providerMessageId: string) {
  return `inbound-message:${providerMessageId}`;
}

export async function upsertInboundMessageDashboardNotification(
  ctx: Pick<MutationCtx, "db" | "scheduler">,
  {
    organizationId,
    conversationId,
    focusMessageId,
    providerMessageId,
    profileName,
    waId,
    messageType,
    content,
  }: {
    organizationId: Id<"organizations">;
    conversationId: Id<"conversations">;
    focusMessageId: Id<"messages">;
    providerMessageId: string;
    profileName?: string;
    waId: string;
    messageType: "text" | "audio" | "image" | "document" | "unsupported";
    content: string;
  },
) {
  const dedupeKey = buildInboundMessageNotificationDedupeKey(providerMessageId);
  const title = getInboundNotificationTitle({
    profileName,
    waId,
    messageType,
    content,
  });
  const body = truncateNotificationPreview(content);
  const now = Date.now();
  const existing = await ctx.db
    .query("dashboardNotifications")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
    .first();

  let notificationId: Id<"dashboardNotifications">;

  if (existing) {
    notificationId = existing._id;
    await ctx.db.patch(existing._id, {
      type: "inbound_message",
      severity: "info",
      title,
      body,
      focusMessageId,
      status: "open",
      updatedAt: now,
    });
  } else {
    notificationId = await ctx.db.insert("dashboardNotifications", {
      organizationId,
      conversationId,
      focusMessageId,
      type: "inbound_message",
      severity: "info",
      title,
      body,
      dedupeKey,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (ctx.scheduler && hasWebPushVapidConfig()) {
    await ctx.scheduler.runAfter(
      0,
      internal.notificationAction.deliverDashboardNotificationPush,
      {
        notificationId,
      },
    );
  }

  return notificationId;
}

function isReadForUser({
  notification,
  userId,
  lastReadAllAt,
}: {
  notification: Doc<"dashboardNotifications">;
  userId: Id<"users">;
  lastReadAllAt?: number;
}) {
  if ((notification.readByUserIds ?? []).includes(userId)) {
    return true;
  }

  if (typeof lastReadAllAt !== "number") {
    return false;
  }

  return notification.updatedAt <= lastReadAllAt;
}

export const getNotificationsState = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await requireOrgContext(ctx);
    const limit = clampLimit(args.limit);
    const [notifications, feedState] = await Promise.all([
      ctx.db
        .query("dashboardNotifications")
        .withIndex("by_org_created_at", (q) =>
          q.eq("organizationId", access.organizationId),
        )
        .order("desc")
        .take(limit),
      ctx.db
        .query("dashboardNotificationFeedStates")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", access.organizationId)
            .eq("userId", access.userId),
        )
        .first(),
    ]);

    const mappedNotifications = notifications.map((notification) => {
      const action = getNotificationAction(notification);
      const read = isReadForUser({
        notification,
        userId: access.userId,
        lastReadAllAt: feedState?.lastReadAllAt,
      });

      return {
        id: notification._id,
        title: notification.title,
        description: notification.body,
        type: notification.type,
        severity: notification.severity,
        recommendation: notification.recommendation ?? null,
        read,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        conversationId: notification.conversationId ?? null,
        focusMessageId: notification.focusMessageId ?? null,
        actionUrl: action?.url ?? null,
        actionLabel: action?.label ?? null,
      };
    });

    return {
      notifications: mappedNotifications,
      unreadCount: mappedNotifications.filter(
        (notification) => !notification.read,
      ).length,
    };
  },
});

export const getBrowserNotificationSetupState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const vapidConfigured = hasWebPushVapidConfig();
    const activeSubscriptions = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", access.organizationId)
          .eq("userId", access.userId),
      )
      .collect();

    return {
      vapidConfigured,
      vapidPublicKey: vapidConfigured
        ? (process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? null)
        : null,
      hasStoredSubscription: activeSubscriptions.length > 0,
    };
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("dashboardNotifications"),
  },
  handler: async (ctx, args) => {
    const access = await requireOrgContext(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (
      !notification ||
      notification.organizationId !== access.organizationId
    ) {
      throw new Error("Notification not found for the active organization.");
    }

    const existingReaders = notification.readByUserIds ?? [];

    if (existingReaders.includes(access.userId)) {
      return { ok: true };
    }

    await ctx.db.patch(notification._id, {
      readByUserIds: [...existingReaders, access.userId],
    });

    return { ok: true };
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const existingFeedState = await ctx.db
      .query("dashboardNotificationFeedStates")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", access.organizationId)
          .eq("userId", access.userId),
      )
      .first();

    if (existingFeedState) {
      await ctx.db.patch(existingFeedState._id, {
        lastReadAllAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dashboardNotificationFeedStates", {
        organizationId: access.organizationId,
        userId: access.userId,
        lastReadAllAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const saveWebPushSubscription = mutation({
  args: {
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    p256dhKey: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireOrgContext(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_org_user_endpoint", (q) =>
        q
          .eq("organizationId", access.organizationId)
          .eq("userId", access.userId)
          .eq("endpoint", args.endpoint),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        expirationTime: args.expirationTime,
        p256dhKey: args.p256dhKey,
        authKey: args.authKey,
        userAgent: args.userAgent,
        updatedAt: now,
        lastError: undefined,
      });

      return { ok: true, subscriptionId: existing._id };
    }

    const subscriptionId = await ctx.db.insert("webPushSubscriptions", {
      organizationId: access.organizationId,
      userId: access.userId,
      endpoint: args.endpoint,
      expirationTime: args.expirationTime,
      p256dhKey: args.p256dhKey,
      authKey: args.authKey,
      userAgent: args.userAgent,
      lastSuccessAt: undefined,
      lastFailureAt: undefined,
      lastError: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, subscriptionId };
  },
});

export const deleteWebPushSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireOrgContext(ctx);
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_org_user_endpoint", (q) =>
        q
          .eq("organizationId", access.organizationId)
          .eq("userId", access.userId)
          .eq("endpoint", args.endpoint),
      )
      .first();

    if (!existing) {
      return { ok: true };
    }

    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const getDashboardNotificationPushDeliveryState = internalQuery({
  args: {
    notificationId: v.id("dashboardNotifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.status !== "open") {
      return null;
    }

    const subscriptions = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_org", (q) =>
        q.eq("organizationId", notification.organizationId),
      )
      .collect();
    const action = getNotificationAction(notification);

    return {
      notification: {
        id: notification._id,
        organizationId: notification.organizationId,
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        type: notification.type,
        actionUrl: action?.url ?? "/dashboard/notifications",
      },
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription._id,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.p256dhKey,
        authKey: subscription.authKey,
      })),
    };
  },
});

export const recordWebPushDeliveryResult = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    endpoint: v.string(),
    delivered: v.boolean(),
    invalid: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_org_endpoint", (q) =>
        q.eq("organizationId", args.organizationId).eq("endpoint", args.endpoint),
      )
      .first();

    if (!subscription) {
      return { ok: true };
    }

    if (args.invalid) {
      await ctx.db.delete(subscription._id);
      return { ok: true, removed: true };
    }

    const now = Date.now();
    await ctx.db.patch(subscription._id, {
      lastSuccessAt: args.delivered ? now : subscription.lastSuccessAt,
      lastFailureAt: args.delivered ? subscription.lastFailureAt : now,
      lastError: args.delivered ? undefined : args.errorMessage,
      updatedAt: now,
    });

    return { ok: true };
  },
});
