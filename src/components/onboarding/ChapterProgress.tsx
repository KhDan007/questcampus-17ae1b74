"use client";

import { CHAPTERS, type ChapterId } from "@/lib/onboarding/steps";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Top progress bar inside the right content panel.
export function ChapterProgress({
  chapter: _chapter,
  step,
  totalSteps,
}: {
  chapter: ChapterId;
  step: number;
  totalSteps: number;
}) {
  const { t } = useI18n();
  const pct = Math.round((step / totalSteps) * 100);
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-body text-ink" style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {t("ob.progress.label", { chapter: _chapter, total: CHAPTERS.length })}
        </p>
        <span className="font-body text-ink-muted" style={{ fontSize: 12 }}>
          {t("ob.progress.count", { step, total: totalSteps })}
        </span>
      </div>
      <div className="mt-2 w-full" style={{ height: 4, background: "#FFF8F0", border: "1px solid #111111" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#1B4FD8" }} />
      </div>
    </div>
  );
}
