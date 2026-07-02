"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Send, Loader2, Lock } from "lucide-react";
import { useApplyActions } from "@/lib/applyQueue/client";
import type { AutoApplyEntitlement, BackendTarget } from "@/lib/apply/intake";

type Props = {
  entitlement: AutoApplyEntitlement | undefined;
  percent: number;
  readyTargets: BackendTarget[];
};

export function LaunchBar({ entitlement, percent, readyTargets }: Props) {
  const navigate = useNavigate();
  const { startApply } = useApplyActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = entitlement?.gate;
  const gateEnabled = gate === "ready_free" || gate === "ready_paid";
  const needsPayment = gate === "needs_payment";
  const readyCount = readyTargets.length;
  const hasReady = readyCount > 0;
  const enabled = gateEnabled && hasReady;

  const label = !entitlement
    ? "Checking readiness…"
    : gate === "not_ready"
      ? "Finish your requirements to continue"
      : needsPayment
        ? "Unlock full auto-apply — $15/mo"
        : !hasReady
          ? "Finish a university's requirements to apply"
          : gate === "ready_free"
            ? "Start your free application"
            : `Auto-apply to ${readyCount} ready`;

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
      for (const t of readyTargets) {
        try {
          const id = await startApply({
            system: t.system,
            externalId: t.externalId,
            targetName: t.name,
          });
          if (!firstJobId) firstJobId = id;
        } catch (e) {
          setError(e instanceof Error ? e.message : "One application couldn't start");
        }
      }
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
