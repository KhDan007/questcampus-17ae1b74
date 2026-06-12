"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export type QuizAnswers = {
  stage: string;
  grades: string;
  interests: string[];
  budget: string;
  country: string;
  countries?: string[];
};

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Ireland", label: "Ireland" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "Sweden", label: "Sweden" },
  { value: "Italy", label: "Italy" },
  { value: "Spain", label: "Spain" },
  { value: "Denmark", label: "Denmark" },
  { value: "Finland", label: "Finland" },
  { value: "Belgium", label: "Belgium" },
  { value: "Austria", label: "Austria" },
  { value: "Japan", label: "Japan" },
  { value: "China", label: "China" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

const QUESTIONS: {
  key: keyof QuizAnswers;
  prompt: string;
  helper: string;
  options: { value: string; label: string; sub?: string }[];
}[] = [
  {
    key: "stage",
    prompt: "Where are you in your journey?",
    helper: "We'll tune the timeline to where you actually are.",
    options: [
      { value: "hs-junior", label: "High school junior", sub: "Year before applying" },
      { value: "hs-senior", label: "High school senior", sub: "Applying this cycle" },
      { value: "gap", label: "Gap year", sub: "Pausing, planning, deciding" },
      { value: "transfer", label: "Transferring", sub: "Already at uni, want a change" },
    ],
  },
  {
    key: "grades",
    prompt: "How are your grades looking?",
    helper: "Honest answers get honest matches.",
    options: [
      { value: "top", label: "Top of class", sub: "GPA 3.8+ / A* heavy" },
      { value: "strong", label: "Strong", sub: "GPA 3.4–3.8 / mostly A/B" },
      { value: "solid", label: "Solid", sub: "GPA 3.0–3.4 / B average" },
      { value: "rebuilding", label: "Rebuilding", sub: "Under 3.0 — still options" },
    ],
  },
  {
    key: "interests",
    prompt: "What pulls you in?",
    helper: "Pick the closest — we'll refine after.",
    options: [
      { value: "stem", label: "STEM & engineering" },
      { value: "biz", label: "Business & economics" },
      { value: "arts", label: "Arts & humanities" },
      { value: "med", label: "Medicine & health" },
    ],
  },
  {
    key: "budget",
    prompt: "Money talk — what fits?",
    helper: "Filters financial aid + scholarship matches.",
    options: [
      { value: "aid", label: "Need significant aid", sub: "Full scholarships preferred" },
      { value: "partial", label: "Some support needed", sub: "Partial scholarships welcome" },
      { value: "self", label: "Self-funded", sub: "Cost is not the gatekeeper" },
      { value: "any", label: "Open to anything", sub: "Show me everything" },
    ],
  },
  {
    key: "country",
    prompt: "Where do you wanna go?",
    helper: "Affects visa, fees, and country quotas.",
    options: [
      { value: "us", label: "United States", sub: "US schools only" },
      { value: "intl-en", label: "English-speaking", sub: "UK, Canada, Australia, Ireland" },
      { value: "intl-eu", label: "Europe", sub: "Top European universities" },
      { value: "custom", label: "Pick specific countries", sub: "Choose your own list" },
    ],
  },
];

export function HeroQuiz({ onComplete }: { onComplete: (answers: QuizAnswers) => void }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const isLast = step === total - 1;
  const progress = useMemo(() => ((step + 1) / total) * 100, [step, total]);

  const isCountryStep = q.key === "country";
  const countryChoice = answers.country;
  const selectedCountries = answers.countries ?? [];
  const customSelected = isCountryStep && countryChoice === "custom";

  const MULTI_SELECT_KEYS: (keyof QuizAnswers)[] = ["interests"];
  const isMultiSelect = MULTI_SELECT_KEYS.includes(q.key);

  function choose(value: string) {
    if (q.key === "country") {
      if (value === "custom") {
        setAnswers((a) => ({ ...a, country: "custom" }));
        return;
      }
      const next = { ...answers, country: value, countries: undefined } as Partial<QuizAnswers>;
      setAnswers(next);
      onComplete(next as QuizAnswers);
      return;
    }

    if (isMultiSelect) {
      setAnswers((a) => {
        const cur = ((a[q.key] ?? []) as string[]);
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        return { ...a, [q.key]: next };
      });
      return;
    }

    const next = { ...answers, [q.key]: value } as Partial<QuizAnswers>;
    setAnswers(next);
    if (isLast) {
      onComplete(next as QuizAnswers);
    } else {
      setTimeout(() => setStep((s) => s + 1), 160);
    }
  }

  function toggleCountry(value: string) {
    setAnswers((a) => {
      const cur = a.countries ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...a, country: "custom", countries: next };
    });
  }

  const currentMultiValues = (answers[q.key] ?? []) as string[];
  const canContinueMulti = isMultiSelect && currentMultiValues.length > 0;
  const canSubmitCustom = customSelected && selectedCountries.length > 0;

  return (
    <div className="relative w-full max-w-[640px]">
      <div className="relative overflow-hidden rounded-xl border-2 border-on-surface bg-surface-container-lowest/85 p-5 sm:p-8 qc-hard-shadow-primary backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Step {step + 1} of {total}
          </div>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="font-[var(--font-label)] text-label-sm text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-30"
          >
            Back
          </button>
        </div>

        <div className="mb-7 h-[6px] w-full overflow-hidden rounded-full bg-on-surface/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.key}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-headline-lg text-on-surface sm:text-display-lg">
              {q.prompt}
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">{q.helper}</p>

            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {q.options.map((opt) => {
                const selected =
                  isCountryStep ? countryChoice === opt.value : answers[q.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(opt.value)}
                    className={`group relative flex items-start gap-3 rounded-lg border-2 px-4 py-3.5 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary-fixed text-on-primary-fixed"
                        : "border-on-surface/15 bg-surface-container-low hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:shadow-[2px_2px_0_0_var(--color-on-surface)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        selected ? "border-primary bg-primary text-white" : "border-on-surface/30"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                        {opt.label}
                      </span>
                      {opt.sub && (
                        <span className="mt-0.5 block text-label-sm font-normal text-on-surface-variant">
                          {opt.sub}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {customSelected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="max-h-[260px] overflow-y-auto rounded-lg border-2 border-on-surface/15 bg-surface-container-low p-3">
                  <div className="flex flex-wrap gap-2">
                    {COUNTRY_OPTIONS.map((c) => {
                      const sel = selectedCountries.includes(c.value);
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => toggleCountry(c.value)}
                          className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-label-sm font-semibold transition-all ${
                            sel
                              ? "border-primary bg-primary-fixed text-on-primary-fixed"
                              : "border-on-surface/15 bg-surface-container-lowest text-on-surface hover:border-on-surface hover:-translate-y-0.5"
                          }`}
                        >
                          {sel && <Check className="h-3 w-3" />}
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-2 text-label-sm text-on-surface-variant">
                  Pick one or more — we'll match only within these countries.
                </p>
              </motion.div>
            )}

            {isLast && canSubmitCustom && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7"
              >
                <button
                  type="button"
                  onClick={() =>
                    onComplete({
                      ...(answers as QuizAnswers),
                      country: "custom",
                      countries: selectedCountries,
                    })
                  }
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-4 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none animate-pulse-glow"
                >
                  Show me my matches
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
