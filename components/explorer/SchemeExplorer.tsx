'use client';

import React, { useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';
import type { BenefitType, Scheme, SchemeCategory } from '@/lib/schemes/schema';

export function SchemeExplorer({ initialSchemes }: { initialSchemes: Scheme[] }) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [benefitFilter, setBenefitFilter] = useState<string>('all');

  const states = useMemo(() => {
    const s = new Set<string>();
    for (const sc of initialSchemes) s.add(sc.state);
    return Array.from(s).sort();
  }, [initialSchemes]);

  const categories: SchemeCategory[] = [
    'farmer',
    'student',
    'woman',
    'senior',
    'worker',
    'disabled',
    'health',
    'housing',
  ];

  const benefitTypes: BenefitType[] = [
    'cash',
    'insurance',
    'loan',
    'subsidy',
    'scholarship',
    'pension',
    'housing',
    'skill',
    'equipment',
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialSchemes.filter((s) => {
      if (stateFilter !== 'all' && s.state !== stateFilter) return false;
      if (
        categoryFilter !== 'all' &&
        s.category !== categoryFilter &&
        !s.secondaryCategories.includes(categoryFilter as SchemeCategory)
      ) {
        return false;
      }
      if (benefitFilter !== 'all' && s.benefitType !== benefitFilter) return false;

      if (q) {
        const hay = [
          s.name.en,
          s.name.hi,
          s.name.mr,
          s.summary.en,
          s.summary.hi,
          s.summary.mr,
          s.benefitHighlight[lang],
          s.ministry,
          s.state,
          ...s.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialSchemes, query, stateFilter, categoryFilter, benefitFilter, lang]);

  const hasFilters =
    query.trim().length > 0 ||
    stateFilter !== 'all' ||
    categoryFilter !== 'all' ||
    benefitFilter !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg-primary)] sm:text-3xl">
          {t.explorer.title}
        </h1>
        <p className="mt-1 text-base text-[var(--fg-secondary)]">{t.explorer.subtitle}</p>
      </div>

      {/* Instant Client-Side Search & Filter Controls */}
      <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-[var(--fg-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.explorer.searchPlaceholder}
            aria-label={t.explorer.searchPlaceholder}
            className="min-h-[50px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pr-4 pl-11 text-base text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <select
            aria-label={t.explorer.allStates}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="min-h-[48px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-sm font-medium text-[var(--fg-primary)]"
          >
            <option value="all">{t.explorer.allStates}</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            aria-label={t.explorer.allCategories}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[48px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-sm font-medium text-[var(--fg-primary)]"
          >
            <option value="all">{t.explorer.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>

          <select
            aria-label={t.explorer.allBenefits}
            value={benefitFilter}
            onChange={(e) => setBenefitFilter(e.target.value)}
            className="min-h-[48px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-sm font-medium text-[var(--fg-primary)]"
          >
            <option value="all">{t.explorer.allBenefits}</option>
            {benefitTypes.map((bt) => (
              <option key={bt} value={bt}>
                {bt.charAt(0).toUpperCase() + bt.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--fg-secondary)]">
            <Filter className="h-4 w-4 text-[var(--accent-teal)]" />
            {t.explorer.showingCount} {filtered.length} / {initialSchemes.length}
          </span>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                setStateFilter('all');
                setCategoryFilter('all');
                setBenefitFilter('all');
              }}
            >
              <X className="h-4 w-4" />
              <span>{t.explorer.clearFilters}</span>
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-[var(--fg-secondary)]">
          {t.explorer.noResults}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}
    </div>
  );
}
