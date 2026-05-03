'use client';

import { type ComponentProps, ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { getClerkAppearance } from '@/features/auth/components/clerk-appearance';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth');
  const clerkAppearance = getClerkAppearance(
    isAuthRoute ? 'light' : resolvedTheme === 'dark' ? 'dark' : 'light'
  ) as ComponentProps<typeof ClerkProvider>['appearance'];

  if (!convex) {
    // Fallback: Clerk-only mode when NEXT_PUBLIC_CONVEX_URL is not set
    return <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>;
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
