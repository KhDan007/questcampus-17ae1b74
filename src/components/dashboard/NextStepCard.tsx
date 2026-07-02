"use client";

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  PenLine,
  ScanSearch,
  Sparkles,
  CheckCircle2,
  Upload,
  MessageSquare,
  ClipboardCheck,
  Rocket,
} from "lucide-react";
import type { ComponentType } from "react";
import { useProgress, nextStep, type NextStep } from "@/lib/progress";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  useGuidedSteps,
  describeGuidedStep,
  type GuidedStep,
} from "@/lib/apply/guidedSteps";
import type { BackendTarget } from "@/lib/apply/intake";

type StepDef = {
  eyebrow: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
  Icon: ComponentType<{ className?: string }>;
  tone: "primary" | "done";
  onClick?: () => void;
};

function stepIcon(kind: GuidedStep["kind"]): ComponentType<{ className?: string }> {
  switch (kind) {
    case "document":
      return Upload;
    case "essay":
      return PenLine;
    case "eligibility":
      return ClipboardCheck;
    case "field":
    default:
      return MessageSquare;
  }
}

function scrollToPrep() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("dashboard-prep");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function fallbackDef(step: NextStep, isAuthenticated: boolean): StepDef {
  if (step === "refine") {
    return {
      eyebrow: "Recommended next step",
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
      eyebrow: "Recommended next step",
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
      eyebrow: "Recommended next step",
      title: "Review your essay with AI",
      desc: "Get line-by-line feedback, stronger hooks, and rewrites you can apply with one click.",
      to: "/essay",
      cta: "Open review",
      Icon: ScanSearch,
      tone: "primary",
    };
  }
  return {
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

  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({
        system: s.source,
        externalId: s.externalId,
        name: s.name,
      })),
    [saved],
  );
  const guided = useGuidedSteps(targets);

  const hasTargets = targets.length > 0;
  const guidedReady = !guided.loading && hasTargets && guided.total > 0;

  let def: StepDef;
  let progressCopy: string | null = null;

  if (hasTargets && guided.next) {
    // A real, unsatisfied prep step exists.
    const s = guided.next;
    def = {
      eyebrow: "Recommended next step",
      title: describeGuidedStep(s),
      desc:
        s.kind === "document"
          ? "One upload — reused across every portal you apply to."
          : s.kind === "essay"
            ? "Draft it once in the Essay Assistant; we'll reuse it where it fits."
            : s.kind === "eligibility"
              ? "Quick answer to confirm you match this school's requirements."
              : "One quick answer — saved everywhere it's asked.",
      to: s.kind === "essay" ? "/essay" : "/prep",
      cta: s.kind === "essay" ? "Draft in Essay Assistant" : "Open guided prep",
      Icon: stepIcon(s.kind),
      tone: "primary",
    };
    progressCopy = `${guided.doneCount} of ${guided.total} done`;
  } else if (guidedReady && guided.total > 0) {
    // All required prep is done — targets are ready to launch.
    const readyName =
      guided.steps[0]?.targetName ??
      targets[0]?.name ??
      "your first university";
    def = {
      eyebrow: "You're ready",
      title: `Apply to ${readyName} — you're ready`,
      desc: "Every required item is complete. Launch auto-apply from guided prep.",
      to: "/prep",
      cta: "Launch auto-apply",
      Icon: Rocket,
      tone: "done",
    };
    progressCopy = `${guided.doneCount} of ${guided.total} done`;
  } else {
    // No saved universities yet (or intake still loading) → fall back to the
    // refine/draft/review ladder.
    def = fallbackDef(nextStep(progress), isAuthenticated);
  }

  const Icon = def.Icon;
  const isDone = def.tone === "done";
  const search =
    !hasTargets && def.to === "/signin"
      ? ({ redirect: "/onboarding" } as never)
      : undefined;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="h-full"
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-on-surface p-6 qc-hard-shadow sm:p-7 ${
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
              {progressCopy ? (
                <GuidedProgress
                  done={guided.doneCount}
                  total={guided.total}
                  label={progressCopy}
                  onWhite={isDone}
                />
              ) : (
                <ProgressDots step={nextStep(progress)} done={isDone} />
              )}
            </div>
          </div>
          {def.onClick ? (
            <button
              type="button"
              onClick={def.onClick}
              className={`group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface px-5 py-3 font-display text-label-lg font-bold qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
                isDone ? "bg-white text-on-surface" : "bg-primary text-white"
              }`}
            >
              {isDone ? <Sparkles className="h-4 w-4" /> : null}
              {def.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </motion.section>
  );
}

function GuidedProgress({
  done,
  total,
  label,
  onWhite,
}: {
  done: number;
  total: number;
  label: string;
  onWhite: boolean;
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-3 max-w-sm">
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full ${
          onWhite ? "bg-white/25" : "bg-on-surface/15"
        }`}
      >
        <div
          className={`h-full transition-[width] duration-300 ${
            onWhite ? "bg-white" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={`mt-1.5 font-[var(--font-label)] text-label-sm font-semibold ${
          onWhite ? "text-white/85" : "text-on-surface/60"
        }`}
      >
        {label}
      </p>
    </div>
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
