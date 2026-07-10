"use client";

import { useEffect, useMemo, useState } from "react";
import { translateTexts } from "@/lib/api/translate.functions";
import { useI18n } from "./I18nProvider";

function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function cacheKey(lang: string, text: string): string {
  return `qc.i18n.dynamic.${lang}.${hashText(text)}`;
}

export function useAutoTranslate(text: string | null | undefined): string | null {
  const { lang } = useI18n();
  const source = text ?? null;
  const [translated, setTranslated] = useState<string | null>(source);

  const key = useMemo(() => (source && lang !== "en" ? cacheKey(lang, source) : null), [lang, source]);

  useEffect(() => {
    let cancelled = false;
    if (!source || lang === "en" || !key) {
      setTranslated(source);
      return;
    }

    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        setTranslated(cached);
        return;
      }
    } catch {
      // Storage can be disabled.
    }

    setTranslated(source);
    translateTexts({ data: { targetLang: lang, texts: [source] } })
      .then((res) => {
        if (cancelled) return;
        const next = res.translations[0] ?? source;
        setTranslated(next);
        try {
          if (next !== source) window.localStorage.setItem(key, next);
        } catch {
          // Storage can be disabled.
        }
      })
      .catch(() => {
        if (!cancelled) setTranslated(source);
      });

    return () => {
      cancelled = true;
    };
  }, [lang, source, key]);

  return translated;
}
