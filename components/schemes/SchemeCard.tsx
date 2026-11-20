'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  GitCompareArrows,
  HelpCircle,
  IndianRupee,
  Phone,
  Share2,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { EligibilityEvaluation } from '@/lib/eligibility/engine';
import { useI18n } from '@/lib/i18n/context';
import type { Scheme } from '@/lib/schemes/schema';
import {
  addAppliedSchemeId,
  getAppliedSchemeIds,
  getCheckedDocIds,
  getCompareSchemeIds,
  getSavedSchemeIds,
  toggleCheckedDocId,
  toggleCompareSchemeId,
  toggleSavedSchemeId,
} from '@/lib/storage/local';
import { cn } from '@/lib/utils';
import { getTTSAdapter } from '@/lib/voice';

export interface SchemeCardProps {
  scheme: Scheme;
  evaluation?: EligibilityEvaluation;
  citationId?: string;
  defaultExpanded?: boolean;
}

function extractAnnualBenefit(scheme: Scheme): number {
  const en = (scheme.benefitHighlight.en || '').toLowerCase();
  if (en.includes('5 lakh')) return 500000;
  if (en.includes('3 lakh')) return 300000;
  if (en.includes('2.5 lakh')) return 250000;
  if (en.includes('1.5 lakh')) return 150000;
  if (en.includes('1.2 lakh')) return 120000;
  if (en.includes('1,500 / month') || en.includes('1500 / month')) return 18000;
  if (en.includes('6,000')) return 6000;
  if (en.includes('30,000')) return 30000;
  if (en.includes('20,000')) return 20000;
  if (en.includes('50,000')) return 50000;
  if (en.includes('10,000')) return 10000;
  if (en.includes('3,000')) return 3000;
  if (en.includes('1,000 / month')) return 12000;
  return 10000;
}

export function SchemeCard({
  scheme,
  evaluation,
  citationId,
  defaultExpanded = false,
}: SchemeCardProps) {
  const { lang, t } = useI18n();
  const c = t.chat.schemeCard;

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [saved, setSaved] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSaved(getSavedSchemeIds().includes(scheme.id));
      setComparing(getCompareSchemeIds().includes(scheme.id));
      setCheckedDocs(getCheckedDocIds());
      setApplied(getAppliedSchemeIds().includes(scheme.id));
    };
    sync();
    window.addEventListener('yojanamitra:storage', sync);
    return () => window.removeEventListener('yojanamitra:storage', sync);
  }, [scheme.id]);

  const handleTrackApplication = async () => {
    if (applied || applying) return;
    setApplying(true);
    addAppliedSchemeId(scheme.id);
    setApplied(true);
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeId: scheme.id,
          schemeName: scheme.name,
          category: scheme.category,
          benefitType: scheme.benefitType,
          benefitHighlight: scheme.benefitHighlight,
          estimatedAnnualBenefit: extractAnnualBenefit(scheme),
          status: 'applied',
        }),
      });
    } catch {
      // Offline fallback: already marked in local storage
    } finally {
      setApplying(false);
    }
  };

  const status = evaluation?.status;
  const badgeVariant =
    status === 'eligible'
      ? 'eligible'
      : status === 'not_eligible'
        ? 'ineligible'
        : status
          ? 'likely'
          : 'teal';

  const topStripe =
    status === 'eligible'
      ? 'from-emerald-500 to-teal-500'
      : status === 'not_eligible'
        ? 'from-rose-500 to-red-600'
        : status
          ? 'from-amber-400 to-orange-500'
          : 'from-[#0D5C63] to-[#D45015]';

  const statusLabel =
    status === 'eligible'
      ? c.eligible
      : status === 'likely'
        ? c.likely
        : status === 'missing_info'
          ? c.missingInfo
          : status === 'not_eligible'
            ? c.notEligible
            : null;

  const handleSave = () => {
    const next = toggleSavedSchemeId(scheme.id);
    setSaved(next.includes(scheme.id));
  };

  const handleCompare = () => {
    const next = toggleCompareSchemeId(scheme.id);
    setComparing(next.includes(scheme.id));
  };

  const handleToggleDoc = (docId: string) => {
    const next = toggleCheckedDocId(docId);
    setCheckedDocs(next);
  };

  const handleReadAloud = () => {
    const tts = getTTSAdapter();
    if (speaking) {
      tts.stop();
      setSpeaking(false);
      return;
    }
    const text = [
      scheme.name[lang],
      scheme.benefitHighlight[lang],
      scheme.summary[lang],
      evaluation?.localized.matchedReasons[lang]?.join('. ') ?? '',
      `${c.helpline}: ${scheme.helpline}`,
    ]
      .filter(Boolean)
      .join('. ');
    setSpeaking(true);
    tts.speak(text, lang, () => setSpeaking(false));
  };

  const whatsappText = encodeURIComponent(
    [
      `*${scheme.name[lang]}*`,
      `${scheme.benefitHighlight[lang]}`,
      `${scheme.summary[lang]}`,
      `${c.documents}: ${scheme.documents.map((d) => d.name[lang]).join(', ')}`,
      `${c.helpline}: ${scheme.helpline}`,
      `${c.applyOfficial}: ${scheme.officialUrl}`,
      `— via YojanaMitra`,
    ].join('\n')
  );

  const matchedReasons = evaluation?.localized.matchedReasons[lang] ?? [];
  const failedReasons = evaluation?.localized.failedReasons[lang] ?? [];

  return (
    <Card className="overflow-hidden hover:-translate-y-0.5 hover:shadow-lg">
      {/* Status Accent Top Rail */}
      <div className={cn('h-1.5 w-full bg-gradient-to-r', topStripe)} />

      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusLabel && (
              <Badge variant={badgeVariant} className="px-3 py-1">
                {status === 'eligible' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {status === 'not_eligible' && <XCircle className="h-3.5 w-3.5" />}
                {(status === 'likely' || status === 'missing_info') && (
                  <HelpCircle className="h-3.5 w-3.5" />
                )}
                <span>{statusLabel}</span>
              </Badge>
            )}
            <Badge variant={scheme.level === 'state' ? 'saffron' : 'teal'}>
              {scheme.level === 'state' ? `${c.stateBadge} · ${scheme.state}` : c.centralBadge}
            </Badge>
            {citationId && (
              <Badge variant="default" className="font-mono">
                [{citationId}]
              </Badge>
            )}
            {applied && (
              <Badge
                variant="teal"
                className="gap-1 border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{lang === 'mr' ? 'अर्ज नोंदवला' : lang === 'hi' ? 'आवेदन दर्ज' : 'Applied'}</span>
              </Badge>
            )}
          </div>
          <span className="text-xs font-medium text-[var(--fg-muted)]">
            {t.trustBannerVerified} {scheme.lastVerified}
          </span>
        </div>

        <h3 className="font-display text-lg font-extrabold leading-snug tracking-tight text-[var(--fg-primary)] sm:text-xl">
          {scheme.name[lang]}
        </h3>

        {/* Highlighted Benefit Pill */}
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--accent-teal)]/20 bg-gradient-to-r from-[var(--accent-teal-soft)] to-transparent px-4 py-3 text-sm font-bold text-[var(--accent-teal)] sm:text-base">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-teal)] text-white dark:text-[#041B19]">
            <IndianRupee className="h-4 w-4" />
          </span>
          <span>{scheme.benefitHighlight[lang]}</span>
        </div>

        <p className="text-sm leading-relaxed text-[var(--fg-secondary)] sm:text-base">
          {scheme.summary[lang]}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {matchedReasons.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-[var(--status-eligible-bg)] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[var(--status-eligible-fg)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{c.whyQualify}</span>
            </div>
            <ul className="space-y-1 text-sm text-[var(--fg-primary)]">
              {matchedReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {failedReasons.length > 0 && (
          <div className="rounded-xl border border-red-500/25 bg-[var(--status-ineligible-bg)] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[var(--status-ineligible-fg)]">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{c.whyNot}</span>
            </div>
            <ul className="space-y-1 text-sm text-[var(--fg-primary)]">
              {failedReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {scheme.needsVerification && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-[var(--status-likely-bg)] p-3 text-xs font-medium text-[var(--status-likely-fg)] sm:text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{c.needsVerificationNote}</span>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/70 px-4 py-2.5 text-left text-sm font-bold text-[var(--fg-primary)] transition-colors hover:border-[var(--accent-teal)]/40 hover:bg-[var(--bg-surface-muted)]"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-[var(--accent-teal)]" />
              <span>
                {expanded ? c.hideDetails : c.viewDetails} ({scheme.documents.length}{' '}
                {c.documents.toLowerCase()})
              </span>
            </span>
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 p-4 sm:p-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {t.saved.compareFields.benefit}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-primary)]">
                  {scheme.benefits[lang]}
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {c.documents}
                </h4>
                <ul className="space-y-1.5">
                  {scheme.documents.map((doc) => {
                    const isChecked = checkedDocs.includes(doc.id);
                    return (
                      <li key={doc.id}>
                        <label className="flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-xl p-1.5 text-sm transition-colors hover:bg-[var(--bg-surface)]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDoc(doc.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent-teal)]"
                          />
                          <span className={isChecked ? 'line-through opacity-65' : 'font-medium'}>
                            {doc.name[lang]}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {c.howToApply}
                </h4>
                <ol className="relative space-y-3 border-l-2 border-[var(--accent-teal)]/25 pl-5">
                  {scheme.applicationSteps[lang].map((step, i) => (
                    <li key={i} className="relative text-sm text-[var(--fg-primary)]">
                      <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-teal)] text-xs font-bold text-white dark:text-[#041B19]">
                        {i + 1}
                      </span>
                      <span className="block pt-0.5 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--fg-muted)]">
                    <Calendar className="h-3.5 w-3.5 text-[var(--accent-teal)]" />
                    <span>{c.deadlines}</span>
                  </div>
                  <p className="mt-1 text-[var(--fg-primary)]">{scheme.deadlines[lang]}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--fg-muted)]">
                    <Phone className="h-3.5 w-3.5 text-[var(--accent-saffron)]" />
                    <span>{c.helpline}</span>
                  </div>
                  <p className="mt-1 font-bold text-[var(--fg-primary)]">{scheme.helpline}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="no-print flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/35 pt-4">
        <Button asChild variant="primary" size="sm" className="flex-1 sm:flex-none">
          <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer">
            <span>{c.applyOfficial}</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>

        <Button
          type="button"
          variant={applied ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => void handleTrackApplication()}
          disabled={applying}
          aria-pressed={applied}
          className={cn(applied && 'border-emerald-500/40 text-emerald-800 dark:text-emerald-300')}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>
            {applied
              ? lang === 'mr'
                ? 'अर्ज नोंदवला'
                : lang === 'hi'
                  ? 'आवेदन दर्ज'
                  : 'Applied'
              : lang === 'mr'
                ? 'अर्ज ट्रॅक करा'
                : lang === 'hi'
                  ? 'आवेदन ट्रैक करें'
                  : 'Track Application'}
          </span>
        </Button>

        <Button
          type="button"
          variant={saved ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleSave}
          aria-pressed={saved}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          <span>{saved ? c.saved : c.save}</span>
        </Button>

        <Button
          type="button"
          variant={comparing ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleCompare}
          aria-pressed={comparing}
        >
          <GitCompareArrows className="h-4 w-4" />
          <span>{comparing ? c.comparing : c.compare}</span>
        </Button>

        <Button asChild variant="outline" size="sm">
          <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{c.shareWhatsApp}</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReadAloud}
          aria-label={speaking ? t.chat.stopReading : t.chat.readAloud}
        >
          {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span>{speaking ? t.chat.stopReading : t.chat.readAloud}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
