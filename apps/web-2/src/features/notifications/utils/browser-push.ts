"use client";

const WEB_PUSH_SERVICE_WORKER_PATH = "/web-push-sw.js";

type SerializablePushSubscription = {
  endpoint: string;
  expirationTime?: number;
  p256dhKey: string;
  authKey: string;
};

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    window.isSecureContext
  );
}

export function getBrowserNotificationPermission() {
  if (typeof Notification === "undefined") {
    return "default" as NotificationPermission;
  }

  return Notification.permission;
}

export async function ensureWebPushServiceWorkerRegistration() {
  if (!isWebPushSupported()) {
    throw new Error("This browser does not support web push notifications.");
  }

  return navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_PATH);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const raw = window.atob(padded);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

export async function ensureWebPushSubscription(vapidPublicKey: string) {
  const registration = await ensureWebPushServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(vapidPublicKey),
  });
}

export async function getCurrentWebPushSubscription() {
  if (!isWebPushSupported()) {
    return null;
  }

  const registration = await ensureWebPushServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export function serializeWebPushSubscription(
  subscription: PushSubscription,
): SerializablePushSubscription {
  const serialized = subscription.toJSON();
  const p256dhKey = serialized.keys?.p256dh;
  const authKey = serialized.keys?.auth;

  if (!serialized.endpoint || !p256dhKey || !authKey) {
    throw new Error("The browser push subscription is missing required keys.");
  }

  return {
    endpoint: serialized.endpoint,
    expirationTime: serialized.expirationTime ?? undefined,
    p256dhKey,
    authKey,
  };
}
