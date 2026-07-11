"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Send, Loader2, Lock } from "lucide-react";
import { useAutoApplyGate } from "@/lib/apply/autoApplyGate";
import { useFreeHook } from "@/lib/auth/useAuth";
import type { AutoApplyEntitlement, BackendTarget } from "@/lib/apply/intake";

type Props = {
  entitlement: AutoApplyEntitlement | undefined;
  percent: number;
  readyTargets: BackendTarget[];
  hiddenIncompleteCount?: number;
};

export function LaunchBar({ entitlement, percent, readyTargets, hiddenIncompleteCount = 0 }: Props) {
  const navigate = useNavigate();
  const applyGate = useAutoApplyGate();
  const freeHook = useFreeHook();
  const [busy, setBusy] = useState(false);

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
        ? freeHook
          ? "Start free trial — $15/mo after"
          : "Unlock full auto-apply — $15/mo"
        : !hasReady
          ? "Finish a university's requirements to apply"
          : gate === "ready_free"
            ? "Start your free application"
            : `Auto-apply to ${readyCount} ready`;

  async function launch() {
    if (needsPayment) {
      void navigate({ to: "/unlock" });
      return;
    }
    if (!enabled) return;
    setBusy(true);
    try {
      const first = readyTargets[0];
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
            search: { system: first.system, externalId: first.externalId } as never,
          });
          return;
        case "profile_incomplete":
          toast.message("Finish your Common App profile first — the extension fills from those answers.");
          await navigate({ to: "/common-app" });
          return;
        case "ready":
          await navigate({
            to: "/application/$system/$externalId",
            params: { system: first.system, externalId: first.externalId },
          });
          return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-full max-w-(--container-content) px-2">
      <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow">
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
            {hiddenIncompleteCount > 0 && (
              <p className="mt-1.5 text-label-sm text-on-surface-variant">
                {hiddenIncompleteCount} {hiddenIncompleteCount === 1 ? "university" : "universities"} hidden — requirements not fully captured yet.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={launch}
            disabled={!enabled && !needsPayment}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
