'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log only error code/digest (never PII)
    console.error('YojanaMitra boundary caught error:', error.digest ?? 'client_error');
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-600" />
      <h1 className="text-xl font-bold text-[var(--fg-primary)]">
        Something went wrong / कुछ गड़बड़ हो गई / काहीतरी चुकले
      </h1>
      <p className="text-sm text-[var(--fg-secondary)]">
        Please try again. Your locally saved profile and schemes are safe on this device.
      </p>
      <Button type="button" variant="secondary" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        <span>Try Again</span>
      </Button>
    </div>
  );
}
