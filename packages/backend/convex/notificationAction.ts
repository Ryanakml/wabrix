"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { internalAction } from "./_generated/server.js";

type DeliveryState = {
  notification: {
    id: string;
    organizationId: string;
    title: string;
    body: string;
    severity: "info" | "warning" | "error";
    type: string;
    actionUrl: string;
  };
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
  }>;
};

type PushDeliveryAttempt = {
  delivered: boolean;
  invalid?: boolean;
};

function formatPushError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown web push error";
}

export const deliverDashboardNotificationPush: ReturnType<
  typeof internalAction
> = internalAction({
  args: {
    notificationId: v.id("dashboardNotifications"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        skipped: true;
        reason: string;
      }
    | {
        delivered: number;
        attempted: number;
      }
  > => {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      return {
        skipped: true,
        reason: "missing_vapid_configuration",
      };
    }

    const deliveryState: DeliveryState | null = await ctx.runQuery(
      internal.notifications.getDashboardNotificationPushDeliveryState,
      {
        notificationId: args.notificationId,
      },
    );

    if (!deliveryState || deliveryState.subscriptions.length === 0) {
      return {
        skipped: true,
        reason: "no_active_subscriptions",
      };
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: deliveryState.notification.title,
      body: deliveryState.notification.body,
      severity: deliveryState.notification.severity,
      type: deliveryState.notification.type,
      url: deliveryState.notification.actionUrl,
      tag: `dashboard-notification:${deliveryState.notification.id}`,
      notificationId: deliveryState.notification.id,
    });

    const results: PromiseSettledResult<PushDeliveryAttempt>[] =
      await Promise.allSettled(
      deliveryState.subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dhKey,
                auth: subscription.authKey,
              },
            },
            payload,
            {
              TTL: 60,
              urgency:
                deliveryState.notification.type === "inbound_message"
                  ? "high"
                  : "normal",
            },
          );

          await ctx.runMutation(internal.notifications.recordWebPushDeliveryResult, {
            organizationId: deliveryState.notification.organizationId as never,
            endpoint: subscription.endpoint,
            delivered: true,
          });

          return { delivered: true };
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof (error as { statusCode?: unknown }).statusCode === "number"
              ? (error as { statusCode: number }).statusCode
              : undefined;
          const invalid = statusCode === 404 || statusCode === 410;

          await ctx.runMutation(internal.notifications.recordWebPushDeliveryResult, {
            organizationId: deliveryState.notification.organizationId as never,
            endpoint: subscription.endpoint,
            delivered: false,
            invalid,
            errorMessage: formatPushError(error).slice(0, 500),
          });

          return { delivered: false, invalid };
        }
      }),
    );

    const delivered = results.filter(
      (result: PromiseSettledResult<PushDeliveryAttempt>) =>
        result.status === "fulfilled" && result.value.delivered === true,
    ).length;

    return {
      delivered,
      attempted: deliveryState.subscriptions.length,
    };
  },
});
