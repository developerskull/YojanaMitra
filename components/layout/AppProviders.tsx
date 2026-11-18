'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/lib/auth/context';
import { I18nProvider } from '@/lib/i18n/context';
import { getStoredHighContrast, getStoredTheme } from '@/lib/storage/local';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getStoredTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const hc = getStoredHighContrast();
    document.documentElement.classList.toggle('high-contrast', hc);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
