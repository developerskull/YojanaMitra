'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Accessibility,
  AlertCircle,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Hammer,
  HeartHandshake,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Tractor,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { EligibilityEvaluation } from '@/lib/eligibility/engine';
import { useI18n } from '@/lib/i18n/context';
import type { CitationItem } from '@/lib/rag';
import type { Scheme, SupportedLang, UserProfile } from '@/lib/schemes/schema';
import { getStoredProfile, setStoredProfile } from '@/lib/storage/local';
import { cn } from '@/lib/utils';
import { getSTTAdapter, getTTSAdapter } from '@/lib/voice';

interface MatchedSchemeItem {
  scheme: Scheme;
  citationId: string;
  eligibility: EligibilityEvaluation;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  lang?: SupportedLang;
  profile?: UserProfile;
  schemes?: MatchedSchemeItem[];
  citations?: CitationItem[];
  followups?: string[];
  degradedMode?: boolean;
  isStreaming?: boolean;
  error?: string;
}

function renderFormattedText(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;

    // Parse **bold** and [S1] citation tags safely without dangerouslySetInnerHTML
    const parts = line.split(/(\*\*[^*]+\*\*|\[S\d+\])/g);
    const rendered = parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-[var(--fg-primary)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^\[S\d+\]$/.test(part)) {
        return (
          <span
            key={idx}
            className="mx-0.5 inline-flex items-center rounded bg-[var(--accent-teal-soft)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--accent-teal)]"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });

    if (trimmed.startsWith('- ')) {
      return (
        <p key={i} className="pl-3 leading-relaxed">
          {rendered}
        </p>
      );
    }
    return (
      <p key={i} className="leading-relaxed">
        {rendered}
      </p>
    );
  });
}

export function ChatExperience() {
  const { lang, setLang, t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [expandedCitationKey, setExpandedCitationKey] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stt = getSTTAdapter();
    setMicSupported(stt.isSupported());
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isLoading) return;

      setVoiceError(null);
      setInput('');
      setIsLoading(true);

      const userMsgId = `u-${Date.now()}`;
      const assistantMsgId = `a-${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', text },
        { id: assistantMsgId, role: 'assistant', text: '', isStreaming: true },
      ]);

      try {
        const savedProfile = getStoredProfile();
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            preferredLang: lang,
            profile: savedProfile,
          }),
        });

        if (!res.ok || !res.body) {
          const errPayload = await res.json().catch(() => ({}));
          throw new Error(
            (errPayload as { error?: string }).error || `HTTP ${res.status}`
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const updateAssistant = (updater: (m: ChatMessage) => ChatMessage) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? updater(m) : m))
          );
        };

        const processEventBlock = (block: string) => {
          const lines = block.split('\n');
          let eventName = 'message';
          let dataStr = '';
          for (const l of lines) {
            if (l.startsWith('event:')) eventName = l.slice(6).trim();
            if (l.startsWith('data:')) dataStr += l.slice(5).trim();
          }
          if (!dataStr) return;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataStr) as Record<string, unknown>;
          } catch {
            return;
          }

          if (eventName === 'profile') {
            const p = payload.profile as UserProfile | undefined;
            const detectedLang = payload.lang as SupportedLang | undefined;
            if (detectedLang && detectedLang !== lang) {
              setLang(detectedLang);
            }
            if (p && Object.keys(p).length > 0) {
              setStoredProfile({ ...getStoredProfile(), ...p });
            }
            updateAssistant((m) => ({ ...m, profile: p, lang: detectedLang }));
          } else if (eventName === 'schemes') {
            const schemes = payload.schemes as MatchedSchemeItem[] | undefined;
            updateAssistant((m) => ({ ...m, schemes }));
          } else if (eventName === 'citations') {
            const citations = payload.citations as CitationItem[] | undefined;
            updateAssistant((m) => ({ ...m, citations }));
          } else if (eventName === 'token') {
            const chunk = String(payload.text ?? '');
            updateAssistant((m) => ({ ...m, text: m.text + chunk }));
          } else if (eventName === 'followups') {
            const followups = payload.followups as string[] | undefined;
            updateAssistant((m) => ({ ...m, followups }));
          } else if (eventName === 'done') {
            updateAssistant((m) => ({
              ...m,
              isStreaming: false,
              degradedMode: Boolean(payload.degradedMode),
            }));
          } else if (eventName === 'error') {
            updateAssistant((m) => ({
              ...m,
              isStreaming: false,
              error: String(payload.message ?? t.chat.errorFallback),
            }));
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? '';
          for (const b of blocks) {
            if (b.trim()) processEventBlock(b);
          }
        }
        if (buffer.trim()) processEventBlock(buffer);

        updateAssistant((m) => ({ ...m, isStreaming: false }));
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  error: err instanceof Error ? err.message : t.chat.errorFallback,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, lang, setLang, t.chat.errorFallback]
  );

  const handleToggleMic = () => {
    const stt = getSTTAdapter();
    if (!stt.isSupported()) {
      setMicSupported(false);
      setVoiceError(t.landing.micUnsupported);
      return;
    }

    if (isListening) {
      stt.stop();
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    setIsListening(true);

    stt.start(lang, {
      onInterim: (transcript) => setInput(transcript),
      onFinal: (transcript) => {
        setInput(transcript);
        setIsListening(false);
        void sendMessage(transcript);
      },
      onError: (_code, msg) => {
        setVoiceError(msg);
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    const tts = getTTSAdapter();
    if (speakingMsgId === msg.id) {
      tts.stop();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(msg.id);
    tts.speak(msg.text, msg.lang ?? lang, () => setSpeakingMsgId(null));
  };

  const handleReset = () => {
    getTTSAdapter().stop();
    setSpeakingMsgId(null);
    setMessages([]);
    setInput('');
    setVoiceError(null);
  };

  const quickCategories = [
    { key: 'farmer' as const, icon: Tractor, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300' },
    { key: 'student' as const, icon: GraduationCap, color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300' },
    { key: 'woman' as const, icon: HeartHandshake, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300' },
    { key: 'senior' as const, icon: Users, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300' },
    { key: 'worker' as const, icon: Hammer, color: 'text-orange-700 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-300' },
    { key: 'disabled' as const, icon: Accessibility, color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300' },
  ];

  const isLanding = messages.length === 0;

  return (
    <div className="mx-auto max-w-4xl">
      {isLanding ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {/* Hero Section */}
          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs sm:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-saffron-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-saffron)] sm:text-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>मराठी · हिंदी · English</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-4xl">
                {t.landing.headline}
              </h1>
              <p className="mt-3 text-base text-[var(--fg-secondary)]">
                {t.landing.subheadline}
              </p>
            </div>

            {/* Big Mic Button + Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="mx-auto mt-6 max-w-2xl space-y-3"
            >
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  aria-label={isListening ? t.landing.micListening : t.landing.micLabel}
                  aria-pressed={isListening}
                  className={cn(
                    'flex h-16 w-16 cursor-pointer items-center justify-center rounded-full shadow-md transition-transform active:scale-95',
                    !micSupported
                      ? 'bg-[var(--bg-surface-muted)] text-[var(--fg-muted)]'
                      : isListening
                        ? 'animate-pulse bg-red-600 text-white ring-4 ring-red-300'
                        : 'bg-[var(--accent-saffron)] text-white hover:bg-[var(--accent-saffron-hover)]'
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-7 w-7" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </button>
                <span className="text-sm font-medium text-[var(--fg-secondary)]" aria-live="polite">
                  {!micSupported
                    ? t.landing.micUnsupported
                    : isListening
                      ? t.landing.micListening
                      : t.landing.micLabel}
                </span>
              </div>

              {voiceError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-[var(--status-likely-bg)] px-3.5 py-2 text-sm text-[var(--status-likely-fg)]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="yojana-query-input" className="sr-only">
                  {t.landing.inputPlaceholder}
                </label>
                <input
                  id="yojana-query-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.landing.inputPlaceholder}
                  className="min-h-[54px] flex-1 rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 text-base text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:border-[var(--accent-teal)] focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  disabled={!input.trim() || isLoading}
                  className="rounded-2xl sm:px-6"
                >
                  <Send className="h-5 w-5" aria-hidden="true" />
                  <span>{t.landing.sendButton}</span>
                </Button>
              </div>
            </form>
          </section>

          {/* 6 Quick-Start Category Cards */}
          <section aria-labelledby="quickstart-heading">
            <h2
              id="quickstart-heading"
              className="mb-3 text-lg font-bold text-[var(--fg-primary)] sm:text-xl"
            >
              {t.landing.quickStartTitle}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickCategories.map(({ key, icon: Icon, color }) => {
                const cat = t.landing.categories[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void sendMessage(cat.prompt)}
                    className="group flex min-h-[104px] cursor-pointer flex-col items-start justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:border-[var(--accent-teal)] hover:shadow-sm"
                  >
                    <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', color)}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="mt-3 text-base font-bold text-[var(--fg-primary)] group-hover:text-[var(--accent-teal)]">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* How It Works 3-Step Strip */}
          <section aria-labelledby="how-heading">
            <h2
              id="how-heading"
              className="mb-3 text-lg font-bold text-[var(--fg-primary)] sm:text-xl"
            >
              {t.landing.howItWorksTitle}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {t.landing.steps.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="p-5">
                    <h3 className="text-base font-bold text-[var(--accent-teal)]">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-[var(--fg-secondary)]">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </motion.div>
      ) : (
        /* Active Chat View */
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-[var(--fg-primary)] sm:text-xl">
              {t.appName}
            </h1>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              <span>{t.chat.newChat}</span>
            </Button>
          </div>

          <div className="space-y-6" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--accent-teal)] px-4 py-3 text-base text-white shadow-xs">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Detected Profile Pill Strip */}
                    {msg.profile && Object.keys(msg.profile).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs">
                        <span className="flex items-center gap-1 font-semibold text-[var(--accent-teal)]">
                          <UserCheck className="h-4 w-4" />
                          {t.chat.detectedProfile}:
                        </span>
                        {Object.entries(msg.profile).map(([k, v]) => (
                          <Badge key={k} variant="default">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Assistant Text Card */}
                    <Card>
                      <CardContent className="space-y-3 p-5">
                        {msg.error ? (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-xl bg-[var(--status-ineligible-bg)] p-3.5 text-sm text-[var(--status-ineligible-fg)]"
                          >
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{msg.error}</span>
                          </div>
                        ) : msg.isStreaming && !msg.text ? (
                          <div className="space-y-2.5">
                            <p className="text-sm font-medium text-[var(--accent-teal)]">
                              {t.chat.thinking}
                            </p>
                            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-surface-muted)]" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-surface-muted)]" />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5 text-base text-[var(--fg-primary)]">
                              {renderFormattedText(msg.text)}
                            </div>

                            {msg.degradedMode && !msg.isStreaming && (
                              <p className="rounded-lg bg-[var(--bg-surface-muted)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                                {t.chat.degradedNotice}
                              </p>
                            )}

                            {!msg.isStreaming && msg.text && (
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSpeakMessage(msg)}
                                >
                                  {speakingMsgId === msg.id ? (
                                    <VolumeX className="h-4 w-4" />
                                  ) : (
                                    <Volume2 className="h-4 w-4" />
                                  )}
                                  <span>
                                    {speakingMsgId === msg.id
                                      ? t.chat.stopReading
                                      : t.chat.readAloud}
                                  </span>
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Expandable Source Citation Chips */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{t.chat.sourcesTitle}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cit) => {
                            const key = `${msg.id}-${cit.id}`;
                            const open = expandedCitationKey === key;
                            return (
                              <button
                                key={cit.id}
                                type="button"
                                onClick={() => setExpandedCitationKey(open ? null : key)}
                                aria-expanded={open}
                                className={cn(
                                  'min-h-[40px] cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                                  open
                                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)] text-white'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]'
                                )}
                              >
                                [{cit.id}] {cit.schemeName}
                              </button>
                            );
                          })}
                        </div>
                        {msg.citations.map((cit) => {
                          const key = `${msg.id}-${cit.id}`;
                          if (expandedCitationKey !== key) return null;
                          return (
                            <div
                              key={key}
                              className="rounded-xl border border-[var(--accent-teal)]/30 bg-[var(--bg-surface)] p-4 text-sm shadow-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-[var(--accent-teal)]">
                                  [{cit.id}] {cit.schemeName}
                                </span>
                                <a
                                  href={cit.officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[var(--accent-saffron)] hover:underline"
                                >
                                  <span>{cit.officialUrl}</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                              <p className="mt-2 text-[var(--fg-secondary)]">{cit.snippet}</p>
                              <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
                                {t.trustBannerVerified} {cit.lastVerified}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Matched Scheme Cards */}
                    {msg.schemes && msg.schemes.length > 0 && (
                      <div className="space-y-4">
                        {msg.schemes.map((item, idx) => (
                          <SchemeCard
                            key={item.scheme.id}
                            scheme={item.scheme}
                            evaluation={item.eligibility}
                            citationId={item.citationId}
                            defaultExpanded={idx === 0}
                          />
                        ))}
                      </div>
                    )}

                    {/* Suggested Follow-up Chips */}
                    {msg.followups && msg.followups.length > 0 && !msg.isStreaming && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                          {t.chat.followupsTitle}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.followups.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => void sendMessage(q)}
                              className="min-h-[44px] cursor-pointer rounded-xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal-soft)] px-3.5 py-2 text-left text-sm font-medium text-[var(--accent-teal)] transition-colors hover:bg-[var(--accent-teal)] hover:text-white"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Sticky Bottom Chat Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="sticky bottom-16 z-20 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-2.5 shadow-md backdrop-blur-md md:bottom-4"
          >
            {voiceError && (
              <p className="mb-2 px-2 text-xs text-amber-700 dark:text-amber-300">{voiceError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMic}
                aria-label={isListening ? t.landing.micListening : t.landing.micLabel}
                className={cn(
                  'flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors',
                  isListening
                    ? 'animate-pulse bg-red-600 text-white'
                    : 'bg-[var(--accent-saffron-soft)] text-[var(--accent-saffron)] hover:bg-[var(--accent-saffron)] hover:text-white'
                )}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.landing.inputPlaceholder}
                className="min-h-[48px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 text-base text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                disabled={!input.trim() || isLoading}
                aria-label={t.landing.sendButton}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
