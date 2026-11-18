'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { I18nProvider } from '@/lib/i18n/context';
import { getStoredHighContrast, getStoredTheme } from '@/lib/storage/local';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hydrate theme & high-contrast classes cleanly
    const theme = getStoredTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const hc = getStoredHighContrast();
    document.documentElement.classList.toggle('high-contrast', hc);

    // Register offline-capable PWA service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider>{children}</I18nProvider>
    </MotionConfig>
  );
}
