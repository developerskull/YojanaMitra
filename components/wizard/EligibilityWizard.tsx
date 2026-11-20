'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { EligibilityEvaluation } from '@/lib/eligibility/engine';
import { getMissingWizardQuestions } from '@/lib/eligibility/wizard';
import { useI18n } from '@/lib/i18n/context';
import type { Scheme, UserProfile } from '@/lib/schemes/schema';
import { getStoredProfile, setStoredProfile } from '@/lib/storage/local';

interface EvalResultItem {
  scheme: Scheme;
  evaluation: EligibilityEvaluation;
}

export function EligibilityWizard() {
  const { lang, t } = useI18n();
  const [profile, setProfile] = useState<UserProfile>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [numberInput, setNumberInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<EvalResultItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'eligible' | 'likely'>('all');

  useEffect(() => {
    const stored = getStoredProfile();
    setProfile(stored);
  }, []);

  const missingQuestions = useMemo(() => getMissingWizardQuestions(profile), [profile]);
  const currentQuestion = missingQuestions[stepIdx];

  const runEvaluation = async (targetProfile: UserProfile) => {
    setLoadingResults(true);
    setShowResults(true);
    try {
      const res = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: targetProfile, lang }),
      });
      const data = (await res.json()) as { results?: EvalResultItem[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const applyAnswer = (field: string, value: string | number | boolean) => {
    const nextProfile: UserProfile = { ...profile, [field]: value };
    setProfile(nextProfile);
    setStoredProfile(nextProfile);
    setNumberInput('');

    const nextMissing = getMissingWizardQuestions(nextProfile);
    if (nextMissing.length === 0 || stepIdx >= nextMissing.length) {
      void runEvaluation(nextProfile);
    }
  };

  const handleRestart = () => {
    setProfile({});
    setStoredProfile({});
    setStepIdx(0);
    setShowResults(false);
    setResults([]);
  };

  const eligibleSchemes = results.filter((r) => r.evaluation.status === 'eligible');
  const likelySchemes = results.filter((r) => r.evaluation.status === 'likely');

  const totalBenefitINR = useMemo(() => {
    return [...eligibleSchemes, ...likelySchemes].reduce((acc, curr) => {
      const en = (curr.scheme.benefitHighlight.en || '').toLowerCase();
      if (en.includes('5 lakh')) return acc + 500000;
      if (en.includes('3 lakh')) return acc + 300000;
      if (en.includes('2.5 lakh')) return acc + 250000;
      if (en.includes('1.5 lakh')) return acc + 150000;
      if (en.includes('1,500 / month') || en.includes('1500 / month')) return acc + 18000;
      if (en.includes('6,000')) return acc + 6000;
      if (en.includes('30,000')) return acc + 30000;
      if (en.includes('50,000')) return acc + 50000;
      return acc + 10000;
    }, 0);
  }, [eligibleSchemes, likelySchemes]);

  const displayedResults = useMemo(() => {
    if (resultsFilter === 'eligible') return eligibleSchemes;
    if (resultsFilter === 'likely') return likelySchemes;
    return [...eligibleSchemes, ...likelySchemes];
  }, [resultsFilter, eligibleSchemes, likelySchemes]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header Banner */}
      <div className="surface-elevated flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-teal)]/20 bg-[var(--accent-teal-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-teal)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Zero-Guesswork Eligibility Check</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            {t.wizard.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-secondary)] sm:text-base">
            {t.wizard.subtitle}
          </p>
        </div>
        {(Object.keys(profile).length > 0 || showResults) && (
          <Button type="button" variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4" />
            <span>{t.wizard.restart}</span>
          </Button>
        )}
      </div>

      {!showResults && currentQuestion ? (
        <Card className="surface-elevated overflow-hidden rounded-3xl border border-[var(--border-subtle)]">
          {/* Progress bar */}
          <div className="h-2 w-full bg-[var(--bg-surface-muted)]">
            <div
              className="h-full bg-gradient-to-r from-[#0D5C63] to-[#D45015] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((10 - missingQuestions.length + 1) / 10) * 100)
                )}%`,
              }}
            />
          </div>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <span>
                {t.wizard.stepOf} ({missingQuestions.length} remaining)
              </span>
              <button
                type="button"
                onClick={() => void runEvaluation(profile)}
                className="cursor-pointer font-bold text-[var(--accent-teal)] hover:underline"
              >
                {t.wizard.seeResults} →
              </button>
            </div>

            <div>
              <h2 className="font-display text-2xl font-extrabold text-[var(--fg-primary)] sm:text-3xl">
                {currentQuestion.question[lang]}
              </h2>
              {currentQuestion.helper && (
                <p className="mt-2 text-sm text-[var(--fg-secondary)] sm:text-base">
                  {currentQuestion.helper[lang]}
                </p>
              )}
            </div>

            {currentQuestion.type === 'number' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const num = Number.parseInt(numberInput, 10);
                  if (!Number.isNaN(num) && num >= 0 && num <= 120) {
                    applyAnswer(currentQuestion.field, num);
                  }
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder={currentQuestion.placeholder?.[lang] ?? ''}
                  className="min-h-[58px] flex-1 rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 text-xl font-bold text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                  autoFocus
                />
                <Button type="submit" variant="primary" size="lg" disabled={!numberInput}>
                  <span>{t.wizard.next}</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyAnswer(currentQuestion.field, opt.value)}
                    className="surface-interactive flex min-h-[60px] cursor-pointer items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-left text-base font-bold text-[var(--fg-primary)] transition-all hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-soft)] hover:text-[var(--accent-teal)]"
                  >
                    <span>{opt.label[lang]}</span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--fg-muted)]" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={stepIdx === 0}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t.wizard.back}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (stepIdx + 1 < missingQuestions.length) {
                    setStepIdx((i) => i + 1);
                  } else {
                    void runEvaluation(profile);
                  }
                }}
              >
                <span>{t.wizard.skip}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {!showResults && missingQuestions.length === 0 && (
            <Card className="surface-elevated text-center">
              <CardContent className="flex flex-col items-center gap-4 p-8">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                <h2 className="font-display text-xl font-bold">{t.wizard.allAnswered}</h2>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void runEvaluation(profile)}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>{t.wizard.seeResults}</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {showResults && (
            <>
              {/* High-Impact Benefit Impact Banner */}
              <div className="surface-elevated rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <Trophy className="h-4 w-4" />
                      <span>Verified Eligibility Complete</span>
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-extrabold text-[var(--fg-primary)] sm:text-3xl">
                      {eligibleSchemes.length} Schemes Ready for You
                    </h2>
                    <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                      Based on your exact age, occupation, state, and income criteria.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-canvas)] px-5 py-3.5 text-right shadow-sm">
                    <div className="text-xs font-bold uppercase text-[var(--fg-muted)]">
                      Estimated Annual Benefit
                    </div>
                    <div className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                      ₹{totalBenefitINR.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
                  <button
                    type="button"
                    onClick={() => setResultsFilter('all')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      resultsFilter === 'all'
                        ? 'bg-[var(--accent-teal)] text-white dark:text-[#041B19]'
                        : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)]'
                    }`}
                  >
                    All Matches ({results.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsFilter('eligible')}
                    className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      resultsFilter === 'eligible'
                        ? 'bg-emerald-600 text-white'
                        : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Eligible ({eligibleSchemes.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsFilter('likely')}
                    className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      resultsFilter === 'likely'
                        ? 'bg-amber-500 text-white'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Likely Eligible ({likelySchemes.length})</span>
                  </button>
                </div>
              </div>

              {loadingResults ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-48 animate-pulse rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedResults.map((item, idx) => (
                    <SchemeCard
                      key={item.scheme.id}
                      scheme={item.scheme}
                      evaluation={item.evaluation}
                      defaultExpanded={idx === 0}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
