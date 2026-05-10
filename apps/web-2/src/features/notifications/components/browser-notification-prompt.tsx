"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ensureWebPushSubscription,
  getBrowserNotificationPermission,
  getCurrentWebPushSubscription,
  isWebPushSupported,
  serializeWebPushSubscription,
} from "../utils/browser-push";

export function BrowserNotificationPrompt() {
  const { isAuthenticated } = useConvexAuth();
  const setupState = useQuery(
    api.notifications.getBrowserNotificationSetupState,
    isAuthenticated ? {} : "skip",
  );
  const saveWebPushSubscription = useMutation(
    api.notifications.saveWebPushSubscription,
  );
  const deleteWebPushSubscription = useMutation(
    api.notifications.deleteWebPushSubscription,
  );
  const [isClient, setIsClient] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setPermission(getBrowserNotificationPermission());
  }, []);

  if (!isClient || !isWebPushSupported() || !setupState?.vapidConfigured) {
    return null;
  }

  const handleEnable = async () => {
    setIsPending(true);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        toast.error("Browser notification permission was not granted.");
        return;
      }

      const subscription = await ensureWebPushSubscription(
        setupState.vapidPublicKey ?? "",
      );
      const serialized = serializeWebPushSubscription(subscription);

      await saveWebPushSubscription({
        ...serialized,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });

      toast.success("Browser alerts are enabled for this device.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to enable browser alerts.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  const handlePause = async () => {
    setIsPending(true);

    try {
      const subscription = await getCurrentWebPushSubscription();

      if (subscription) {
        const { endpoint } = serializeWebPushSubscription(subscription);
        await deleteWebPushSubscription({ endpoint });
        await subscription.unsubscribe();
      }

      toast.success("Browser alerts were paused on this device.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to pause browser alerts.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  const isEnabled =
    permission === "granted" && Boolean(setupState.hasStoredSubscription);
  const isDenied = permission === "denied";

  return (
    <div className="bg-muted/50 border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Browser alerts</p>
          <p className="text-muted-foreground text-xs">
            {isEnabled
              ? "Push alerts are active for new inbound chats on this browser."
              : isDenied
                ? "Browser permission is blocked. Enable notifications in site settings first."
                : "Enable push alerts so new inbound chats still ping you when the tab is hidden."}
          </p>
        </div>
        {isEnabled ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handlePause}
          >
            Pause
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={isPending || isDenied}
            onClick={handleEnable}
          >
            Enable
          </Button>
        )}
      </div>
    </div>
  );
}
