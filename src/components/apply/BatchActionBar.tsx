"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";
import { useApplyActions } from "@/lib/applyQueue/client";

export function BatchActionBar() {
  const { items, count, clear } = useApplySelection();
  const { startApply } = useApplyActions();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function researchAll() {
    if (busy || items.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      for (const it of items) {
        try {
          await startApply({ system: it.source, externalId: it.externalId, targetName: it.name });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Failed to start one job");
        }
      }
      clear();
      void navigate({ to: "/apply" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border-2 border-on-surface bg-surface px-4 py-3 qc-hard-shadow sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={clear}
              aria-label="Clear selection"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-surface text-on-surface hover:bg-surface-container"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-label-lg font-bold text-on-surface">
                {count} {count === 1 ? "university" : "universities"} selected
              </p>
              <p className="truncate text-label-sm text-on-surface-variant">
                {err ?? "Pick what to do next."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              disabled={busy}
              onClick={researchAll}
              className="inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60 sm:flex-none"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Deep research
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => navigate({ to: "/apply/prep" })}
              className="inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3.5 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60 sm:flex-none sm:px-4"
            >
              Apply to {count} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
