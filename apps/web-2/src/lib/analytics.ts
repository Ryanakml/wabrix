'use client';

import posthog from 'posthog-js';

declare global {
  interface Window {
    __wabrixPosthogEnabled?: boolean;
  }
}

export function captureAnalyticsEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === 'undefined' || !window.__wabrixPosthogEnabled) {
    return;
  }

  posthog.capture(eventName, properties);
}
