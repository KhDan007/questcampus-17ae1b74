"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChapterProgress } from "./ChapterProgress";
import { StepRenderer } from "./StepRenderer";
import { saveProfileToLocal } from "@/lib/onboarding/storage";
import { useAuth } from "@/lib/auth/useAuth";
import {
  TOTAL_STEPS,
  getStep,
  isStepAnswered,
  type Step,
} from "@/lib/onboarding/steps";
import type { Answers, AnswerValue } from "@/lib/onboarding/types";
import { personalize } from "@/lib/onboarding/personalize";

export function OnboardingFlow({
  sessionId,
  initialAnswers,
  initialStep,
}: {
  sessionId: string;
  initialAnswers: Answers;
  initialStep: number;
}) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { token } = useAuth();
  const save = useMutation(api.onboarding.saveProgress);
  const complete = useMutation(api.onboarding.complete);

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [stepNum, setStepNum] = useState(Math.min(Math.max(initialStep, 1), TOTAL_STEPS));
  const [direction, setDirection] = useState(1);
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const step = getStep(stepNum)!;
  const firstName = typeof answers.firstName === "string" ? answers.firstName : undefined;

  const value = answers[step.field];
  const answered = isStepAnswered(step, value);
  const canAdvance = !step.required || answered;
  const isLast = stepNum === TOTAL_STEPS;

  function setValue(v: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [step.field]: v }));
  }

  function persist(nextStep: number, merged: Answers) {
    void save({ sessionId, answers: merged, currentStep: nextStep, token: token ?? undefined }).catch(() => {});
    saveProfileToLocal(merged, nextStep);
  }

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  // Enter or → advances. ← or Esc goes back. No up/down selection.
  // Enter advances even from inside text/number inputs.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const tag = el.tagName;

      // If a dropdown/combobox is open, let it handle its own keys.
      if (el.closest('[role="combobox"],[role="listbox"]')) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (canAdvance && !finishing) goNext();
        return;
      }

      // Arrow nav — but not while typing in an input (cursor movement).
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
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

    if (step.affirmation && answered) {
      setAffirmation(personalize(step.affirmation, firstName));
      setTimeout(() => setAffirmation(null), 2600);
    }

    if (isLast) {
      setFinishing(true);
      // Persist locally first so /profile always has data, then redirect
      // immediately. The Convex write is fire-and-forget — we never block the
      // redirect on the network (it would hang if functions aren't deployed).
      saveProfileToLocal(merged, TOTAL_STEPS);
      void complete({ sessionId, answers: merged, completedAt: Date.now(), token: token ?? undefined }).catch(() => {});
      navigate({ to: "/profile" });
      return;
    }

    const next = stepNum + 1;
    persist(next, merged);
    setDirection(1);
    setStepNum(next);
  }

  function goBack() {
    if (stepNum === 1) return;
    setDirection(-1);
    setStepNum((s) => s - 1);
  }

  function skip() {
    if (step.required) return;
    goNext();
  }

  if (finishing) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-2xl"
        >
          🎓
        </motion.div>
        <h1 className="mt-6 text-display-lg-mobile text-on-background">
          That&apos;s everything{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          We&apos;ve built your profile — redirecting to your results…
        </p>
        <div className="mt-8 flex items-center gap-2">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-2.5 w-2.5 rounded-full bg-primary-container"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[680px] flex-col px-4 pb-12 pt-24 sm:px-6">
      <ChapterProgress chapter={step.chapter} step={stepNum} totalSteps={TOTAL_STEPS} />

      <div className="relative mt-10 flex-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepNum}
            custom={direction}
            // Vertical + fade only — never translate on X. A horizontal slide
            // leaves the step offset (e.g. translateX(24px)) until it settles,
            // and any re-render (selecting an option) snaps it back, shifting the
            // whole centered column sideways. Y/opacity keeps it put horizontally.
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <StepHeader step={step} name={firstName} />
            <div className="mt-7">
              <StepRenderer step={step} value={value} onChange={setValue} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Affirmation toast */}
      <AnimatePresence>
        {affirmation && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto w-fit rounded-full bg-tertiary-container px-4 py-2 text-label-md text-on-tertiary shadow-lg"
          >
            {affirmation}
          </motion.p>
        )}
      </AnimatePresence>

      <Footer
        stepNum={stepNum}
        canAdvance={canAdvance}
        isRequired={!!step.required}
        isLast={isLast}
        onBack={goBack}
        onSkip={skip}
        onNext={goNext}
      />
    </div>
  );
}

function StepHeader({ step, name }: { step: Step; name?: string }) {
  return (
    <div>
      <h1 className="text-display-lg-mobile text-on-background">
        {personalize(step.title, name)}
      </h1>
      {step.helper && (
        <p className="mt-3 text-body-lg text-on-surface-variant">
          {personalize(step.helper, name)}
        </p>
      )}
    </div>
  );
}

function Footer({
  stepNum,
  canAdvance,
  isRequired,
  isLast,
  onBack,
  onSkip,
  onNext,
}: {
  stepNum: number;
  canAdvance: boolean;
  isRequired: boolean;
  isLast: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 bg-gradient-to-t from-surface via-surface/95 to-transparent pb-4 pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={stepNum === 1}
        className="text-label-md text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-0"
      >
        ← Back
      </button>

      <div className="flex items-center gap-4">
        {!isRequired && (
          <button
            type="button"
            onClick={onSkip}
            className="text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Skip for now →
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary-container px-7 text-label-md text-on-primary shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)] transition-all duration-200 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isLast ? "See my matches →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
