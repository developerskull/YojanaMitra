'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SupportedLang } from '@/lib/schemes/schema';
import { getStoredLang, setStoredLang } from '@/lib/storage/local';
import { TRANSLATIONS, type UIStrings } from './translations';

interface I18nContextValue {
  lang: SupportedLang;
  setLang: (next: SupportedLang) => void;
  t: UIStrings;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: TRANSLATIONS.en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>('en');

  useEffect(() => {
    const saved = getStoredLang();
    if (saved) {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = useCallback((next: SupportedLang) => {
    setLangState(next);
    setStoredLang(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
