'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg-primary)] sm:text-3xl">
            {t.wizard.title}
          </h1>
          <p className="mt-1 text-base text-[var(--fg-secondary)]">{t.wizard.subtitle}</p>
        </div>
        {(Object.keys(profile).length > 0 || showResults) && (
          <Button type="button" variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4" />
            <span>{t.wizard.restart}</span>
          </Button>
        )}
      </div>

      {!showResults && currentQuestion ? (
        <Card className="overflow-hidden">
          <div className="h-2 bg-[var(--bg-surface-muted)]">
            <div
              className="h-full bg-[var(--accent-teal)] transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((10 - missingQuestions.length + 1) / 10) * 100)
                )}%`,
              }}
            />
          </div>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--fg-muted)]">
              <span>
                {t.wizard.stepOf} ({missingQuestions.length} left)
              </span>
              <button
                type="button"
                onClick={() => void runEvaluation(profile)}
                className="cursor-pointer font-semibold text-[var(--accent-teal)] hover:underline"
              >
                {t.wizard.seeResults} →
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--fg-primary)]">
                {currentQuestion.question[lang]}
              </h2>
              {currentQuestion.helper && (
                <p className="mt-1 text-sm text-[var(--fg-secondary)]">
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
                  className="min-h-[54px] flex-1 rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 text-lg text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                  autoFocus
                />
                <Button type="submit" variant="secondary" size="lg" disabled={!numberInput}>
                  <span>{t.wizard.next}</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {currentQuestion.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyAnswer(currentQuestion.field, opt.value)}
                    className="flex min-h-[54px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-3 text-left text-base font-medium text-[var(--fg-primary)] transition-colors hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-soft)]"
                  >
                    <span>{opt.label[lang]}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
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
        <div className="space-y-5">
          {!showResults && missingQuestions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="text-base font-medium">{t.wizard.allAnswered}</p>
                <Button type="button" variant="secondary" onClick={() => void runEvaluation(profile)}>
                  <Sparkles className="h-4 w-4" />
                  <span>{t.wizard.seeResults}</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {showResults && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <h2 className="mr-auto text-lg font-bold text-[var(--fg-primary)]">
                  {t.wizard.resultsTitle}
                </h2>
                <Badge variant="eligible">
                  {t.wizard.eligibleCount}: {eligibleSchemes.length}
                </Badge>
                <Badge variant="likely">
                  {t.wizard.likelyCount}: {likelySchemes.length}
                </Badge>
              </div>

              {loadingResults ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-40 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[...eligibleSchemes, ...likelySchemes].slice(0, 15).map((item, idx) => (
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
