"use client";

// Localization helpers for onboarding STEPS. Returns a step with title/helper/
// options/etc. translated via the i18n `t()` function.
//
// We don't mutate the source STEPS (their `value` strings are still used as
// state keys); we only swap display text. Numeric / scale labels (e.g. "out
// of 4.0") are stable enough not to need translation in many cases, but the
// build script still translates them — we look up `step.X.opt.Y.reveal.opt.Z`
// keys for select options and fall back to source.

import { useMemo } from "react";
import { useI18n } from "./I18nProvider";
import type {
  ChoiceStep,
  CountryStep,
  Option,
  RankStep,
  RevealSpec,
  Step,
  TestsStep,
  TextStep,
} from "@/lib/onboarding/steps";

function localizeReveal(
  t: (k: string) => string,
  stepNum: number,
  value: string,
  reveal: RevealSpec | undefined,
): RevealSpec | undefined {
  if (!reveal) return undefined;
  const base = `step.${stepNum}.opt.${value}.reveal`;
  if (reveal.kind === "text" || reveal.kind === "number") {
    return reveal.placeholder
      ? { ...reveal, placeholder: t(`${base}.ph`) }
      : reveal;
  }
  if (reveal.kind === "select") {
    return {
      ...reveal,
      placeholder: reveal.placeholder ? t(`${base}.ph`) : reveal.placeholder,
      options: reveal.options.map((o) => ({
        ...o,
        label: t(`${base}.opt.${o.value}`),
      })),
    };
  }
  // scale-number
  return {
    ...reveal,
    placeholder: reveal.placeholder ? t(`${base}.ph`) : reveal.placeholder,
    scales: reveal.scales.map((s) => ({
      ...s,
      label: t(`${base}.scale.${s.value}`),
    })),
  };
}

function localizeOption(
  t: (k: string) => string,
  stepNum: number,
  o: Option,
): Option {
  return {
    ...o,
    label: t(`step.${stepNum}.opt.${o.value}.label`),
    reveal: localizeReveal(t, stepNum, o.value, o.reveal),
  };
}

export function useLocalizedStep(step: Step): Step {
  const { t } = useI18n();
  return useMemo(() => {
    const base = {
      ...step,
      title: t(`step.${step.step}.title`),
      helper: step.helper ? t(`step.${step.step}.helper`) : step.helper,
      affirmation:
        "affirmation" in step && step.affirmation
          ? t(`step.${step.step}.affirmation`)
          : (step as { affirmation?: string }).affirmation,
    };
    if (step.type === "text") {
      return {
        ...(base as TextStep),
        placeholder: step.placeholder ? t(`step.${step.step}.placeholder`) : step.placeholder,
      };
    }
    if (step.type === "single" || step.type === "multi") {
      const s = step as ChoiceStep;
      return {
        ...(base as ChoiceStep),
        options: s.options.map((o) => localizeOption(t, step.step, o)),
        optionalDetail:
          s.optionalDetail && "placeholder" in s.optionalDetail && s.optionalDetail.placeholder
            ? { ...s.optionalDetail, placeholder: t(`step.${step.step}.detail.placeholder`) }
            : s.optionalDetail,
      };
    }
    if (step.type === "tests") {
      const s = step as TestsStep;
      return {
        ...(base as TestsStep),
        options: s.options.map((o) => localizeOption(t, step.step, o)),
      };
    }
    if (step.type === "rank") {
      const s = step as RankStep;
      return {
        ...(base as RankStep),
        options: s.options.map((o) => localizeOption(t, step.step, o)),
      };
    }
    return base as CountryStep;
  }, [step, t]);
}

/** Synchronous variant for code paths without React state (e.g. profile breakdown). */
export function localizeStepWith(
  t: (k: string) => string,
  step: Step,
): Step {
  // Re-uses the logic above but without React memoization.
  const base = {
    ...step,
    title: t(`step.${step.step}.title`),
    helper: step.helper ? t(`step.${step.step}.helper`) : step.helper,
  };
  if (step.type === "text") {
    return { ...(base as TextStep), placeholder: step.placeholder ? t(`step.${step.step}.placeholder`) : step.placeholder };
  }
  if (step.type === "single" || step.type === "multi") {
    const s = step as ChoiceStep;
    return { ...(base as ChoiceStep), options: s.options.map((o) => localizeOption(t, step.step, o)) };
  }
  if (step.type === "tests") {
    const s = step as TestsStep;
    return { ...(base as TestsStep), options: s.options.map((o) => localizeOption(t, step.step, o)) };
  }
  if (step.type === "rank") {
    const s = step as RankStep;
    return { ...(base as RankStep), options: s.options.map((o) => localizeOption(t, step.step, o)) };
  }
  return base as CountryStep;
}

/** Translate a chapter title by id. */
export function useChapterTitle(id: number): string {
  const { t } = useI18n();
  return t(`chapter.${id}.title`);
}
