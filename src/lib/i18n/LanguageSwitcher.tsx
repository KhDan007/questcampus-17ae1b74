"use client";

import { Languages } from "lucide-react";
import { LANGUAGES } from "./languages";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      }`}
      title={t("nav.lang")}
      data-i18n-skip="true"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t("nav.lang")}</span>
      <select
        value={lang}
        aria-label={t("nav.lang")}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        className="bg-transparent text-inherit outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
