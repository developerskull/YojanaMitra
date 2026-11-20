'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Compass,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Search,
  Tractor,
  Users,
  X,
} from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';
import type { Scheme, SchemeCategory } from '@/lib/schemes/schema';

const CATEGORY_CHIPS: Array<{
  id: string;
  label: { en: string; hi: string; mr: string };
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: { en: 'All Categories', hi: 'सभी श्रेणियां', mr: 'सर्व वर्ग' }, icon: Compass },
  { id: 'farmer', label: { en: 'Farmers', hi: 'किसान', mr: 'शेतकरी' }, icon: Tractor },
  { id: 'woman', label: { en: 'Women', hi: 'महिलाएं', mr: 'महिला' }, icon: Users },
  { id: 'student', label: { en: 'Students', hi: 'छात्र', mr: 'विद्यार्थी' }, icon: GraduationCap },
  { id: 'health', label: { en: 'Health', hi: 'स्वास्थ्य', mr: 'आरोग्य' }, icon: HeartPulse },
  { id: 'senior', label: { en: 'Seniors', hi: 'वरिष्ठ नागरिक', mr: 'ज्येष्ठ नागरिक' }, icon: Users },
  {
    id: 'worker',
    label: { en: 'Workers', hi: 'कारीगर व कामगार', mr: 'कामगार व कारागीर' },
    icon: Hammer,
  },
  { id: 'housing', label: { en: 'Housing', hi: 'आवास', mr: 'घरकुल' }, icon: Home },
];

function extractBenefitNumeric(s: Scheme): number {
  const en = (s.benefitHighlight.en || '').toLowerCase();
  if (en.includes('5 lakh')) return 500000;
  if (en.includes('3 lakh')) return 300000;
  if (en.includes('2.5 lakh')) return 250000;
  if (en.includes('1.5 lakh')) return 150000;
  if (en.includes('1,500 / month') || en.includes('1500 / month')) return 18000;
  if (en.includes('6,000')) return 6000;
  if (en.includes('30,000')) return 30000;
  if (en.includes('20,000')) return 20000;
  if (en.includes('50,000')) return 50000;
  return 10000;
}

export function SchemeExplorer({ initialSchemes }: { initialSchemes: Scheme[] }) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'central' | 'state'>('all');
  const [sortBy, setSortBy] = useState<'benefit' | 'alpha'>('benefit');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = initialSchemes.filter((s) => {
      if (levelFilter !== 'all' && s.level !== levelFilter) return false;
      if (
        selectedCategory !== 'all' &&
        s.category !== selectedCategory &&
        !s.secondaryCategories.includes(selectedCategory as SchemeCategory)
      ) {
        return false;
      }

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

    if (sortBy === 'benefit') {
      return [...list].sort((a, b) => extractBenefitNumeric(b) - extractBenefitNumeric(a));
    }
    return [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  }, [initialSchemes, query, levelFilter, selectedCategory, sortBy, lang]);

  const hasFilters = query.trim().length > 0 || selectedCategory !== 'all' || levelFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="surface-elevated flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-teal)]/20 bg-[var(--accent-teal-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-teal)]">
            <Compass className="h-3.5 w-3.5" />
            <span>Universal Government Directory</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            {t.explorer.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-secondary)] sm:text-base">
            {t.explorer.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="saffron" className="px-3 py-1 font-mono text-sm">
            46 Verified Schemes
          </Badge>
        </div>
      </div>

      {/* Modern Filter Command Deck */}
      <div className="surface-elevated space-y-4 rounded-3xl p-5 sm:p-6">
        {/* Search Bar */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--fg-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.explorer.searchPlaceholder}
            aria-label={t.explorer.searchPlaceholder}
            className="min-h-[54px] w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pr-10 pl-12 text-base text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-surface-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Horizontal Pill Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORY_CHIPS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 font-bold transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-teal)] text-white shadow-xs dark:text-[#041B19]'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--fg-secondary)] hover:border-[var(--accent-teal)]/40 hover:text-[var(--fg-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.label[lang] ?? cat.label.en}</span>
              </button>
            );
          })}
        </div>

        {/* Level Filters & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold uppercase text-[var(--fg-muted)]">
              Jurisdiction:
            </span>
            <button
              type="button"
              onClick={() => setLevelFilter('all')}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all sm:px-3 ${
                levelFilter === 'all'
                  ? 'bg-[var(--fg-primary)] text-[var(--bg-surface)]'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('central')}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all sm:px-3 ${
                levelFilter === 'central'
                  ? 'bg-[var(--accent-teal)] text-white dark:text-[#041B19]'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)]'
              }`}
            >
              Central Schemes
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('state')}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all sm:px-3 ${
                levelFilter === 'state'
                  ? 'bg-[var(--accent-saffron)] text-white'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)]'
              }`}
            >
              Maharashtra State
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold uppercase text-[var(--fg-muted)]">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort:</span>
            </span>
            <select
              aria-label="Sort schemes"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'benefit' | 'alpha')}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-bold text-[var(--fg-primary)]"
            >
              <option value="benefit">Highest Benefit (₹)</option>
              <option value="alpha">Alphabetical (A-Z)</option>
            </select>

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                  setLevelFilter('all');
                }}
                className="text-xs"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm text-[var(--fg-secondary)]">
        <span className="font-semibold">
          Showing <strong className="text-[var(--fg-primary)]">{filtered.length}</strong> of{' '}
          {initialSchemes.length} schemes
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-3xl p-12 text-center">
          <Compass className="mx-auto h-12 w-12 text-[var(--fg-muted)]" />
          <h3 className="mt-3 font-display text-lg font-bold text-[var(--fg-primary)]">
            {t.explorer.noResults}
          </h3>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Try adjusting your search query or selecting a different category.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
              setLevelFilter('all');
            }}
          >
            Clear All Filters
          </Button>
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
