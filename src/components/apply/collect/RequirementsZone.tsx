"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { IntakeRequirement } from "@/lib/apply/intake";
import { RequirementField } from "./RequirementField";

type Props = {
  title: string;
  subtitle?: string;
  requirements: IntakeRequirement[];
  onChange: (key: string, value: unknown) => void;
  defaultOpen?: boolean;
};

function isAnswered(r: IntakeRequirement): boolean {
  if (r.answered) return true;
  const v = r.value;
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function RequirementsZone({
  title,
  subtitle,
  requirements,
  onChange,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAnswered, setShowAnswered] = useState(false);

  const answered = requirements.filter(isAnswered);
  const unanswered = requirements.filter((r) => !isAnswered(r));
  const complete = requirements.length > 0 && unanswered.length === 0;
  const visible = showAnswered ? requirements : unanswered;

  return (
    <section className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 qc-hard-shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {complete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/25 px-2.5 py-0.5 text-label-sm text-on-surface">
              <Check className="h-3.5 w-3.5" /> Done
            </span>
          ) : (
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              {answered.length}/{requirements.length}
            </span>
          )}
          <ChevronDown
            className={`h-5 w-5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-on-surface/10 p-5">
          {requirements.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nothing to answer here.</p>
          ) : (
            <>
              {visible.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">
                  All set. Answered items are hidden — <button className="underline underline-offset-2" type="button" onClick={() => setShowAnswered(true)}>show them</button>.
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {visible.map((r) => (
                  <RequirementField key={r.key} req={r} onChange={(v) => onChange(r.key, v)} />
                ))}
              </div>
              {answered.length > 0 && unanswered.length > 0 && (
                <div className="mt-4 text-right">
                  <button
                    type="button"
                    onClick={() => setShowAnswered((s) => !s)}
                    className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
                  >
                    {showAnswered ? "Hide answered" : `Show ${answered.length} answered`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
