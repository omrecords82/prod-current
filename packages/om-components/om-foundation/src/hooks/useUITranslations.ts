/**
 * @deprecated Use `useLanguage()` from `@/context/LanguageContext` instead.
 *
 * This hook is a thin compatibility shim that delegates to the global
 * LanguageProvider. It exists only to prevent breakage if any stray imports
 * remain. New code should import `useLanguage` directly.
 *
 * The duplicate EN_DEFAULTS blob that lived here has been removed.
 * English defaults are now served exclusively by the backend API
 * (GET /api/i18n/en) and cached by LanguageProvider.
 */

import { useLanguage } from '@/context/LanguageContext';

export interface UITranslations {
  t: (key: string) => string;
  lang: string;
  setLang: (lang: string) => void;
  loading: boolean;
  supportedLangs: readonly string[];
}

/** @deprecated Use `useLanguage()` from `@/context/LanguageContext` instead. */
export function useUITranslations(_initialLang = 'en'): UITranslations {
  const { t, lang, setLang, loading, supportedLangs } = useLanguage();
  return { t, lang, setLang, loading, supportedLangs };
}
