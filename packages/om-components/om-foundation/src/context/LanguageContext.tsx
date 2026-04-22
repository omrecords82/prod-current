/**
 * LanguageContext — global translation provider for OrthodoxMetrics.
 *
 * Canonical source of truth for public-page translations.
 * Fetches translations from GET /api/i18n/:lang (DB-backed).
 * English defaults come from the API, NOT from a hardcoded frontend blob.
 *
 * Usage:
 *   const { t, lang, setLang, loading, supportedLangs } = useLanguage();
 *   <h1>{t('home.hero.title')}</h1>
 *   <button onClick={() => setLang('el')}>Greek</button>
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { safeTranslate } from '@/utils/safeTranslate';

const SUPPORTED_LANGS = ['en', 'el', 'ru', 'ro', 'ka'] as const;
type LangCode = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = 'orthodoxmetrics-lang';

export interface LanguageContextValue {
  /** Current language code */
  lang: string;
  /** Switch language. Persists to localStorage and fetches translations. */
  setLang: (lang: string) => void;
  /** Translate a key. Returns the translated string, or the key itself if unavailable. */
  t: (key: string) => string;
  /** Full translations map for the current language */
  translations: Record<string, string>;
  /** True while the initial fetch for the current language is in flight */
  loading: boolean;
  /** All supported language codes */
  supportedLangs: readonly string[];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Module-level cache so translations persist across component mounts and re-renders.
// Keyed by language code. Once fetched, a language stays cached for the SPA session.
const translationCache: Record<string, Record<string, string>> = {};

function getInitialLang(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
    return stored;
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<string>(getInitialLang);
  const [translations, setTranslations] = useState<Record<string, string>>(
    () => translationCache[getInitialLang()] || {},
  );
  const [loading, setLoading] = useState(!translationCache[getInitialLang()]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTranslations = useCallback((targetLang: string) => {
    // Check cache
    if (translationCache[targetLang]) {
      setTranslations(translationCache[targetLang]);
      setLoading(false);
      return;
    }

    // Fetch from API
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    apiClient
      .get(`/i18n/${targetLang}`)
      .then((data: Record<string, string>) => {
        if (controller.signal.aborted) return;
        translationCache[targetLang] = data;
        setTranslations(data);
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        console.warn(`[LanguageProvider] Failed to load ${targetLang}:`, err);
        // Fall back to whatever we have (possibly empty — t() returns key)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  // Fetch on mount and when language changes
  useEffect(() => {
    fetchTranslations(lang);
    return () => abortRef.current?.abort();
  }, [lang, fetchTranslations]);

  const setLang = useCallback((newLang: string) => {
    const safeLang = (SUPPORTED_LANGS as readonly string[]).includes(newLang) ? newLang : 'en';
    setLangState(safeLang);
    localStorage.setItem(STORAGE_KEY, safeLang);
  }, []);

  const t = useCallback(
    (key: string): string => safeTranslate(translations, key),
    [translations],
  );

  const value: LanguageContextValue = {
    lang,
    setLang,
    t,
    translations,
    loading,
    supportedLangs: SUPPORTED_LANGS,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * Hook to access the language context. Must be used within a LanguageProvider.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

export default LanguageContext;
