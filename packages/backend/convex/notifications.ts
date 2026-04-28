import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server.js";
import { requireOrgContext } from "./rbac.js";

const DEFAULT_NOTIFICATION_LIMIT = 100;
const MAX_NOTIFICATION_LIMIT = 100;

function clampLimit(limit?: number) {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.max(1, Math.min(MAX_NOTIFICATION_LIMIT, Math.floor(limit)));
}

function getNotificationAction(notification: Doc<"dashboardNotifications">) {
  switch (notification.type) {
    case "service_window_expiring":
    case "bot_reply_failed":
    case "outbound_send_failed":
      return {
        label: "Open chat",
        url: notification.conversationId
          ? `/chat?conversationId=${notification.conversationId}`
          : "/chat",
      };
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
        .withIndex("by_org_created_at", (q) => q.eq("organizationId", access.organizationId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("dashboardNotificationFeedStates")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", access.organizationId).eq("userId", access.userId),
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
        read,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        actionUrl: action?.url ?? null,
        actionLabel: action?.label ?? null,
      };
    });

    return {
      notifications: mappedNotifications,
      unreadCount: mappedNotifications.filter((notification) => !notification.read).length,
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

    if (!notification || notification.organizationId !== access.organizationId) {
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
        q.eq("organizationId", access.organizationId).eq("userId", access.userId),
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
