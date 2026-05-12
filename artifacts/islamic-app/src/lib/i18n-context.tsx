/**
 * Noor Quran — i18n Context
 *
 * Provides the `useI18n()` hook to any component:
 *   const { t, lang, setLang } = useI18n();
 *   <p>{t("nav_home")}</p>
 *
 * Language changes are instant — no page reload required.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { TRANSLATIONS, UI_LANG_RTL, type UiLanguage, type Translations } from "./i18n";

// ── Storage ───────────────────────────────────────────────────────────────────
const UI_LANG_KEY = "noor-ui-lang";

function readStoredLang(): UiLanguage {
  try {
    const v = localStorage.getItem(UI_LANG_KEY) as UiLanguage | null;
    if (v && v in TRANSLATIONS) return v;
  } catch { /* SSR safety */ }
  return "english";
}

function persistLang(lang: UiLanguage): void {
  try { localStorage.setItem(UI_LANG_KEY, lang); } catch { /* ignore */ }
}

// ── Context value ─────────────────────────────────────────────────────────────
interface I18nContextValue {
  lang:    UiLanguage;
  setLang: (lang: UiLanguage) => void;
  t:       (key: keyof Translations) => string;
  isRtl:   boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>(readStoredLang);

  const setLang = useCallback((next: UiLanguage) => {
    persistLang(next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: keyof Translations): string => TRANSLATIONS[lang][key] ?? TRANSLATIONS.english[key] ?? key,
    [lang]
  );

  const isRtl = Boolean(UI_LANG_RTL[lang]);

  // Apply dir attribute to <html> for proper RTL text rendering
  useEffect(() => {
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    return () => { document.documentElement.setAttribute("dir", "ltr"); };
  }, [isRtl]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
