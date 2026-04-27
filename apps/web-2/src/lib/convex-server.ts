import { auth } from '@clerk/nextjs/server';
import type { NextjsOptions } from 'convex/nextjs';

export async function getConvexServerOptions(): Promise<NextjsOptions> {
  const clerkAuth = await auth();

  if (!clerkAuth.userId) {
    return {};
  }

  try {
    const token =
      clerkAuth.sessionClaims?.aud === 'convex'
        ? await clerkAuth.getToken()
        : await clerkAuth.getToken({ template: 'convex' });

    return token ? { token } : {};
  } catch {
    return {};
  }
}
