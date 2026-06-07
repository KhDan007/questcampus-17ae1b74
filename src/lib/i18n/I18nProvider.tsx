"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  LANGUAGES,
  RTL_LANGS,
  isLangCode,
  type LangCode,
} from "./languages";
import { TRANSLATIONS } from "./translations";

// Build-time generated dictionaries (one JSON per language). These cover
// onboarding, profile, signin, waitlist, unlock, referrals, etc. — everything
// outside the static landing strings in translations.ts. Re-generate with
// `bun run scripts/translate-i18n.mjs`.
import en from "./generated/en.json";
import es from "./generated/es.json";
import zh from "./generated/zh.json";
import hi from "./generated/hi.json";
import ar from "./generated/ar.json";
import pt from "./generated/pt.json";
import ru from "./generated/ru.json";
import fr from "./generated/fr.json";
import de from "./generated/de.json";
import kk from "./generated/kk.json";

const GENERATED: Record<LangCode, Record<string, string>> = {
  en, es, zh, hi, ar, pt, ru, fr, de, kk,
};

const STORAGE_KEY = "qc.lang";

type Vars = Record<string, string | number>;

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Vars) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

function detectInitialLang(): LangCode {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLangCode(stored)) return stored;
  } catch {
    /* ignore */
  }
  const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (isLangCode(nav)) return nav;
  return DEFAULT_LANG;
}

function lookup(lang: LangCode, key: string): string | undefined {
  return (
    TRANSLATIONS[lang]?.[key] ??
    GENERATED[lang]?.[key]
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR-safe: render English on the server, then hydrate to the user's pick.
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const raw =
        lookup(lang, key) ??
        lookup(DEFAULT_LANG, key) ??
        key;
      return interpolate(raw, vars);
    },
    [lang],
  );

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback for components rendered outside a provider (e.g. error pages).
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key: string, vars?: Vars) =>
        interpolate(
          lookup(DEFAULT_LANG, key) ?? key,
          vars,
        ),
    };
  }
  return ctx;
}

export { LANGUAGES };
