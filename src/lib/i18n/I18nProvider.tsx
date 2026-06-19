"use client";

import { useEffect, type ReactNode } from "react";
import { DEFAULT_LANG, LANGUAGES, type LangCode } from "./languages";
import { TRANSLATIONS } from "./translations";
import en from "./generated/en.json";

// English-only mode. All previous multi-language plumbing has been stripped;
// this provider exists solely so existing `useI18n()` / `t(key)` call sites
// keep working without churn. There is no language picker, no detection, no
// persistence.

type Vars = Record<string, string | number>;

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Vars) => string;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

function lookup(key: string): string | undefined {
  return TRANSLATIONS[DEFAULT_LANG]?.[key] ?? (en as Record<string, string>)[key];
}

function t(key: string, vars?: Vars): string {
  return interpolate(lookup(key) ?? key, vars);
}

const VALUE: I18nCtx = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }, []);
  return <>{children}</>;
}

export function useI18n(): I18nCtx {
  return VALUE;
}

export { LANGUAGES };
