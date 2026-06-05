"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CHAPTERS, getChapter, type ChapterId } from "@/lib/onboarding/steps";

// Chapter-aware progress (MVP_SPEC: shows chapter name, not step number).
// e.g. "Chapter 2 of 7 — Your Academic Story" with a smooth indigo fill.
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
  const current = getChapter(chapter);
  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label-md font-semibold text-primary">
          Chapter {chapter} of {CHAPTERS.length}
          <span className="ml-2 font-medium text-on-surface-variant">
            {current.emoji} {current.title}
          </span>
        </p>
        <span className="shrink-0 text-label-sm text-on-surface-variant">
          {step} / {totalSteps}
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
