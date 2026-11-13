import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dict } from './dict.js';

export const LANGS = ['uz', 'ru', 'en'];
const STORAGE_KEY = 'ma-lang';
const I18nContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* private mode: the choice simply isn't remembered */
  }
  return 'uz';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.querySelector('meta[name="description"]')?.setAttribute('content', dict[lang]['meta.desc']);
  }, [lang]);

  const value = useMemo(() => {
    const t = (key) => dict[lang]?.[key] ?? dict.uz[key] ?? key;
    return {
      lang,
      setLang,
      t,
      /** For strings that carry markup (<em>): spread onto the element — <h2 {...html('about.title')} /> */
      html: (key) => ({ dangerouslySetInnerHTML: { __html: t(key) } }),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
