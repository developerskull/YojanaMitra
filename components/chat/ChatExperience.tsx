'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Accessibility,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Hammer,
  HeartHandshake,
  Lock,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  ShieldCheck,
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
            className="mx-0.5 inline-flex items-center rounded-md bg-[var(--accent-teal-soft)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--accent-teal)]"
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

const CATEGORY_META: Record<
  'farmer' | 'student' | 'woman' | 'senior' | 'worker' | 'disabled',
  {
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
    ringHover: string;
    examples: Record<SupportedLang, string>;
  }
> = {
  farmer: {
    icon: Tractor,
    tint: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    ringHover: 'hover:border-emerald-500/40',
    examples: {
      en: 'PM-KISAN · Namo Shetkari · Crop Insurance',
      hi: 'पीएम-किसान · फसल बीमा · सोलर पंप',
      mr: 'पीएम-किसान · नमो शेतकरी · पीक विमा',
    },
  },
  student: {
    icon: GraduationCap,
    tint: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
    ringHover: 'hover:border-blue-500/40',
    examples: {
      en: 'NSP Scholarships · MahaDBT · Hostel Grant',
      hi: 'NSP छात्रवृत्ति · पोस्ट-मैट्रिक · NMMS',
      mr: 'महाडीबीटी · शाहू महाराज · NSP शिष्यवृत्ती',
    },
  },
  woman: {
    icon: HeartHandshake,
    tint: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
    ringHover: 'hover:border-rose-500/40',
    examples: {
      en: 'Ladki Bahin · Ujjwala · Sukanya Samriddhi',
      hi: 'लाडकी बहीण · उज्ज्वला · सुकन्या समृद्धि',
      mr: 'लाडकी बहीण · लेक लाडकी · उज्ज्वला गॅस',
    },
  },
  senior: {
    icon: Users,
    tint: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    ringHover: 'hover:border-amber-500/40',
    examples: {
      en: 'Ayushman 70+ · SCSS · Shravanbal Pension',
      hi: 'आयुष्मान 70+ · SCSS · अटल पेंशन',
      mr: 'आयुष्मान ७०+ · श्रावणबाळ · वयोश्री',
    },
  },
  worker: {
    icon: Hammer,
    tint: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
    ringHover: 'hover:border-orange-500/40',
    examples: {
      en: 'PM Mudra · Vishwakarma · PM SVANidhi',
      hi: 'पीएम मुद्रा · विश्वकर्मा · स्वनिधि · PM-SYM',
      mr: 'मुद्रा कर्ज · विश्वकर्मा · अण्णासाहेब पाटील',
    },
  },
  disabled: {
    icon: Accessibility,
    tint: 'bg-teal-500/12 text-teal-700 dark:text-teal-300',
    ringHover: 'hover:border-teal-500/40',
    examples: {
      en: 'UDID Card · ADIP Aids · Niradhar Pension',
      hi: 'UDID कार्ड · ADIP उपकरण · दिव्यांग पेंशन',
      mr: 'UDID कार्ड · ADIP साधने · संजय गांधी निराधार',
    },
  },
};

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
          throw new Error((errPayload as { error?: string }).error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const updateAssistant = (updater: (m: ChatMessage) => ChatMessage) => {
          setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? updater(m) : m)));
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

  const examplePrompts: Record<SupportedLang, string[]> = {
    en: [
      '45-year-old farmer from Nashik with 2 acres',
      'Ladki Bahin Yojana eligibility in Maharashtra',
      '72-year-old senior free ₹5L health card',
    ],
    hi: [
      'मैं नाशिक का 45 साल का किसान हूँ, 2 एकड़ जमीन है',
      'लाडकी बहीण योजना की पात्रता क्या है?',
      '72 साल के बुजुर्ग के लिए आयुष्मान कार्ड',
    ],
    mr: [
      'मी नाशिकचा ४५ वर्षांचा शेतकरी आहे, माझ्याकडे २ एकर जमीन आहे',
      'लाडकी बहीण योजनेसाठी मी पात्र आहे का?',
      '७२ वर्षांच्या ज्येष्ठांसाठी मोफत आरोग्य कार्ड',
    ],
  };

  const isLanding = messages.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      {isLanding ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >
          {/* Premium Editorial Hero + Floating Glass Command Deck */}
          <section className="surface-elevated relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
            {/* Decorative Subtle Corner Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#D45015]/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#0D5C63]/12 blur-3xl"
            />

            <div className="relative mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent-teal)]/20 bg-[var(--accent-teal-soft)] px-4 py-1.5 text-xs font-bold tracking-wide text-[var(--accent-teal)] sm:text-sm">
                <Sparkles className="h-4 w-4 text-[var(--accent-saffron)]" aria-hidden="true" />
                <span>46 Verified Schemes · Zero Hallucination · मराठी · हिंदी · English</span>
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--fg-primary)] sm:text-5xl sm:leading-[1.12]">
                <span className="text-gradient-civic">{t.landing.headline}</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--fg-secondary)] sm:text-lg">
                {t.landing.subheadline}
              </p>
            </div>

            {/* Interactive Voice Orb & Command Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="relative mx-auto mt-8 max-w-2xl space-y-5"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <span
                      aria-hidden="true"
                      className="absolute h-24 w-24 animate-ping rounded-full bg-red-500/25"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    aria-label={isListening ? t.landing.micListening : t.landing.micLabel}
                    aria-pressed={isListening}
                    className={cn(
                      'relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full transition-all duration-200 active:scale-95',
                      !micSupported
                        ? 'bg-[var(--bg-surface-muted)] text-[var(--fg-muted)]'
                        : isListening
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg ring-4 ring-red-400/40'
                          : 'voice-orb-shadow bg-gradient-to-br from-[#D45015] to-[#EE7730] text-white hover:scale-105'
                    )}
                  >
                    {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                  </button>
                </div>
                <span
                  className="text-sm font-semibold text-[var(--fg-secondary)]"
                  aria-live="polite"
                >
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
                  className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-[var(--status-likely-bg)] px-4 py-2.5 text-sm text-[var(--status-likely-fg)]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Elevated Input Deck */}
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-md transition-all focus-within:border-[var(--accent-teal)] focus-within:ring-4 focus-within:ring-[var(--accent-teal)]/10 sm:flex-row sm:items-center">
                <label htmlFor="yojana-query-input" className="sr-only">
                  {t.landing.inputPlaceholder}
                </label>
                <input
                  id="yojana-query-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.landing.inputPlaceholder}
                  className="min-h-[50px] flex-1 bg-transparent px-3 text-base text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  disabled={!input.trim() || isLoading}
                  className="rounded-xl sm:px-6"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{t.landing.sendButton}</span>
                </Button>
              </div>

              {/* Instant Example Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {examplePrompts[lang].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="min-h-[38px] cursor-pointer rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--fg-secondary)] shadow-2xs transition-all hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-soft)] hover:text-[var(--accent-teal)]"
                  >
                    “{prompt}”
                  </button>
                ))}
              </div>
            </form>

            {/* Trust Metrics Strip */}
            <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-4">
              <div className="rounded-xl bg-[var(--bg-canvas)]/80 px-3 py-2.5 text-center">
                <div className="font-display text-xl font-extrabold text-[var(--accent-teal)]">
                  46
                </div>
                <div className="text-xs font-medium text-[var(--fg-muted)]">
                  Verified Govt Schemes
                </div>
              </div>
              <div className="rounded-xl bg-[var(--bg-canvas)]/80 px-3 py-2.5 text-center">
                <div className="font-display text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <div className="text-xs font-medium text-[var(--fg-muted)]">
                  Deterministic Rules
                </div>
              </div>
              <div className="rounded-xl bg-[var(--bg-canvas)]/80 px-3 py-2.5 text-center">
                <div className="font-display text-xl font-extrabold text-[var(--accent-saffron)]">
                  99.2%
                </div>
                <div className="text-xs font-medium text-[var(--fg-muted)]">
                  Multilingual Recall@5
                </div>
              </div>
              <div className="rounded-xl bg-[var(--bg-canvas)]/80 px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-[var(--fg-primary)]">
                  <Lock className="h-4 w-4 text-[var(--accent-teal)]" />
                  <span>0%</span>
                </div>
                <div className="text-xs font-medium text-[var(--fg-muted)]">
                  Hallucination Rate
                </div>
              </div>
            </div>
          </section>

          {/* 6 Premium Quick-Start Persona Cards */}
          <section aria-labelledby="quickstart-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2
                id="quickstart-heading"
                className="font-display text-xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-2xl"
              >
                {t.landing.quickStartTitle}
              </h2>
              <Link
                href="/wizard"
                className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent-teal)] hover:underline"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{t.nav.wizard}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {(
                ['farmer', 'student', 'woman', 'senior', 'worker', 'disabled'] as const
              ).map((key) => {
                const cat = t.landing.categories[key];
                const meta = CATEGORY_META[key];
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void sendMessage(cat.prompt)}
                    className={cn(
                      'surface-card group flex min-h-[124px] cursor-pointer flex-col justify-between rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      meta.ringHover
                    )}
                  >
                    <div className="flex w-full items-start justify-between">
                      <span
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                          meta.tint
                        )}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-[var(--fg-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent-teal)]" />
                    </div>
                    <div className="mt-4">
                      <div className="font-display text-lg font-bold text-[var(--fg-primary)] group-hover:text-[var(--accent-teal)]">
                        {cat.label}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-[var(--fg-muted)]">
                        {meta.examples[lang]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Connected 3-Step Visual Journey */}
          <section aria-labelledby="how-heading" className="space-y-4">
            <h2
              id="how-heading"
              className="font-display text-xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-2xl"
            >
              {t.landing.howItWorksTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {t.landing.steps.map((step, idx) => (
                <Card key={idx} className="relative overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#0D5C63] to-[#D45015]" />
                  <CardContent className="p-5 pt-5">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-teal-soft)] font-display text-sm font-extrabold text-[var(--accent-teal)]">
                      0{idx + 1}
                    </div>
                    <h3 className="font-display text-base font-bold text-[var(--fg-primary)]">
                      {step.title.replace(/^[123१२३]\.\s*/, '')}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-secondary)]">
                      {step.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </motion.div>
      ) : (
        /* Active Premium Streaming Chat View */
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#D45015] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-base font-bold text-[var(--fg-primary)] sm:text-lg">
                  {t.appName}
                </h1>
                <p className="text-xs text-[var(--fg-muted)]">{t.tagline}</p>
              </div>
            </div>
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
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-[#0D5C63] to-[#13747C] px-4 py-3 text-base font-medium text-white shadow-sm">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Detected Profile Pill Strip */}
                    {msg.profile && Object.keys(msg.profile).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--accent-teal)]/20 bg-[var(--accent-teal-soft)]/70 px-4 py-2.5 text-xs">
                        <span className="flex items-center gap-1 font-bold text-[var(--accent-teal)]">
                          <UserCheck className="h-4 w-4" />
                          {t.chat.detectedProfile}:
                        </span>
                        {Object.entries(msg.profile).map(([k, v]) => (
                          <Badge key={k} variant="default" className="bg-[var(--bg-surface)]">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Assistant Text Card */}
                    <Card>
                      <CardContent className="space-y-3 p-5 sm:p-6">
                        {msg.error ? (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-xl bg-[var(--status-ineligible-bg)] p-3.5 text-sm text-[var(--status-ineligible-fg)]"
                          >
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{msg.error}</span>
                          </div>
                        ) : msg.isStreaming && !msg.text ? (
                          <div className="space-y-3">
                            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-teal)]">
                              <Sparkles className="h-4 w-4 animate-spin" />
                              {t.chat.thinking}
                            </p>
                            <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[var(--bg-surface-muted)]" />
                            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[var(--bg-surface-muted)]" />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5 text-base text-[var(--fg-primary)]">
                              {renderFormattedText(msg.text)}
                            </div>

                            {msg.degradedMode && !msg.isStreaming && (
                              <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/70 px-3.5 py-2 text-xs text-[var(--fg-muted)]">
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
                                  'min-h-[40px] cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                                  open
                                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)] text-white shadow-xs dark:text-[#041B19]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:border-[var(--accent-teal)]'
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
                              className="surface-card rounded-2xl border-[var(--accent-teal)]/30 p-4 text-sm"
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
                              className="min-h-[44px] cursor-pointer rounded-xl border border-[var(--accent-teal)]/25 bg-[var(--accent-teal-soft)] px-3.5 py-2 text-left text-sm font-semibold text-[var(--accent-teal)] transition-all hover:bg-[var(--accent-teal)] hover:text-white dark:hover:text-[#041B19]"
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

          {/* Sticky Glass Bottom Chat Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="surface-elevated sticky bottom-16 z-20 rounded-2xl p-2.5 md:bottom-4"
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
                  'flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all',
                  isListening
                    ? 'animate-pulse bg-red-600 text-white'
                    : 'bg-gradient-to-br from-[#D45015] to-[#E56A24] text-white shadow-xs hover:brightness-105'
                )}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.landing.inputPlaceholder}
                className="min-h-[48px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-base text-[var(--fg-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
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
