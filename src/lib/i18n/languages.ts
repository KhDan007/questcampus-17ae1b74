// Supported product languages.
export const LANGUAGES = [
  { code: "en", label: "English",   native: "English"   },
  { code: "ru", label: "Russian",   native: "Русский"   },
  { code: "kk", label: "Kazakh",    native: "Қазақша"   },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: LangCode = "en";
export const RTL_LANGS: ReadonlySet<LangCode> = new Set();

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === "string" && LANGUAGES.some((l) => l.code === v);
}
