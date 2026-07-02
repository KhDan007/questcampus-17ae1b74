"use client";

import { Check, Loader2, CircleDashed, AlertTriangle } from "lucide-react";
import type { IntakeTarget, EligibilityPerTarget, ChecklistResult } from "@/lib/apply/intake";

type Props = {
  targets: IntakeTarget[];
  eligibility?: EligibilityPerTarget[];
  checklist?: ChecklistResult;
};

export function ReadinessRail({ targets, eligibility, checklist }: Props) {
  return (
    <aside className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
      <h3 className="font-display text-headline-sm font-bold text-on-surface">Your list</h3>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">Readiness per university.</p>

      <ul className="mt-4 space-y-2">
        {targets.map((t) => {
          const e = eligibility?.find(
            (x) => x.system === t.system && x.externalId === t.externalId,
          );
          const c = checklist?.perTarget.find(
            (x) => x.system === t.system && x.externalId === t.externalId,
          );
          const researching = t.found === false || c?.found === false;
          const ready = (c?.checklist.ready ?? false) && (e?.verdict !== "ineligible");
          const ineligible = e?.verdict === "ineligible";

          return (
            <li
              key={`${t.system}::${t.externalId}`}
              className="flex items-center gap-3 rounded-lg border-2 border-on-surface/10 bg-surface px-3 py-2"
            >
              <div className="shrink-0">
                {researching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
                ) : ineligible ? (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-error-container/40">
                    <AlertTriangle className="h-3.5 w-3.5 text-on-error-container" />
                  </div>
                ) : ready ? (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-tertiary/30">
                    <Check className="h-3.5 w-3.5 text-on-surface" />
                  </div>
                ) : (
                  <CircleDashed className="h-5 w-5 text-on-surface-variant" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  {t.name ?? t.externalId}
                </p>
                <p className="truncate text-label-sm text-on-surface-variant">
                  {researching
                    ? "researching requirements…"
                    : ineligible
                      ? `${e?.blockers.length ?? 0} to resolve`
                      : ready
                        ? "Ready to apply"
                        : "In progress"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
