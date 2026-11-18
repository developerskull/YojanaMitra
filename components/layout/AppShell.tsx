'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bookmark,
  CheckCircle2,
  Compass,
  Contrast,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
  User,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useI18n } from '@/lib/i18n/context';
import type { SupportedLang } from '@/lib/schemes/schema';
import {
  getSavedSchemeIds,
  getStoredHighContrast,
  getStoredTheme,
  setStoredHighContrast,
  setStoredTheme,
} from '@/lib/storage/local';
import { cn } from '@/lib/utils';

const LAST_VERIFIED_DATE = '2026-11-18';

const LANG_OPTIONS: Array<{ code: SupportedLang; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setDark(getStoredTheme() === 'dark');
    setHighContrast(getStoredHighContrast());
    setSavedCount(getSavedSchemeIds().length);
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    const onStorage = () => setSavedCount(getSavedSchemeIds().length);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener('yojanamitra:storage', onStorage);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('yojanamitra:storage', onStorage);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    setStoredTheme(next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    setStoredHighContrast(next);
    document.documentElement.classList.toggle('high-contrast', next);
  };

  const handleLogout = async () => {
    await logout();
    if (pathname === '/admin') {
      router.push('/login');
    }
  };

  const navItems = [
    { href: '/', label: t.nav.home, icon: MessageSquare },
    { href: '/wizard', label: t.nav.wizard, icon: CheckCircle2 },
    { href: '/explorer', label: t.nav.explorer, icon: Compass },
    { href: '/saved', label: t.nav.saved, icon: Bookmark, badge: savedCount },
    { href: '/profile', label: t.nav.profile, icon: User },
  ];

  const loginLabel = lang === 'mr' ? 'लॉगिन' : lang === 'hi' ? 'लॉगिन' : 'Sign In';
  const adminLabel = lang === 'mr' ? 'अॅडमिन' : lang === 'hi' ? 'एडमिन' : 'Admin';

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      {/* WCAG Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[var(--accent-teal)] focus:px-4 focus:py-2 focus:text-white"
      >
        {t.accessibility.skipToContent}
      </a>

      {/* Persistent Official Trust Ribbon */}
      <div
        role="note"
        aria-label="Official source trust notice"
        className="no-print bg-gradient-to-r from-[#0A4A50] via-[#0D5C63] to-[#136F75] px-3 py-2 text-center text-xs font-medium text-white/95 sm:text-xs"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
          <span>{t.trustBannerPrefix}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
            {t.trustBannerVerified} {LAST_VERIFIED_DATE}
          </span>
          <span className="hidden opacity-90 sm:inline">{t.trustBannerSuffix}</span>
        </div>
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div
          role="status"
          className="no-print flex items-center justify-center gap-2 bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>{t.accessibility.offlineBadge}</span>
        </div>
      )}

      {/* Premium Glass Header */}
      <header className="no-print sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          <Link
            href="/"
            className="group flex min-h-[48px] items-center gap-2.5 rounded-xl pr-2 transition-opacity"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#D45015] text-white shadow-sm transition-transform group-hover:scale-105"
              aria-hidden="true"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-lg font-extrabold tracking-tight text-[var(--fg-primary)]">
                {t.appName}
              </div>
              <div className="hidden text-[11px] font-medium text-[var(--fg-muted)] sm:block">
                {t.tagline}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all',
                    active
                      ? 'bg-[var(--accent-teal)] text-white shadow-xs dark:text-[#041B19]'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--fg-primary)]'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                        active
                          ? 'bg-white/25 text-white dark:bg-black/20 dark:text-[#041B19]'
                          : 'bg-[var(--accent-saffron)] text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={cn(
                  'inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all',
                  pathname === '/admin'
                    ? 'bg-[var(--accent-saffron)] text-white shadow-xs'
                    : 'bg-[var(--accent-saffron-soft)] text-[var(--accent-saffron)] hover:brightness-95'
                )}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                <span>{adminLabel}</span>
              </Link>
            )}
          </nav>

          {/* Right Utilities: Language Switcher + Auth + Theme */}
          <div className="flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Language switcher"
              className="flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-0.5"
            >
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLang(opt.code)}
                  aria-pressed={lang === opt.code}
                  className={cn(
                    'min-h-[38px] min-w-[38px] cursor-pointer rounded-lg px-2 text-xs font-bold transition-all sm:px-2.5',
                    lang === opt.code
                      ? 'bg-gradient-to-r from-[#D45015] to-[#E56A24] text-white shadow-xs'
                      : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  href={user.role === 'admin' ? '/admin' : '/profile'}
                  className="hidden min-h-[42px] items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--fg-primary)] transition-colors hover:border-[var(--accent-teal)] sm:inline-flex"
                  title={user.email}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-teal-soft)] text-[11px] font-bold text-[var(--accent-teal)]">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[96px] truncate">{user.name}</span>
                  {user.role === 'admin' && (
                    <span className="rounded bg-[var(--accent-saffron-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-saffron)]">
                      ADMIN
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex min-h-[42px] min-w-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-secondary)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--fg-primary)] shadow-2xs transition-all hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-soft)] hover:text-[var(--accent-teal)] sm:text-sm"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>{loginLabel}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? t.accessibility.lightMode : t.accessibility.darkMode}
              title={dark ? t.accessibility.lightMode : t.accessibility.darkMode}
              className="flex min-h-[42px] min-w-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleHighContrast}
              aria-label={t.accessibility.highContrast}
              aria-pressed={highContrast}
              title={t.accessibility.highContrast}
              className={cn(
                'hidden min-h-[42px] min-w-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] sm:flex',
                highContrast
                  ? 'bg-[var(--fg-primary)] text-[var(--bg-surface)]'
                  : 'bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]'
              )}
            >
              <Contrast className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-6 sm:py-10">
        {children}
      </main>

      {/* Refined Civic Footer */}
      <footer className="no-print border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 py-6 text-sm text-[var(--fg-muted)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-teal)]" />
            <span>
              <strong className="text-[var(--fg-primary)]">{t.appName}</strong> — {t.tagline}.{' '}
              {t.trustBannerSuffix}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 font-medium">
            <Link href="/privacy" className="text-[var(--accent-teal)] hover:underline">
              {t.nav.privacy}
            </Link>
            <Link href="/explorer" className="text-[var(--accent-teal)] hover:underline">
              {t.nav.explorer}
            </Link>
            <Link href="/login" className="text-[var(--accent-teal)] hover:underline">
              {loginLabel}
            </Link>
            <Link href="/admin" className="text-[var(--accent-saffron)] hover:underline">
              {adminLabel} Dashboard
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (>= 48px touch targets) */}
      <nav
        aria-label="Mobile navigation"
        className="no-print fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors',
                  active ? 'text-[var(--accent-saffron)]' : 'text-[var(--fg-secondary)]'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-saffron)] px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
