"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CHAPTERS, type ChapterId } from "@/lib/onboarding/steps";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Chapter-aware progress (MVP_SPEC: shows chapter name, not step number).
export function ChapterProgress({
  chapter,
  step,
  totalSteps,
}: {
  chapter: ChapterId;
  step: number;
  totalSteps: number;
}) {
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const pct = Math.round((step / totalSteps) * 100);
  const emoji = CHAPTERS.find((c) => c.id === chapter)?.emoji ?? "";
  const title = t(`chapter.${chapter}.title`);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label-md font-semibold text-primary">
          {t("ob.progress.label", { chapter, total: CHAPTERS.length })}
          <span className="ml-2 font-medium text-on-surface-variant">
            {emoji} {title}
          </span>
        </p>
        <span className="shrink-0 text-label-sm text-on-surface-variant">
          {t("ob.progress.count", { step, total: totalSteps })}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <motion.div
          className="h-full rounded-full bg-primary-container"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
