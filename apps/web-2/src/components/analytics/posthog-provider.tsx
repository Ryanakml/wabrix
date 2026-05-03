'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

function normalizePostHogHost(host?: string) {
  const value = host?.trim();

  if (!value) {
    return 'https://us.i.posthog.com';
  }

  if (value === 'https://app.posthog.com' || value === 'https://us.posthog.com') {
    return 'https://us.i.posthog.com';
  }

  if (value === 'https://eu.posthog.com') {
    return 'https://eu.i.posthog.com';
  }

  return value;
}

const POSTHOG_HOST = normalizePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!POSTHOG_KEY) {
      window.__wabrixPosthogEnabled = false;
      return;
    }

    if (hasInitializedRef.current) {
      return;
    }

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: 'history_change',
      capture_pageleave: false,
      disable_session_recording: true,
      defaults: '2026-01-30',
      loaded: () => {
        window.__wabrixPosthogEnabled = true;
      }
    });

    hasInitializedRef.current = true;
  }, []);

  return children;
}
