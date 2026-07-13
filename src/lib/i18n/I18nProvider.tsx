"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LANG, LANGUAGES, RTL_LANGS, isLangCode, type LangCode } from "./languages";
import { AUDIT_TRANSLATIONS, TRANSLATIONS, type Dict } from "./translations";
import en from "./generated/en.json";
import ru from "./generated/ru.json";
import kk from "./generated/kk.json";

type Vars = Record<string, string | number>;

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Vars) => string;
}

type NodeRecord = {
  lang: LangCode;
  source: string;
  output: string;
};

type AttrRecord = NodeRecord & { attr: string };

const STORAGE_KEY = "qc.lang";
const CHANGE_EVENT = "qc:i18n-change";
const GENERATED: Record<LangCode, Dict> = {
  en: en as Dict,
  ru: ru as Dict,
  kk: kk as Dict,
};
const DICTIONARIES: Record<LangCode, Dict> = {
  en: { ...GENERATED.en, ...(TRANSLATIONS.en ?? {}), ...AUDIT_TRANSLATIONS.en },
  ru: {
    ...GENERATED.en,
    ...(TRANSLATIONS.en ?? {}),
    ...GENERATED.ru,
    ...(TRANSLATIONS.ru ?? {}),
    ...AUDIT_TRANSLATIONS.ru,
  },
  kk: {
    ...GENERATED.en,
    ...(TRANSLATIONS.en ?? {}),
    ...GENERATED.kk,
    ...(TRANSLATIONS.kk ?? {}),
    ...AUDIT_TRANSLATIONS.kk,
  },
};
const ATTRS = ["aria-label", "aria-description", "title", "placeholder", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT", "SVG"]);
const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox']";

const I18nContext = createContext<I18nCtx | null>(null);

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

function langFromAuthUser(): LangCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("qc.auth.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lang?: unknown };
    return isLangCode(parsed.lang) ? parsed.lang : null;
  } catch {
    return null;
  }
}

function langFromNavigator(): LangCode | null {
  if (typeof navigator === "undefined") return null;
  for (const raw of navigator.languages ?? [navigator.language]) {
    const base = raw.split("-")[0];
    if (isLangCode(base)) return base;
  }
  return null;
}

export function getCurrentLang(): LangCode {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLangCode(stored)) return stored;
  return langFromAuthUser() ?? langFromNavigator() ?? DEFAULT_LANG;
}

export function i18nHeaders(): Record<string, string> {
  const lang = getCurrentLang();
  return {
    "X-QC-Lang": lang,
    "Accept-Language": `${lang},en;q=0.8`,
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dictionary(lang: LangCode): Dict {
  return DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
}

function lookup(lang: LangCode, key: string): string | undefined {
  return dictionary(lang)[key];
}

function buildLiteralIndexes(): Record<LangCode, Map<string, string>> {
  const source = DICTIONARIES[DEFAULT_LANG];
  const out = {} as Record<LangCode, Map<string, string>>;

  for (const lang of LANGUAGES.map((l) => l.code)) {
    const map = new Map<string, string>();
    const target = DICTIONARIES[lang];
    for (const [key, value] of Object.entries(source)) {
      const translated = target[key];
      if (typeof value !== "string" || typeof translated !== "string") continue;
      const normalized = normalizeText(value);
      if (normalized && normalizeText(translated) !== normalized) map.set(normalized, translated);
    }
    out[lang] = map;
  }

  return out;
}

const LITERAL_INDEX = buildLiteralIndexes();

function translateLiteral(lang: LangCode, text: string): string | null {
  if (lang === DEFAULT_LANG) return null;
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const translated = LITERAL_INDEX[lang]?.get(normalized);
  return translated ? withWhitespace(text, translated) : null;
}

function makeT(lang: LangCode) {
  return (key: string, vars?: Vars) =>
    interpolate(lookup(lang, key) ?? (lang === DEFAULT_LANG ? key : "—"), vars);
}

function hasEnglishLetters(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

function withWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.closest(EDITABLE_SELECTOR)) return true;
  return el.closest("[data-i18n-skip='true']") != null;
}

function shouldScanForMutations(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    if (mutation.type !== "childList") continue;
    for (const node of Array.from(mutation.addedNodes)) {
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      if (!shouldSkipElement(el)) return true;
    }
  }
  return false;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => getCurrentLang());
  const textRecords = useRef(new WeakMap<Text, NodeRecord>());
  const recordedTextNodes = useRef(new Set<Text>());
  const attrRecords = useRef(new WeakMap<Element, Map<string, AttrRecord>>());
  const recordedAttrEls = useRef(new Set<Element>());
  const scanTimer = useRef<number | null>(null);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { lang: next } }));
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isLangCode(e.newValue)) setLangState(e.newValue);
    };
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ lang?: unknown }>).detail;
      if (isLangCode(detail?.lang)) setLangState(detail.lang);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const restoreRecorded = (all: boolean) => {
      for (const node of recordedTextNodes.current) {
        const record = textRecords.current.get(node);
        if (!all && record?.lang === lang) continue;
        if (record && node.textContent === record.output) node.textContent = record.source;
      }
      for (const el of recordedAttrEls.current) {
        const attrMap = attrRecords.current.get(el);
        if (!attrMap) continue;
        for (const [attr, record] of attrMap) {
          if (!all && record.lang === lang) continue;
          if (el.getAttribute(attr) === record.output) el.setAttribute(attr, record.source);
        }
      }
    };

    const scan = async () => {
      if (!document.body) return;
      if (lang === DEFAULT_LANG) {
        restoreRecorded(true);
        return;
      }
      restoreRecorded(false);

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
          const text = node.textContent ?? "";
          if (!text.trim() || !hasEnglishLetters(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const node = n as Text;
        const source = node.textContent ?? "";
        const record = textRecords.current.get(node);
        if (record?.lang === lang && (record.source === source || record.output === source))
          continue;

        const literal = translateLiteral(lang, source);
        if (literal) {
          textRecords.current.set(node, { lang, source, output: literal });
          recordedTextNodes.current.add(node);
          node.textContent = literal;
        }
      }

      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        if (shouldSkipElement(el)) continue;
        for (const attr of ATTRS) {
          const value = el.getAttribute(attr);
          if (!value || !hasEnglishLetters(value)) continue;
          const record = attrRecords.current.get(el)?.get(attr);
          if (record?.lang === lang && (record.source === value || record.output === value))
            continue;
          const literal = translateLiteral(lang, value);
          if (literal) {
            let map = attrRecords.current.get(el);
            if (!map) {
              map = new Map();
              attrRecords.current.set(el, map);
            }
            recordedAttrEls.current.add(el);
            map.set(attr, { attr, lang, source: value, output: literal });
            el.setAttribute(attr, literal);
            continue;
          }
        }
      }
    };

    const schedule = (mutations?: MutationRecord[]) => {
      if (mutations && !shouldScanForMutations(mutations)) return;
      if (scanTimer.current != null) window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(() => void scan(), 80);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      if (scanTimer.current != null) window.clearTimeout(scanTimer.current);
      scanTimer.current = null;
    };
  }, [lang]);

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, t: makeT(lang) }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nCtx {
  return (
    useContext(I18nContext) ?? { lang: DEFAULT_LANG, setLang: () => {}, t: makeT(DEFAULT_LANG) }
  );
}

export { LANGUAGES };
