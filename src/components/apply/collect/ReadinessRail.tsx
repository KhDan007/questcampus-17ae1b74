"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, CircleDashed, AlertTriangle, Send } from "lucide-react";
import { useAutoApplyGate } from "@/lib/apply/autoApplyGate";
import type { IntakeTarget, EligibilityPerTarget, ChecklistResult } from "@/lib/apply/intake";

type Props = {
  targets: IntakeTarget[];
  eligibility?: EligibilityPerTarget[];
  checklist?: ChecklistResult;
};

export function ReadinessRail({ targets, eligibility, checklist }: Props) {
  const applyGate = useAutoApplyGate();
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function applyOne(t: IntakeTarget) {
    const key = `${t.system}::${t.externalId}`;
    setBusyKey(key);
    try {
      switch (applyGate.evaluate()) {
        case "signin_required": {
          const redirect =
            typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
          await navigate({ to: "/signin", search: { redirect } as never });
          return;
        }
        case "extension_required":
          await navigate({
            to: "/extension",
            search: { system: t.system, externalId: t.externalId } as never,
          });
          return;
        case "profile_incomplete":
          toast.message("Finish your Common App profile first — the extension fills from those answers.");
          await navigate({ to: "/common-app" });
          return;
        case "ready":
          await navigate({
            to: "/application/$system/$externalId",
            params: { system: t.system, externalId: t.externalId },
          });
          return;
      }
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <aside className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
      <h3 className="font-display text-headline-sm font-bold text-on-surface">Your list</h3>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">Readiness per university.</p>

      <ul className="mt-4 space-y-2">
        {targets.map((t) => {
          const key = `${t.system}::${t.externalId}`;
          const e = eligibility?.find(
            (x) => x.system === t.system && x.externalId === t.externalId,
          );
          const c = checklist?.perTarget.find(
            (x) => x.system === t.system && x.externalId === t.externalId,
          );
          const researching = t.found === false || c?.found === false;
          const ineligible = e?.verdict === "ineligible";
          const ready = (c?.checklist?.ready ?? false) && !ineligible;

          return (
            <li
              key={key}
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
                      ? "Not eligible"
                      : ready
                        ? "Ready to apply"
                        : "In progress"}
                </p>
              </div>
              {ready && (
                <button
                  type="button"
                  onClick={() => void applyOne(t)}
                  disabled={busyKey === key}
                  aria-label={`Auto-apply to ${t.name ?? t.externalId}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-on-surface bg-primary px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-50"
                >
                  {busyKey === key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Apply
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
