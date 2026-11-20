'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

type PortalTab = 'user' | 'admin';
type UserMode = 'login' | 'register';
type RegStep = 'form' | 'otp';

export function LoginView() {
  const { lang } = useI18n();
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab: PortalTab = searchParams.get('tab') === 'admin' ? 'admin' : 'user';
  const [portalTab, setPortalTab] = useState<PortalTab>(initialTab);
  const [userMode, setUserMode] = useState<UserMode>('login');
  const [regStep, setRegStep] = useState<RegStep>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Countdown timer for OTP expiry / resend cooldown
  useEffect(() => {
    if (regStep !== 'otp' || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [regStep, countdown]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          name,
          email,
          password,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        demoOtp?: string;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to initiate registration.');
        setSubmitting(false);
        return;
      }

      setDemoOtp(data.demoOtp ?? null);
      setCountdown(120);
      setOtpCode('');
      setRegStep('otp');
      setInfoMessage(data.message ?? 'Verification code sent to your email.');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanCode = otpCode.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email,
          code: cleanCode,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        user?: { role: 'user' | 'admin' };
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Verification failed. Please verify your OTP code.');
        setSubmitting(false);
        return;
      }

      await refresh();
      router.push('/');
    } catch {
      setError('Network error during verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || countdown > 90) return;
    setError(null);
    setResending(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        demoOtp?: string;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to resend code.');
        setResending(false);
        return;
      }

      setDemoOtp(data.demoOtp ?? null);
      setCountdown(120);
      setInfoMessage('A fresh verification code has been generated.');
    } catch {
      setError('Failed to resend code due to a network error.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (portalTab === 'user' && userMode === 'register') {
      return handleStartRegister(e);
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: portalTab }),
      });

      const data = (await res.json()) as {
        error?: string;
        user?: { role: 'user' | 'admin' };
      };

      if (!res.ok) {
        setError(data.error ?? 'Authentication failed. Please check your credentials.');
        setSubmitting(false);
        return;
      }

      await refresh();
      if (data.user?.role === 'admin' || portalTab === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCitizen = () => {
    setPortalTab('user');
    setUserMode('login');
    setRegStep('form');
    setEmail('citizen@yojanamitra.in');
    setPassword('Citizen@1234');
    setError(null);
    setInfoMessage(null);
  };

  const fillDemoAdmin = () => {
    setPortalTab('admin');
    setRegStep('form');
    setEmail('admin@yojanamitra.in');
    setPassword('Admin@1234');
    setError(null);
    setInfoMessage(null);
  };

  const copy = {
    en: {
      title: 'Welcome to YojanaMitra',
      subtitle:
        'Sign in as a Citizen to personalize your experience, or sign in as Admin to monitor all user requests.',
      citizenTab: 'Citizen Login',
      adminTab: 'Admin Login',
      signIn: 'Sign In',
      signUp: 'Create Account',
      guestLink: 'Continue without login (Guest Mode)',
      alreadySignedIn: 'You are currently signed in as',
      goDashboard: 'Open Admin Dashboard',
      goHome: 'Go to Scheme Assistant',
      otpTitle: 'Verify Your Email',
      otpSubtitle: 'Enter the 6-digit verification code sent to',
      otpExpires: 'Code expires in',
      resendCode: 'Resend Code',
      resendWait: 'Resend code in',
      verifyBtn: 'Verify & Activate Account',
      backToForm: 'Edit Registration Details',
      demoChipLabel: 'Demo OTP (Auto-fill)',
      enterOtpLabel: '6-Digit Verification Code',
      otpPlaceholder: '000000',
    },
    hi: {
      title: 'योजनामित्र में आपका स्वागत है',
      subtitle: 'नागरिक के रूप में साइन इन करें, या सभी उपयोगकर्ता अनुरोध देखने के लिए एडमिन लॉगिन करें।',
      citizenTab: 'नागरिक लॉगिन',
      adminTab: 'एडमिन लॉगिन',
      signIn: 'साइन इन करें',
      signUp: 'नया खाता बनाएं',
      guestLink: 'बिना लॉगिन के जारी रखें (अतिथि मोड)',
      alreadySignedIn: 'आप वर्तमान में लॉगिन हैं:',
      goDashboard: 'एडमिन डैशबोर्ड खोलें',
      goHome: 'योजना सहायक पर जाएं',
      otpTitle: 'खाता सत्यापित करें',
      otpSubtitle: 'पर भेजा गया 6-अंकीय सत्यापन कोड दर्ज करें:',
      otpExpires: 'कोड समाप्ति समय:',
      resendCode: 'कोड पुनः भेजें',
      resendWait: 'पुनः कोड भेजें:',
      verifyBtn: 'सत्यापित करें और खाता सक्रिय करें',
      backToForm: 'विवरण संपादित करें',
      demoChipLabel: 'डेमो ओटीपी (स्वतः भरें)',
      enterOtpLabel: '६-अंकीय सत्यापन कोड',
      otpPlaceholder: '000000',
    },
    mr: {
      title: 'योजनामित्र मध्ये स्वागत आहे',
      subtitle: 'नागरिक म्हणून साइन इन करा किंवा सर्व वापरकर्त्यांच्या विनंत्या पाहण्यासाठी अॅडमिन लॉगिन करा.',
      citizenTab: 'नागरिक लॉगिन',
      adminTab: 'अॅडमिन लॉगिन',
      signIn: 'साइन इन करा',
      signUp: 'नवीन खाते तयार करा',
      guestLink: 'लॉगिन न करता पुढे जा (पाहुणे मोड)',
      alreadySignedIn: 'तुम्ही सध्या लॉगिन आहात:',
      goDashboard: 'अॅडमिन डॅशबोर्ड उघडा',
      goHome: 'योजना सहाय्यकाकडे जा',
      otpTitle: 'खाते पडताळणी करा',
      otpSubtitle: 'वर पाठवलेला ६-अंकी पडताळणी कोड प्रविष्ट करा:',
      otpExpires: 'कोड कालबाह्य होईल:',
      resendCode: 'कोड पुन्हा पाठवा',
      resendWait: 'पुन्हा कोड पाठवा:',
      verifyBtn: 'पडताळणी करा आणि खाते सुरू करा',
      backToForm: 'माहिती बदला',
      demoChipLabel: 'डेमो ओटीपी (आपोआप भरा)',
      enterOtpLabel: '६-अंकी पडताळणी कोड',
      otpPlaceholder: '000000',
    },
  }[lang];

  return (
    <div className="mx-auto max-w-5xl py-2 sm:py-6">
      <div className="surface-elevated grid overflow-hidden rounded-[2rem] lg:grid-cols-12">
        {/* Left Showcase Panel */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#093D42] via-[#0D5C63] to-[#16324F] p-5 text-white sm:p-10 lg:col-span-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-[#D45015]/25 blur-3xl"
          />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-bold tracking-wide text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              <span>Signed Session · Zero DB</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              {copy.title}
            </h1>
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">{copy.subtitle}</p>

            <ul className="space-y-3 pt-2 text-sm text-white/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>
                  <strong>Citizen Account:</strong> Track your queries, save schemes, and export
                  your documents checklist.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>
                  <strong>Admin Command Center:</strong> Inspect all citizen requests live across
                  EN/HI/MR, language trends, top matched schemes, and CSV export.
                </span>
              </li>
            </ul>
          </div>

          {/* Instant Demo Credentials Box */}
          <div className="relative mt-8 space-y-2.5 rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Quick Demo Access
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={fillDemoCitizen}
                className="flex cursor-pointer items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/20"
              >
                <div>
                  <div className="font-bold text-white">Demo Citizen</div>
                  <div className="text-white/75">citizen@yojanamitra.in</div>
                </div>
                <span className="rounded-lg bg-white/15 px-2 py-1 font-semibold">Fill</span>
              </button>
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="flex cursor-pointer items-center justify-between rounded-xl bg-[#D45015]/30 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#D45015]/45"
              >
                <div>
                  <div className="font-bold text-white">Demo Admin</div>
                  <div className="text-white/80">admin@yojanamitra.in</div>
                </div>
                <span className="rounded-lg bg-white/20 px-2 py-1 font-semibold">Fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center bg-[var(--bg-surface)] p-5 sm:p-10 lg:col-span-7">
          {user && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-[var(--status-eligible-bg)] p-4 text-sm">
              <div>
                <span className="text-[var(--fg-secondary)]">{copy.alreadySignedIn} </span>
                <strong className="text-[var(--status-eligible-fg)]">
                  {user.name} ({user.role.toUpperCase()})
                </strong>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={user.role === 'admin' ? '/admin' : '/'}>
                  {user.role === 'admin' ? copy.goDashboard : copy.goHome}
                </Link>
              </Button>
            </div>
          )}

          {/* Segmented Role Switcher */}
          <div
            role="tablist"
            aria-label="Login portal role"
            className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={portalTab === 'user'}
              onClick={() => {
                setPortalTab('user');
                setRegStep('form');
                setError(null);
                setInfoMessage(null);
              }}
              className={cn(
                'flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
                portalTab === 'user'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-teal)] shadow-xs'
                  : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
              )}
            >
              <User className="h-4 w-4" />
              <span>{copy.citizenTab}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portalTab === 'admin'}
              onClick={() => {
                setPortalTab('admin');
                setUserMode('login');
                setRegStep('form');
                setError(null);
                setInfoMessage(null);
              }}
              className={cn(
                'flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
                portalTab === 'admin'
                  ? 'bg-gradient-to-r from-[#D45015] to-[#E56A24] text-white shadow-xs'
                  : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{copy.adminTab}</span>
            </button>
          </div>

          {/* Citizen Sign In / Register Sub-Toggle */}
          {portalTab === 'user' && regStep === 'form' && (
            <div className="mb-5 flex items-center gap-4 border-b border-[var(--border-subtle)] pb-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setUserMode('login');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={cn(
                  'cursor-pointer font-bold transition-colors',
                  userMode === 'login'
                    ? 'text-[var(--accent-teal)] underline decoration-2 underline-offset-8'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
                )}
              >
                {copy.signIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMode('register');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={cn(
                  'cursor-pointer font-bold transition-colors',
                  userMode === 'register'
                    ? 'text-[var(--accent-teal)] underline decoration-2 underline-offset-8'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
                )}
              >
                {copy.signUp}
              </button>
            </div>
          )}

          {portalTab === 'admin' && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[var(--accent-saffron)]/25 bg-[var(--accent-saffron-soft)] p-3.5 text-xs font-medium text-[var(--accent-saffron)]">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Administrator portal — view all citizen requests, language distribution, matched
                schemes, latency metrics, and export CSV reports.
              </span>
            </div>
          )}

          {infoMessage && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-[var(--status-eligible-bg)] px-4 py-3 text-sm font-medium text-[var(--status-eligible-fg)]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-[var(--status-ineligible-bg)] px-4 py-3 text-sm font-medium text-[var(--status-ineligible-fg)]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Step 2: OTP Verification Screen */}
          {portalTab === 'user' && userMode === 'register' && regStep === 'otp' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegStep('form');
                    setError(null);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[var(--fg-secondary)] transition-colors hover:text-[var(--fg-primary)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{copy.backToForm}</span>
                </button>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Step 2 of 2 · OTP Verification</span>
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[var(--fg-primary)]">{copy.otpTitle}</h2>
                <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                  {copy.otpSubtitle}{' '}
                  <strong className="text-[var(--fg-primary)]">{email}</strong>
                </p>
              </div>

              {/* Demo Quick-Fill Chip */}
              {demoOtp && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent-teal)]" />
                    <span>
                      {copy.demoChipLabel}: <strong className="font-mono text-sm tracking-wider text-[var(--accent-teal)]">{demoOtp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpCode(demoOtp);
                      setError(null);
                    }}
                    className="cursor-pointer rounded-lg bg-[var(--accent-teal)] px-2.5 py-1 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Paste Code
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <label className="block space-y-1.5 text-sm font-semibold">
                  <div className="flex items-center justify-between">
                    <span>{copy.enterOtpLabel}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-[var(--fg-muted)]">
                      <Clock className="h-3 w-3" />
                      <span>{copy.otpExpires} {formatTimer(countdown)}</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      setError(null);
                    }}
                    placeholder={copy.otpPlaceholder}
                    className="min-h-[58px] w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-center font-mono text-2xl font-bold tracking-[0.4em] sm:tracking-[0.6em] focus:border-[var(--accent-teal)] focus:outline-none"
                  />
                </label>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--fg-muted)]">
                    Didn&apos;t receive the code?
                  </span>
                  <button
                    type="button"
                    disabled={resending || countdown > 90}
                    onClick={handleResendOtp}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 font-bold transition-colors',
                      countdown > 90 || resending
                        ? 'cursor-not-allowed text-[var(--fg-muted)]'
                        : 'text-[var(--accent-teal)] hover:underline'
                    )}
                  >
                    <RefreshCw className={cn('h-3 w-3', resending && 'animate-spin')} />
                    <span>
                      {resending
                        ? 'Sending...'
                        : countdown > 90
                          ? `${copy.resendWait} ${countdown - 90}s`
                          : copy.resendCode}
                    </span>
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  disabled={submitting || otpCode.length !== 6}
                  className="mt-2 w-full rounded-xl"
                >
                  <span>{submitting ? 'Verifying...' : copy.verifyBtn}</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            </div>
          ) : (
            /* Registration Step 1 or Sign In Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {portalTab === 'user' && userMode === 'register' && (
                <label className="block space-y-1.5 text-sm font-semibold">
                  <span>Full Name</span>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Sunita Deshmukh"
                      className="min-h-[50px] w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] pr-4 pl-10 text-base font-normal focus:border-[var(--accent-teal)] focus:outline-none"
                    />
                  </div>
                </label>
              )}

              <label className="block space-y-1.5 text-sm font-semibold">
                <span>Email Address</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      portalTab === 'admin' ? 'admin@yojanamitra.in' : 'citizen@yojanamitra.in'
                    }
                    className="min-h-[50px] w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] pr-4 pl-10 text-base font-normal focus:border-[var(--accent-teal)] focus:outline-none"
                  />
                </div>
              </label>

              <label className="block space-y-1.5 text-sm font-semibold">
                <span>Password</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[50px] w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] pr-4 pl-10 text-base font-normal focus:border-[var(--accent-teal)] focus:outline-none"
                  />
                </div>
              </label>

              <Button
                type="submit"
                variant={portalTab === 'admin' ? 'primary' : 'secondary'}
                size="lg"
                disabled={submitting}
                className="mt-2 w-full rounded-xl"
              >
                <span>
                  {submitting
                    ? 'Please wait...'
                    : portalTab === 'admin'
                      ? 'Sign In to Admin Dashboard'
                      : userMode === 'register'
                        ? 'Continue to Verification'
                        : 'Sign In as Citizen'}
                </span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--fg-secondary)] hover:text-[var(--accent-teal)] hover:underline"
            >
              {copy.guestLink} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
