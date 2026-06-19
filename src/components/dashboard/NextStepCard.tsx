"use client";

import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  PenLine,
  ScanSearch,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { ComponentType } from "react";
import { useProgress, nextStep, type NextStep } from "@/lib/progress";

type StepDef = {
  index: number;
  total: number;
  eyebrow: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
  Icon: ComponentType<{ className?: string }>;
  tone: "primary" | "done";
};

function defFor(step: NextStep, isAuthenticated: boolean): StepDef {
  if (step === "refine") {
    return {
      index: 1,
      total: 3,
      eyebrow: "Recommended next step · 1 of 3",
      title: "Refine your recommendations",
      desc: "Answer a few more questions about your goals, learning style, and constraints — we'll re-rank your matches with much more precision.",
      to: isAuthenticated ? "/onboarding" : "/signin",
      cta: "Refine now",
      Icon: Compass,
      tone: "primary",
    };
  }
  if (step === "draft") {
    return {
      index: 2,
      total: 3,
      eyebrow: "Recommended next step · 2 of 3",
      title: "Draft your personal statement",
      desc: "Use what you told us to generate a Common-App essay you can shape, edit, and own — first generation is free.",
      to: "/essay",
      cta: "Start drafting",
      Icon: PenLine,
      tone: "primary",
    };
  }
  if (step === "review") {
    return {
      index: 3,
      total: 3,
      eyebrow: "Recommended next step · 3 of 3",
      title: "Review your essay with AI",
      desc: "Get line-by-line feedback, stronger hooks, and rewrites you can apply with one click.",
      to: "/essay",
      cta: "Open review",
      Icon: ScanSearch,
      tone: "primary",
    };
  }
  return {
    index: 3,
    total: 3,
    eyebrow: "You're all caught up",
    title: "All recommended steps complete",
    desc: "You've refined your matches, drafted your essay, and reviewed it. Keep iterating on any step — or explore what's coming next below.",
    to: "/universities",
    cta: "Open universities",
    Icon: CheckCircle2,
    tone: "done",
  };
}

export function NextStepCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const reduce = useReducedMotion();
  const progress = useProgress();
  const step = nextStep(progress);
  const def = defFor(step, isAuthenticated);
  const Icon = def.Icon;
  const isDone = def.tone === "done";

  const search =
    step === "refine" && !isAuthenticated ? ({ redirect: "/onboarding" } as never) : undefined;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="mt-10"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-on-surface p-6 qc-hard-shadow sm:p-8 ${
          isDone ? "bg-primary text-white" : "bg-secondary-container"
        }`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-on-surface qc-hard-shadow-sm ${
                isDone ? "bg-white text-on-surface" : "bg-surface text-on-surface"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p
                className={`font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] ${
                  isDone ? "text-white/85" : "text-on-surface/70"
                }`}
              >
                {def.eyebrow}
              </p>
              <h2
                className={`mt-1 font-display text-headline-md font-bold ${
                  isDone ? "text-white" : "text-on-surface"
                }`}
              >
                {def.title}
              </h2>
              <p
                className={`mt-1.5 max-w-xl text-body-md ${
                  isDone ? "text-white/85" : "text-on-surface/80"
                }`}
              >
                {def.desc}
              </p>
              <ProgressDots step={step} done={isDone} />
            </div>
          </div>
          <Link
            to={def.to}
            search={search}
            className={`group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface px-5 py-3 font-display text-label-lg font-bold qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
              isDone ? "bg-white text-on-surface" : "bg-primary text-white"
            }`}
          >
            {isDone ? <Sparkles className="h-4 w-4" /> : null}
            {def.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function ProgressDots({ step, done }: { step: NextStep; done: boolean }) {
  const order: NextStep[] = ["refine", "draft", "review"];
  const activeIdx = done ? order.length : order.indexOf(step);
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {order.map((s, i) => {
        const isComplete = i < activeIdx;
        const isCurrent = i === activeIdx;
        return (
          <span
            key={s}
            aria-hidden
            className={`h-1.5 rounded-full transition-all ${
              isCurrent ? "w-8" : "w-4"
            } ${
              done
                ? "bg-white/90"
                : isComplete
                  ? "bg-on-surface"
                  : isCurrent
                    ? "bg-primary"
                    : "bg-on-surface/25"
            }`}
          />
        );
      })}
      <span
        className={`ml-2 font-[var(--font-label)] text-label-sm font-semibold ${
          done ? "text-white/85" : "text-on-surface/60"
        }`}
      >
        {done ? "3 / 3" : `${activeIdx} / 3`}
      </span>
    </div>
  );
}
