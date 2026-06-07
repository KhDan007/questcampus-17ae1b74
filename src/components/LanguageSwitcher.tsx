"use client";

import { Globe, Check } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/i18n/I18nProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LangCode } from "@/lib/i18n/languages";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.lang")}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest px-3 py-1.5 text-label-sm font-medium text-on-surface-variant transition-colors hover:border-outline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span className={compact ? "hidden sm:inline" : ""}>
            {current.code.toUpperCase()}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-56 rounded-none border border-outline-variant/60 bg-surface-container-lowest p-1.5 text-on-surface shadow-[0_16px_40px_-12px_rgba(53,37,205,0.22)]"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-label-sm font-semibold uppercase text-on-surface-variant">
          {t("nav.lang")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1.5 my-1 bg-outline-variant/50" />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code as LangCode)}
            className="cursor-pointer rounded-none px-2.5 py-2 text-label-md text-on-surface focus:bg-surface-container-low focus:text-on-surface"
          >
            <span className="flex-1">{l.native}</span>
            {l.code === lang && (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
