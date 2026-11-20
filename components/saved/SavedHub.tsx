'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ExternalLink,
  FileCheck2,
  GitCompareArrows,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import type { DocumentRequirement, Scheme } from '@/lib/schemes/schema';
import {
  getCheckedDocIds,
  getCompareSchemeIds,
  getSavedSchemeIds,
  toggleCheckedDocId,
  toggleCompareSchemeId,
} from '@/lib/storage/local';
import { cn } from '@/lib/utils';

type TabKey = 'saved' | 'checklist' | 'compare';

export function SavedHub({ allSchemes }: { allSchemes: Scheme[] }) {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('saved');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [checkedDocs, setCheckedDocs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setSavedIds(getSavedSchemeIds());
      setCompareIds(getCompareSchemeIds());
      setCheckedDocs(getCheckedDocIds());
    };
    sync();
    window.addEventListener('yojanamitra:storage', sync);
    return () => window.removeEventListener('yojanamitra:storage', sync);
  }, []);

  const schemeMap = useMemo(() => new Map(allSchemes.map((s) => [s.id, s])), [allSchemes]);
  const savedSchemes = useMemo(
    () => savedIds.map((id) => schemeMap.get(id)).filter((s): s is Scheme => Boolean(s)),
    [savedIds, schemeMap]
  );
  const compareSchemes = useMemo(
    () => compareIds.map((id) => schemeMap.get(id)).filter((s): s is Scheme => Boolean(s)),
    [compareIds, schemeMap]
  );

  // Deduplicated document checklist across all saved schemes
  const aggregatedDocs = useMemo(() => {
    const map = new Map<string, { doc: DocumentRequirement; schemeNames: string[] }>();
    for (const s of savedSchemes) {
      for (const d of s.documents) {
        const existing = map.get(d.id);
        if (existing) {
          existing.schemeNames.push(s.name[lang]);
        } else {
          map.set(d.id, { doc: d, schemeNames: [s.name[lang]] });
        }
      }
    }
    return Array.from(map.values());
  }, [savedSchemes, lang]);

  const handleToggleDoc = (docId: string) => {
    setCheckedDocs(toggleCheckedDocId(docId));
  };

  const whatsappSummary = useMemo(() => {
    const lines = [
      `*${t.appName} — ${t.saved.tabSaved}*`,
      ...savedSchemes.map((s, idx) => `${idx + 1}. ${s.name[lang]} (${s.officialUrl})`),
      '',
      `*${t.saved.tabChecklist}:*`,
      ...aggregatedDocs.map(
        ({ doc }) => `${checkedDocs.includes(doc.id) ? '✅' : '⬜'} ${doc.name[lang]}`
      ),
    ];
    return encodeURIComponent(lines.join('\n'));
  }, [t, savedSchemes, aggregatedDocs, checkedDocs, lang]);

  const tabs: Array<{
    key: TabKey;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'saved', label: t.saved.tabSaved, count: savedSchemes.length, icon: Bookmark },
    {
      key: 'checklist',
      label: t.saved.tabChecklist,
      count: aggregatedDocs.length,
      icon: FileCheck2,
    },
    {
      key: 'compare',
      label: t.saved.tabCompare,
      count: compareSchemes.length,
      icon: GitCompareArrows,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg-primary)] sm:text-3xl">
            {t.saved.title}
          </h1>
          <p className="mt-1 text-base text-[var(--fg-secondary)]">{t.saved.subtitle}</p>
        </div>
        {savedSchemes.length > 0 && (
          <div className="no-print flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span>{t.saved.printSummary}</span>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a
                href={`https://wa.me/?text=${whatsappSummary}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-4 w-4" />
                <span>{t.saved.shareAllWhatsApp}</span>
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Saved schemes sections"
        className="no-print flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--border-subtle)] pb-2"
      >
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex min-h-[48px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === key
                ? 'bg-[var(--accent-teal)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-muted)]'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{count}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Saved Schemes */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedSchemes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <Bookmark className="h-10 w-10 text-[var(--fg-muted)]" />
                <p className="text-base text-[var(--fg-secondary)]">{t.saved.emptySaved}</p>
                <Button asChild variant="secondary">
                  <Link href="/explorer">{t.saved.exploreCta}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {savedSchemes.map((s) => (
                <SchemeCard key={s.id} scheme={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Aggregated Documents Checklist */}
      {activeTab === 'checklist' && (
        <Card className="surface-elevated overflow-hidden rounded-3xl">
          <CardContent className="space-y-6 p-6 sm:p-8">
            {aggregatedDocs.length > 0 && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-display text-base font-bold text-[var(--fg-primary)]">
                    <FileCheck2 className="h-5 w-5 text-[var(--accent-teal)]" />
                    <span>Paperwork Readiness Meter</span>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-[var(--accent-teal)]">
                    {aggregatedDocs.filter(({ doc }) => checkedDocs.includes(doc.id)).length} of{' '}
                    {aggregatedDocs.length} Ready (
                    {Math.round(
                      (aggregatedDocs.filter(({ doc }) => checkedDocs.includes(doc.id)).length /
                        aggregatedDocs.length) *
                        100
                    )}
                    %)
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0D5C63] to-[#10B981] transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (aggregatedDocs.filter(({ doc }) => checkedDocs.includes(doc.id)).length /
                          aggregatedDocs.length) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                {aggregatedDocs.filter(({ doc }) => checkedDocs.includes(doc.id)).length ===
                  aggregatedDocs.length && (
                  <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ All documents ready! You can now visit your nearest Common Service Centre
                    (CSC) or apply online.
                  </p>
                )}
              </div>
            )}

            <p className="text-base text-[var(--fg-secondary)]">{t.saved.checklistIntro}</p>
            {aggregatedDocs.length === 0 ? (
              <p className="py-4 text-sm text-[var(--fg-muted)]">{t.saved.emptySaved}</p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {aggregatedDocs.map(({ doc, schemeNames }) => {
                  const checked = checkedDocs.includes(doc.id);
                  return (
                    <li key={doc.id} className="py-3">
                      <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDoc(doc.id)}
                          className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent-teal)]"
                        />
                        <div className="space-y-1">
                          <div
                            className={cn(
                              'text-base font-semibold text-[var(--fg-primary)]',
                              checked && 'line-through opacity-60'
                            )}
                          >
                            {doc.name[lang]}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {schemeNames.map((sn, i) => (
                              <Badge key={i} variant="default">
                                {sn}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Side-by-Side Compare Table */}
      {activeTab === 'compare' && (
        <Card>
          <CardContent className="p-5">
            {compareSchemes.length < 2 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <GitCompareArrows className="h-10 w-10 text-[var(--fg-muted)]" />
                <p className="text-base text-[var(--fg-secondary)]">{t.saved.compareEmpty}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/explorer">{t.saved.exploreCta}</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="pb-2 text-xs text-[var(--fg-muted)] sm:hidden">
                  ← Swipe table horizontally to compare schemes →
                </div>
                <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="w-40 p-3 font-bold text-[var(--fg-muted)]">Field</th>
                      {compareSchemes.map((s) => (
                        <th key={s.id} className="p-3 align-top">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-base font-bold text-[var(--fg-primary)]">
                              {s.name[lang]}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${s.name[lang]}`}
                              onClick={() => setCompareIds(toggleCompareSchemeId(s.id))}
                              className="cursor-pointer rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-surface-muted)]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.benefit}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3 font-medium text-[var(--accent-teal)]">
                          {s.benefitHighlight[lang]}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.level}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3">
                          {s.level === 'state' ? `${s.state} (State)` : 'Central (All India)'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.documents}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3">
                          <ul className="list-disc pl-4">
                            {s.documents.map((d) => (
                              <li key={d.id}>{d.name[lang]}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.deadline}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3">
                          {s.deadlines[lang]}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.helpline}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3 font-semibold">
                          {s.helpline}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--fg-muted)]">
                        {t.saved.compareFields.apply}
                      </td>
                      {compareSchemes.map((s) => (
                        <td key={s.id} className="p-3">
                          <a
                            href={s.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[var(--accent-saffron)] hover:underline"
                          >
                            <span>Apply</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
