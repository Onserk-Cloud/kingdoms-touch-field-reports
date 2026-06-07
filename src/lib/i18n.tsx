import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { translations } from './locales';
import type { Locale } from './locales/types';
import { setDateLocale } from './format';

const LANG_KEY = 'kt:lang';

/**
 * Resolve the initial language: a previously saved choice wins; otherwise we
 * auto-detect from the browser (Spanish if the navigator language starts with
 * "es", English otherwise).
 */
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  const nav = (window.navigator.language || 'en').toLowerCase();
  return nav.startsWith('es') ? 'es' : 'en';
}

// Initialise date/time formatting to the detected language before first paint.
setDateLocale(detectLocale());

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a `namespace.key`, with optional `{var}` interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setDateLocale(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = translations[locale] ?? translations.en;
      let str = table[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.split(`{${k}}`).join(String(v));
        }
      }
      return str;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
