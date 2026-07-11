"use client";

import { Check } from "lucide-react";

type Step = { id: string; label: string };

const STEPS: Step[] = [
  { id: "pick", label: "Pick" },
  { id: "prep", label: "Prep" },
  { id: "research", label: "Research" },
  { id: "apply", label: "Apply" },
];

export function ApplyStepper({ current }: { current: "pick" | "prep" | "research" | "apply" }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex w-full items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 font-[var(--font-label)] text-label-sm font-bold ${
                done
                  ? "border-on-surface bg-tertiary text-on-tertiary"
                  : active
                    ? "border-on-surface bg-primary text-white"
                    : "border-on-surface/30 bg-surface text-on-surface-variant"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden font-[var(--font-label)] text-label-md font-semibold sm:inline ${
                active ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-0.5 flex-1 ${done ? "bg-tertiary" : "bg-on-surface/15"}`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
