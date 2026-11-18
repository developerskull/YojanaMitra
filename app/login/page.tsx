import React, { Suspense } from 'react';
import { LoginView } from '@/components/auth/LoginView';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-10">
          <div className="h-[460px] animate-pulse rounded-[2rem] bg-[var(--bg-surface)]" />
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}
