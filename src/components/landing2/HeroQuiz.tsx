"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export type QuizAnswers = {
  stage: string;
  grades: string;
  interests: string;
  budget: string;
  country: string;
};

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
    prompt: "Where do you call home?",
    helper: "Affects visa, fees, and country quotas.",
    options: [
      { value: "us", label: "United States" },
      { value: "intl-en", label: "International (English-speaking)" },
      { value: "intl-eu", label: "International (Europe)" },
      { value: "intl-other", label: "International (other region)" },
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

  function choose(value: string) {
    const next = { ...answers, [q.key]: value } as Partial<QuizAnswers>;
    setAnswers(next);
    if (isLast) {
      onComplete(next as QuizAnswers);
    } else {
      setTimeout(() => setStep((s) => s + 1), 160);
    }
  }

  return (
    <div className="relative w-full max-w-[640px]">
      {/* Glass card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-on-surface bg-surface-container-lowest/85 p-6 sm:p-8 qc-hard-shadow-primary backdrop-blur-xl">
        {/* progress */}
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
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-headline-lg text-on-surface sm:text-display-lg">
              {q.prompt}
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">{q.helper}</p>

            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {q.options.map((opt) => {
                const selected = answers[q.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(opt.value)}
                    className={`group relative flex items-start gap-3 rounded-lg border-2 px-4 py-3.5 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary-fixed text-on-primary-fixed"
                        : "border-on-surface/15 bg-surface-container-low hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:qc-hard-shadow-sm"
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

            {isLast && answers[q.key] && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7"
              >
                <button
                  type="button"
                  onClick={() => onComplete(answers as QuizAnswers)}
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
