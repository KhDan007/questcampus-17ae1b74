// Supported languages — 10 most widely-spoken + Kazakh, with Russian.
// Order shown in the picker.
export const LANGUAGES = [
  { code: "en", label: "English",   native: "English"   },
  { code: "es", label: "Spanish",   native: "Español"   },
  { code: "zh", label: "Chinese",   native: "中文"       },
  { code: "hi", label: "Hindi",     native: "हिन्दी"      },
  { code: "ar", label: "Arabic",    native: "العربية"    },
  { code: "pt", label: "Portuguese",native: "Português" },
  { code: "ru", label: "Russian",   native: "Русский"   },
  { code: "fr", label: "French",    native: "Français"  },
  { code: "de", label: "German",    native: "Deutsch"   },
  { code: "kk", label: "Kazakh",    native: "Қазақша"   },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: LangCode = "en";
export const RTL_LANGS: ReadonlySet<LangCode> = new Set(["ar"]);

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === "string" && LANGUAGES.some((l) => l.code === v);
}
