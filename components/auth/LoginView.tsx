'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

type PortalTab = 'user' | 'admin';
type UserMode = 'login' | 'register';

export function LoginView() {
  const { lang } = useI18n();
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab: PortalTab = searchParams.get('tab') === 'admin' ? 'admin' : 'user';
  const [portalTab, setPortalTab] = useState<PortalTab>(initialTab);
  const [userMode, setUserMode] = useState<UserMode>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint =
        portalTab === 'user' && userMode === 'register' ? '/api/auth/register' : '/api/auth/login';

      const payload =
        portalTab === 'user' && userMode === 'register'
          ? { name, email, password }
          : { email, password, role: portalTab };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    setEmail('citizen@yojanamitra.in');
    setPassword('Citizen@1234');
    setError(null);
  };

  const fillDemoAdmin = () => {
    setPortalTab('admin');
    setEmail('admin@yojanamitra.in');
    setPassword('Admin@1234');
    setError(null);
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
                setError(null);
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
                setError(null);
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
          {portalTab === 'user' && (
            <div className="mb-5 flex items-center gap-4 border-b border-[var(--border-subtle)] pb-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setUserMode('login');
                  setError(null);
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

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-[var(--status-ineligible-bg)] px-4 py-3 text-sm font-medium text-[var(--status-ineligible-fg)]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                      ? 'Create Citizen Account'
                      : 'Sign In as Citizen'}
              </span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </form>

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
