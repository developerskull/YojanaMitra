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
  Phone,
  Share2,
  Volume2,
  VolumeX,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { EligibilityEvaluation } from '@/lib/eligibility/engine';
import { useI18n } from '@/lib/i18n/context';
import type { Scheme } from '@/lib/schemes/schema';
import {
  getCheckedDocIds,
  getCompareSchemeIds,
  getSavedSchemeIds,
  toggleCheckedDocId,
  toggleCompareSchemeId,
  toggleSavedSchemeId,
} from '@/lib/storage/local';
import { getTTSAdapter } from '@/lib/voice';

export interface SchemeCardProps {
  scheme: Scheme;
  evaluation?: EligibilityEvaluation;
  citationId?: string;
  defaultExpanded?: boolean;
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

  useEffect(() => {
    const sync = () => {
      setSaved(getSavedSchemeIds().includes(scheme.id));
      setComparing(getCompareSchemeIds().includes(scheme.id));
      setCheckedDocs(getCheckedDocIds());
    };
    sync();
    window.addEventListener('yojanamitra:storage', sync);
    return () => window.removeEventListener('yojanamitra:storage', sync);
  }, [scheme.id]);

  const status = evaluation?.status;
  const badgeVariant =
    status === 'eligible'
      ? 'eligible'
      : status === 'not_eligible'
        ? 'ineligible'
        : status
          ? 'likely'
          : 'teal';

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
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="gap-2.5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusLabel && (
              <Badge variant={badgeVariant}>
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
          </div>
          <span className="text-xs text-[var(--fg-muted)]">
            {t.trustBannerVerified} {scheme.lastVerified}
          </span>
        </div>

        <h3 className="text-lg font-bold leading-snug text-[var(--fg-primary)] sm:text-xl">
          {scheme.name[lang]}
        </h3>

        {/* Highlighted Benefit Pill */}
        <div className="rounded-xl border border-[var(--accent-teal)]/20 bg-[var(--accent-teal-soft)] px-3.5 py-2.5 text-sm font-semibold text-[var(--accent-teal)] sm:text-base">
          {scheme.benefitHighlight[lang]}
        </div>

        <p className="text-sm leading-relaxed text-[var(--fg-secondary)] sm:text-base">
          {scheme.summary[lang]}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deterministic Eligibility Reasons */}
        {matchedReasons.length > 0 && (
          <div className="rounded-xl border border-emerald-600/20 bg-[var(--status-eligible-bg)]/60 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--status-eligible-fg)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{c.whyQualify}</span>
            </div>
            <ul className="space-y-1 text-sm text-[var(--fg-primary)]">
              {matchedReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {failedReasons.length > 0 && (
          <div className="rounded-xl border border-red-600/20 bg-[var(--status-ineligible-bg)]/60 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--status-ineligible-fg)]">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{c.whyNot}</span>
            </div>
            <ul className="space-y-1 text-sm text-[var(--fg-primary)]">
              {failedReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {scheme.needsVerification && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-[var(--status-likely-bg)]/70 p-3 text-xs font-medium text-[var(--status-likely-fg)] sm:text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{c.needsVerificationNote}</span>
          </div>
        )}

        {/* Expandable Documents & Steps */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--fg-primary)] transition-colors hover:bg-[var(--border-subtle)]/40"
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
            <div className="mt-3 space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              {/* Full Benefits */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {t.saved.compareFields.benefit}
                </h4>
                <p className="mt-1 text-sm text-[var(--fg-primary)]">{scheme.benefits[lang]}</p>
              </div>

              {/* Interactive Documents Checklist */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {c.documents}
                </h4>
                <ul className="space-y-2">
                  {scheme.documents.map((doc) => {
                    const isChecked = checkedDocs.includes(doc.id);
                    return (
                      <li key={doc.id}>
                        <label className="flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-lg p-1.5 text-sm hover:bg-[var(--bg-surface-muted)]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDoc(doc.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent-teal)]"
                          />
                          <span className={isChecked ? 'line-through opacity-70' : ''}>
                            {doc.name[lang]}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Application Steps Timeline */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {c.howToApply}
                </h4>
                <ol className="space-y-2.5">
                  {scheme.applicationSteps[lang].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[var(--fg-primary)]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-teal)] text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Deadlines & Helpline */}
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--fg-muted)]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{c.deadlines}</span>
                  </div>
                  <p className="mt-1 text-[var(--fg-primary)]">{scheme.deadlines[lang]}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--fg-muted)]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{c.helpline}</span>
                  </div>
                  <p className="mt-1 font-semibold text-[var(--fg-primary)]">{scheme.helpline}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Action Buttons (>= 48px touch targets) */}
      <CardFooter className="no-print flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/40 pt-4">
        <Button asChild variant="primary" size="sm" className="flex-1 sm:flex-none">
          <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer">
            <span>{c.applyOfficial}</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
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
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
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
