"use client";

import { Check } from "lucide-react";

// One linear state machine per university so the applicant always knows exactly
// where they are: Saved -> Researching -> Add your info -> Ready -> Apply. The
// current step is derived from the backend readiness quality status (the single
// source of truth), so it never disagrees with the badge or the plan.

const STEPS = [
  { key: "saved", label: "Saved" },
  { key: "researching", label: "Researching" },
  { key: "info", label: "Add your info" },
  { key: "ready", label: "Ready" },
  { key: "apply", label: "Apply" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// qualityStatus -> the step the user is currently ON.
export function readinessStepIndex(qualityStatus: string | undefined): number {
  const key: StepKey =
    qualityStatus === "ready_to_fill"
      ? "ready"
      : qualityStatus === "needs_user_input"
        ? "info"
        : qualityStatus === "needs_research" || qualityStatus === "unsupported"
          ? "researching"
          : "saved";
  return STEPS.findIndex((s) => s.key === key);
}

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function TargetReadinessStepper({
  qualityStatus,
  className,
}: {
  qualityStatus: string | undefined;
  className?: string;
}) {
  const current = readinessStepIndex(qualityStatus);

  return (
    <ol
      className={cx("flex items-center gap-1 overflow-x-auto", className)}
      aria-label="Application progress"
    >
      {STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-[var(--font-label)] text-label-sm font-bold",
                  state === "done" && "bg-tertiary text-on-tertiary",
                  state === "current" && "bg-primary text-white",
                  state === "todo" && "bg-surface-container text-on-surface-variant",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cx(
                  "whitespace-nowrap font-[var(--font-label)] text-label-sm",
                  state === "current"
                    ? "font-bold text-on-surface"
                    : "font-medium text-on-surface-variant",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cx(
                  "mx-1 h-px w-5 shrink-0",
                  i < current ? "bg-tertiary" : "bg-on-surface/15",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
