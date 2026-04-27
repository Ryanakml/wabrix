'use client';

import React from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import { ConvexClientProvider } from './convex-client-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {

  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </ActiveThemeProvider>
    </>
  );
}
