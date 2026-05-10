"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ensureWebPushSubscription,
  getBrowserNotificationPermission,
  isWebPushSupported,
  serializeWebPushSubscription,
} from "../utils/browser-push";

const NOTIFICATION_LIMIT = 100;

type LiveNotification = {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: "info" | "warning" | "error";
  read: boolean;
  actionUrl?: string | null;
  actionLabel?: string | null;
};

function shouldRaiseBrowserNotification(notification: LiveNotification) {
  return (
    notification.type === "inbound_message" || notification.severity !== "info"
  );
}

export function NotificationRuntime() {
  const router = useRouter();
  const notificationState = useQuery(api.notifications.getNotificationsState, {
    limit: NOTIFICATION_LIMIT,
  }) as
    | {
        notifications: LiveNotification[];
      }
    | undefined;
  const setupState = useQuery(
    api.notifications.getBrowserNotificationSetupState,
    {},
  );
  const saveWebPushSubscription = useMutation(
    api.notifications.saveWebPushSubscription,
  );
  const hydratedRef = useRef(false);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    if (
      !setupState?.vapidConfigured ||
      !setupState.vapidPublicKey ||
      !isWebPushSupported() ||
      getBrowserNotificationPermission() !== "granted" ||
      syncInFlightRef.current
    ) {
      return;
    }

    const vapidPublicKey = setupState.vapidPublicKey;
    syncInFlightRef.current = true;

    void (async () => {
      try {
        const subscription = await ensureWebPushSubscription(vapidPublicKey);
        const serialized = serializeWebPushSubscription(subscription);

        await saveWebPushSubscription({
          ...serialized,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to enable browser alerts.";
        toast.error(message);
      } finally {
        syncInFlightRef.current = false;
      }
    })();
  }, [
    saveWebPushSubscription,
    setupState?.vapidConfigured,
    setupState?.vapidPublicKey,
  ]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent<{ type?: string; url?: string }>) => {
      if (
        event.data?.type === "open-notification-url" &&
        typeof event.data.url === "string"
      ) {
        router.push(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [router]);

  useEffect(() => {
    const notifications = notificationState?.notifications;

    if (!notifications) {
      return;
    }

    const unreadNotifications = notifications.filter(
      (notification) => !notification.read,
    );
    const nextKnownIds = new Set(
      unreadNotifications.map((notification) => String(notification.id)),
    );

    if (!hydratedRef.current) {
      knownNotificationIdsRef.current = nextKnownIds;
      hydratedRef.current = true;
      return;
    }

    const newNotifications = unreadNotifications.filter(
      (notification) =>
        !knownNotificationIdsRef.current.has(String(notification.id)),
    );
    knownNotificationIdsRef.current = nextKnownIds;

    for (const notification of newNotifications.reverse()) {
      toast(notification.title, {
        description: notification.description,
        action: notification.actionUrl
          ? {
              label: notification.actionLabel ?? "Open",
              onClick: () => router.push(notification.actionUrl ?? "/chat"),
            }
          : undefined,
      });

      if (
        document.visibilityState === "visible" ||
        getBrowserNotificationPermission() !== "granted" ||
        !shouldRaiseBrowserNotification(notification)
      ) {
        continue;
      }

      const browserNotification = new Notification(notification.title, {
        body: notification.description,
        tag: `dashboard-notification:${notification.id}`,
        icon: "/icon.png",
        badge: "/icon.png",
        data: {
          url: notification.actionUrl ?? "/dashboard/notifications",
        },
      });

      browserNotification.onclick = () => {
        window.focus();
        router.push(notification.actionUrl ?? "/dashboard/notifications");
        browserNotification.close();
      };
    }
  }, [notificationState?.notifications, router]);

  return null;
}
