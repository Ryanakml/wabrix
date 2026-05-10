self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "New notification";
  const url = payload.url || "/dashboard/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag || undefined,
      icon: "/icon.png",
      badge: "/icon.png",
      data: {
        url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(url, self.location.origin);

        if (clientUrl.origin === targetUrl.origin && "focus" in client) {
          client.postMessage({
            type: "open-notification-url",
            url: targetUrl.pathname + targetUrl.search,
          });
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }

      return undefined;
    }),
  );
});
