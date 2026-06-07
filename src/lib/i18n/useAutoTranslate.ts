"use client";

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "./I18nProvider";
import { translateTexts } from "@/lib/api/translate.functions";

// Tiny stable string hash for cache keys.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function cacheKey(lang: string, text: string) {
  return `qc.tr.${lang}.${hash(text)}`;
}

function readCache(lang: string, text: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(cacheKey(lang, text));
  } catch {
    return null;
  }
}

function writeCache(lang: string, text: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(lang, text), value);
  } catch {
    /* quota: ignore */
  }
}

/**
 * Translate one piece of dynamic / AI-generated copy into the active language.
 * Returns the English source immediately, then swaps in the translation once
 * it lands. Results are cached in localStorage so repeat views are instant.
 */
export function useAutoTranslate(
  text: string | null | undefined,
): string | null {
  const { lang } = useI18n();
  const callTranslate = useServerFn(translateTexts);
  const [out, setOut] = useState<string | null>(text ?? null);

  useEffect(() => {
    if (!text) {
      setOut(null);
      return;
    }
    if (lang === "en") {
      setOut(text);
      return;
    }
    const cached = readCache(lang, text);
    if (cached) {
      setOut(cached);
      return;
    }
    setOut(text); // show English while translating
    let cancelled = false;
    (async () => {
      try {
        const res = (await callTranslate({
          data: { targetLang: lang, texts: [text] },
        })) as { translations?: string[] };
        const translated = res?.translations?.[0];
        if (!cancelled && translated && translated !== text) {
          setOut(translated);
          writeCache(lang, text, translated);
        }
      } catch {
        /* keep English fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text, lang, callTranslate]);

  return out;
}
