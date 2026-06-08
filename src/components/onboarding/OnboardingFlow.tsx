"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChapterProgress } from "./ChapterProgress";
import { StepRenderer } from "./StepRenderer";
import { saveProfileToLocal } from "@/lib/onboarding/storage";
import {
  TOTAL_STEPS,
  CHAPTERS,
  getStep,
  isStepAnswered,
  type ChapterId,
  type Step,
} from "@/lib/onboarding/steps";
import type { Answers, AnswerValue } from "@/lib/onboarding/types";
import { personalize } from "@/lib/onboarding/personalize";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLocalizedStep } from "@/lib/i18n/steps";

// Chapter color rotation per brief.
const CHAPTER_COLORS: Record<ChapterId, { bg: string; fg: string }> = {
  1: { bg: "#E63022", fg: "#FFFFFF" },
  2: { bg: "#1B4FD8", fg: "#FFFFFF" },
  3: { bg: "#FFCF00", fg: "#111111" },
  4: { bg: "#E63022", fg: "#FFFFFF" },
  5: { bg: "#1B4FD8", fg: "#FFFFFF" },
  6: { bg: "#FFCF00", fg: "#111111" },
  7: { bg: "#E63022", fg: "#FFFFFF" },
};

function ChapterIcon({ chapter, color }: { chapter: ChapterId; color: string }) {
  const s = { stroke: color, strokeWidth: 3, fill: "none" } as const;
  switch (chapter) {
    case 1: // grad cap
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <polygon points="60,20 110,42 60,64 10,42" />
          <path d="M30 52 V72 Q60 88 90 72 V52" />
          <line x1="110" y1="42" x2="110" y2="72" />
        </svg>
      );
    case 2: // open book
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <path d="M10 30 Q40 22 60 32 Q80 22 110 30 V92 Q80 84 60 94 Q40 84 10 92 Z" />
          <line x1="60" y1="32" x2="60" y2="94" />
        </svg>
      );
    case 3: // compass
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <circle cx="60" cy="60" r="48" />
          <polygon points="60,22 70,60 60,98 50,60" fill={color} />
        </svg>
      );
    case 4: // globe
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <circle cx="60" cy="60" r="48" />
          <ellipse cx="60" cy="60" rx="24" ry="48" />
          <line x1="12" y1="60" x2="108" y2="60" />
        </svg>
      );
    case 5: // map pin
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <path d="M60 16 C36 16 22 34 22 54 C22 80 60 108 60 108 C60 108 98 80 98 54 C98 34 84 16 60 16 Z" />
          <circle cx="60" cy="52" r="14" />
        </svg>
      );
    case 6: // star
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} strokeLinejoin="round" aria-hidden>
          <polygon points="60,10 75,46 114,46 82,68 95,108 60,84 25,108 38,68 6,46 45,46" />
        </svg>
      );
    case 7: // telescope
      return (
        <svg width="120" height="120" viewBox="0 0 120 120" {...s} aria-hidden>
          <polygon points="20,38 90,18 100,42 30,62" />
          <line x1="60" y1="50" x2="60" y2="100" />
          <line x1="40" y1="100" x2="80" y2="100" />
        </svg>
      );
  }
}

export function OnboardingFlow({
  sessionId,
  token,
  initialAnswers,
  initialStep,
}: {
  sessionId: string;
  token?: string;
  initialAnswers: Answers;
  initialStep: number;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const save = useMutation(api.onboarding.saveProgress);
  const complete = useMutation(api.onboarding.complete);

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [stepNum, setStepNum] = useState(Math.min(Math.max(initialStep, 1), TOTAL_STEPS));
  const [finishing, setFinishing] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const step = getStep(stepNum)!;
  const localizedStep = useLocalizedStep(step);
  const firstName = typeof answers.firstName === "string" ? answers.firstName : undefined;

  const value = answers[step.field];
  const answered = isStepAnswered(step, value);
  const canAdvance = !step.required || answered;
  const isLast = stepNum === TOTAL_STEPS;

  const chapterColor = CHAPTER_COLORS[step.chapter];

  function setValue(v: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [step.field]: v }));
  }

  function persist(nextStep: number, merged: Answers) {
    void save({ sessionId, answers: merged, currentStep: nextStep, token }).catch(() => {});
    saveProfileToLocal(merged, nextStep);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('[role="combobox"],[role="listbox"]')) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (canAdvance && !finishing) goNext();
        return;
      }
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      if (typing) return;
      if (e.key === "ArrowLeft" || e.key === "Escape") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight" && canAdvance && !finishing) {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepNum, canAdvance, isLast, finishing, answers]);

  function goNext() {
    const merged = answers;
    if (isLast) {
      setFinishing(true);
      saveProfileToLocal(merged, TOTAL_STEPS);
      void complete({ sessionId, answers: merged, completedAt: Date.now(), token }).catch(() => {});
      navigate({ to: "/profile" });
      return;
    }
    const next = stepNum + 1;
    const nextChapter = getStep(next)!.chapter;
    if (nextChapter !== step.chapter) {
      setFlashColor(CHAPTER_COLORS[nextChapter].bg);
      setTimeout(() => setFlashColor(null), 500);
    }
    persist(next, merged);
    setStepNum(next);
  }

  function goBack() {
    if (stepNum === 1) return;
    setStepNum((s) => s - 1);
  }

  function skip() {
    if (step.required) return;
    goNext();
  }

  if (finishing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
        <div>
          <div className="font-display text-ink" style={{ fontWeight: 800, fontSize: 56, lineHeight: 1 }}>
            {firstName
              ? t("ob.flow.finished.titleNamed", { name: firstName })
              : t("ob.flow.finished.title")}
          </div>
          <p className="mt-4 font-body text-ink-muted" style={{ fontSize: 16 }}>
            {t("ob.flow.finished.subtitle")}
          </p>
        </div>
      </div>
    );
  }

  const chapterTitle = t(`chapter.${step.chapter}.title`);

  return (
    <div className="min-h-screen w-full" style={{ background: "#FFF8F0" }}>
      {flashColor && (
        <div className="bc-chapter-flash" style={{ background: flashColor }} />
      )}

      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* LEFT — chapter sidebar */}
        <aside
          className="flex w-full flex-col justify-between lg:w-[320px] lg:fixed lg:left-0 lg:top-0 lg:h-screen"
          style={{ background: chapterColor.bg, color: chapterColor.fg, padding: "32px 24px", borderRight: "2px solid #111111" }}
        >
          <div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 80, lineHeight: 0.9, color: chapterColor.fg }}>
              {String(step.chapter).padStart(2, "0")}
            </div>
            <div className="mt-3 font-display" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.15, color: chapterColor.fg }}>
              {chapterTitle}
            </div>
          </div>
          <div className="my-8 hidden lg:flex items-center justify-center">
            <ChapterIcon chapter={step.chapter} color={chapterColor.fg} />
          </div>
          <div
            className="font-body"
            style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: chapterColor.fg, opacity: 0.7 }}
          >
            {t("ob.progress.label", { chapter: step.chapter, total: CHAPTERS.length })}
          </div>
        </aside>

        {/* RIGHT — content panel */}
        <main className="flex flex-1 flex-col lg:ml-[320px]" style={{ background: "#FFF8F0", minHeight: "100vh" }}>
          <div className="sticky top-0 z-10 px-6 pt-6 pb-3" style={{ background: "#FFF8F0", borderBottom: "2px solid #111111" }}>
            <div className="mx-auto max-w-[560px]">
              <ChapterProgress chapter={step.chapter} step={stepNum} totalSteps={TOTAL_STEPS} />
            </div>
          </div>

          <div className="flex-1 px-6 py-10">
            <div className="mx-auto max-w-[560px]">
              <StepHeader step={localizedStep} name={firstName} />
              <div className="mt-7">
                <StepRenderer step={localizedStep} value={value} onChange={setValue} />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 px-6 py-5" style={{ background: "#FFF8F0", borderTop: "2px solid #111111" }}>
            <div className="mx-auto flex max-w-[560px] items-center justify-between gap-4">
              <button
                type="button"
                onClick={goBack}
                disabled={stepNum === 1}
                className="font-body text-ink"
                style={{ fontWeight: 500, fontSize: 14, opacity: stepNum === 1 ? 0 : 1 }}
              >
                ← {t("ob.flow.back")}
              </button>
              <div className="flex items-center gap-4">
                {!step.required && (
                  <button
                    type="button"
                    onClick={skip}
                    className="font-body text-ink-muted"
                    style={{ fontWeight: 500, fontSize: 14 }}
                  >
                    {t("ob.flow.skip")}
                  </button>
                )}
                <button type="button" onClick={goNext} disabled={!canAdvance} className="bc-btn">
                  {isLast ? t("ob.flow.see") : t("ob.flow.continue")} →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StepHeader({ step, name }: { step: Step; name?: string }) {
  return (
    <div>
      <h1 className="font-display text-ink" style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
        {personalize(step.title, name)}
      </h1>
      {step.helper && (
        <p className="mt-3 font-body text-ink-muted" style={{ fontSize: 14 }}>
          {personalize(step.helper, name)}
        </p>
      )}
    </div>
  );
}
