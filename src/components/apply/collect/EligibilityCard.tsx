"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Check } from "lucide-react";
import type { EligibilityEntry } from "@/lib/apply/intake";
import { RequirementField } from "./RequirementField";

type Props = {
  entries: EligibilityEntry[];
  onAnswer: (target: { source: string; externalId: string }, key: string, value: unknown) => void;
};

export function EligibilityCard({ entries, onAnswer }: Props) {
  const [open, setOpen] = useState(false);

  const withQuestions = entries.filter((e) => (e.questions?.length ?? 0) > 0 || (e.blockers?.length ?? 0) > 0);
  if (withQuestions.length === 0) return null;

  const hasBlockers = withQuestions.some((e) => (e.blockers?.length ?? 0) > 0);

  return (
    <section
      className={`rounded-2xl border-2 qc-hard-shadow-sm ${hasBlockers ? "border-on-error-container bg-error-container/20" : "border-on-surface/20 bg-surface/95"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${hasBlockers ? "bg-error text-on-error" : "bg-primary/15 text-primary"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-headline-sm font-bold text-on-surface">
              {hasBlockers ? "Eligibility to confirm" : "A few eligibility questions"}
            </h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {withQuestions.length} {withQuestions.length === 1 ? "university needs" : "universities need"} a quick check.
            </p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t-2 border-on-surface/10 p-5">
          {withQuestions.map((e) => (
            <div key={`${e.target.source}::${e.target.externalId}`} className="rounded-xl border-2 border-on-surface/15 bg-surface p-4">
              <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                {e.target.name ?? e.target.externalId}
              </p>
              {(e.blockers ?? []).map((b, i) => (
                <p key={i} className="mt-1 text-body-sm text-on-error-container">
                  {b.message}
                </p>
              ))}
              {(e.questions ?? []).length > 0 && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(e.questions ?? []).map((q) => (
                    <RequirementField
                      key={q.key}
                      req={q}
                      compact
                      onChange={(v) => onAnswer({ source: e.target.source, externalId: e.target.externalId }, q.key, v)}
                    />
                  ))}
                </div>
              )}
              {e.ready && (
                <p className="mt-2 inline-flex items-center gap-1 text-label-sm text-on-surface">
                  <Check className="h-3.5 w-3.5" /> Eligible
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
