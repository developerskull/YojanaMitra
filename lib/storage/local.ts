'use client';

import type { SupportedLang, UserProfile } from '@/lib/schemes/schema';

const KEYS = {
  lang: 'yojanamitra_lang',
  profile: 'yojanamitra_profile',
  savedSchemes: 'yojanamitra_saved_schemes',
  compareSchemes: 'yojanamitra_compare_schemes',
  checkedDocs: 'yojanamitra_checked_docs',
  theme: 'yojanamitra_theme',
  highContrast: 'yojanamitra_high_contrast',
} as const;

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event('yojanamitra:storage'));
  } catch {
    // Ignore quota errors on low-end devices
  }
}

export function getStoredLang(): SupportedLang | null {
  const raw = safeGet(KEYS.lang);
  if (raw === 'en' || raw === 'hi' || raw === 'mr') return raw;
  return null;
}

export function setStoredLang(lang: SupportedLang): void {
  safeSet(KEYS.lang, lang);
}

export function getStoredProfile(): UserProfile {
  const raw = safeGet(KEYS.profile);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return {};
  }
}

export function setStoredProfile(profile: UserProfile): void {
  safeSet(KEYS.profile, JSON.stringify(profile));
}

export function getSavedSchemeIds(): string[] {
  const raw = safeGet(KEYS.savedSchemes);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleSavedSchemeId(id: string): string[] {
  const current = getSavedSchemeIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  safeSet(KEYS.savedSchemes, JSON.stringify(next));
  return next;
}

export function getCompareSchemeIds(): string[] {
  const raw = safeGet(KEYS.compareSchemes);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleCompareSchemeId(id: string): string[] {
  const current = getCompareSchemeIds();
  let next: string[];
  if (current.includes(id)) {
    next = current.filter((x) => x !== id);
  } else {
    // Cap side-by-side comparison at 3 schemes for mobile readability
    next = [...current.slice(-2), id];
  }
  safeSet(KEYS.compareSchemes, JSON.stringify(next));
  return next;
}

export function getCheckedDocIds(): string[] {
  const raw = safeGet(KEYS.checkedDocs);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleCheckedDocId(id: string): string[] {
  const current = getCheckedDocIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  safeSet(KEYS.checkedDocs, JSON.stringify(next));
  return next;
}

export function getStoredTheme(): 'light' | 'dark' {
  return safeGet(KEYS.theme) === 'dark' ? 'dark' : 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  safeSet(KEYS.theme, theme);
}

export function getStoredHighContrast(): boolean {
  return safeGet(KEYS.highContrast) === 'true';
}

export function setStoredHighContrast(enabled: boolean): void {
  safeSet(KEYS.highContrast, String(enabled));
}

/**
 * Erases ALL locally persisted user profile, saved schemes, compare list, and document checklist.
 */
export function clearAllUserData(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEYS.profile);
    window.localStorage.removeItem(KEYS.savedSchemes);
    window.localStorage.removeItem(KEYS.compareSchemes);
    window.localStorage.removeItem(KEYS.checkedDocs);
    window.dispatchEvent(new Event('yojanamitra:storage'));
  } catch {
    // Ignore
  }
}
