'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-teal-soft)] text-[var(--accent-teal)]">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg-primary)] sm:text-3xl">
            {t.privacy.title}
          </h1>
          <p className="mt-1 text-base text-[var(--fg-secondary)]">{t.privacy.subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {t.privacy.points.map((pt, idx) => (
          <Card key={idx}>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold text-[var(--accent-teal)]">{pt.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-[var(--fg-secondary)]">{pt.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
