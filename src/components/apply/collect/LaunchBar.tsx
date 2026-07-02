"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Send, Loader2, Lock } from "lucide-react";
import { useApplyActions } from "@/lib/applyQueue/client";
import { useApplySelection } from "@/lib/applyQueue/selection";
import type { AutoApplyEntitlement } from "@/lib/apply/intake";

type Props = {
  entitlement: AutoApplyEntitlement | undefined;
  percent: number;
};

export function LaunchBar({ entitlement, percent }: Props) {
  const navigate = useNavigate();
  const { items, clear } = useApplySelection();
  const { startApply } = useApplyActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = entitlement?.gate;
  const enabled = gate === "ready_free" || gate === "ready_paid";
  const needsPayment = gate === "needs_payment";

  const label = !entitlement
    ? "Checking readiness…"
    : gate === "not_ready"
      ? "Finish your requirements to continue"
      : gate === "needs_payment"
        ? "Unlock full auto-apply — $15/mo"
        : gate === "ready_free"
          ? `Start your free application (${items.length})`
          : `Auto-apply to ${items.length} ${items.length === 1 ? "university" : "universities"}`;

  async function launch() {
    if (needsPayment) {
      void navigate({ to: "/apply" });
      return;
    }
    if (!enabled) return;
    setBusy(true);
    setError(null);
    try {
      let firstJobId: string | null = null;
      for (const it of items) {
        try {
          const id = await startApply({ system: it.source, externalId: it.externalId, targetName: it.name });
          if (!firstJobId) firstJobId = id;
        } catch (e) {
          setError(e instanceof Error ? e.message : "One application couldn't start");
        }
      }
      clear();
      if (firstJobId) void navigate({ to: "/apply/$jobId", params: { jobId: firstJobId } });
      else void navigate({ to: "/apply" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-full max-w-(--container-content) px-2">
      <div className="rounded-2xl border-2 border-on-surface bg-surface/95 p-4 shadow-lg backdrop-blur qc-hard-shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
              {percent}% ready across your list
            </p>
            <div className="mt-1.5 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-on-surface/10">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            {error && <p className="mt-1 text-label-sm text-on-error-container">{error}</p>}
          </div>
          <button
            type="button"
            onClick={launch}
            disabled={!enabled && !needsPayment}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : needsPayment ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
