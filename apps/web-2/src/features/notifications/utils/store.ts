'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@wabrix/backend/convex/_generated/api';
import type { NotificationAction, NotificationStatus } from '@/components/ui/notification-card';
import { toast } from 'sonner';

export type Notification = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  actions?: NotificationAction[];
  actionUrl?: string | null;
};

type NotificationStore = {
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: () => number;
};

const NOTIFICATION_LIMIT = 100;

export function useNotificationStore(): NotificationStore {
  const notificationStateData = useQuery(api.notifications.getNotificationsState, {
    limit: NOTIFICATION_LIMIT
  });
  const [cachedNotificationState, setCachedNotificationState] = useState(notificationStateData);
  const [optimisticReadIds, setOptimisticReadIds] = useState<string[]>([]);
  const [optimisticMarkAllAt, setOptimisticMarkAllAt] = useState<number | null>(null);

  useEffect(() => {
    if (notificationStateData !== undefined) {
      setCachedNotificationState(notificationStateData);
    }
  }, [notificationStateData]);

  useEffect(() => {
    if (!notificationStateData) {
      return;
    }

    setOptimisticReadIds((current) =>
      current.filter((id) => {
        const notification = notificationStateData.notifications.find((item) => String(item.id) === id);
        return notification ? !notification.read : false;
      })
    );
  }, [notificationStateData]);

  const notificationState = notificationStateData ?? cachedNotificationState;
  const markNotificationRead = useMutation(api.notifications.markNotificationRead);
  const markAllNotificationsRead = useMutation(api.notifications.markAllNotificationsRead);

  const notifications = useMemo(() => {
    return (notificationState?.notifications ?? []).map((notification) => {
      const isRead =
        notification.read ||
        optimisticReadIds.includes(String(notification.id)) ||
        (optimisticMarkAllAt !== null && notification.updatedAt <= optimisticMarkAllAt);

      return {
        id: String(notification.id),
        title: notification.title,
        body: notification.description,
        status: isRead ? ('read' as const) : ('unread' as const),
        createdAt: new Date(notification.createdAt).toISOString(),
        actionUrl: notification.actionUrl,
        actions:
          notification.actionUrl && notification.actionLabel
            ? [
                {
                  id: 'open-notification',
                  label: notification.actionLabel,
                  type: 'redirect' as const,
                  style: 'primary' as const
                }
              ]
            : undefined
      };
    });
  }, [notificationState?.notifications, optimisticMarkAllAt, optimisticReadIds]);

  const markAsRead = async (id: string) => {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.status === 'read') {
      return;
    }

    setOptimisticReadIds((current) => (current.includes(id) ? current : [...current, id]));

    try {
      await markNotificationRead({
        notificationId: id as never
      });
    } catch {
      setOptimisticReadIds((current) => current.filter((value) => value !== id));
      toast.error('Failed to mark notification as read.');
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) {
      return;
    }

    const now = Date.now();
    setOptimisticMarkAllAt(now);

    try {
      await markAllNotificationsRead({});
    } catch {
      setOptimisticMarkAllAt(null);
      toast.error('Failed to mark all notifications as read.');
    }
  };

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    unreadCount: () => notifications.filter((notification) => notification.status === 'unread').length
  };
}
