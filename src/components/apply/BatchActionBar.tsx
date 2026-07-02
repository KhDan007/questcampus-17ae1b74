"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import { useApplySelection } from "@/lib/applyQueue/selection";

export function BatchActionBar() {
  const { items, count, clear } = useApplySelection();
  const { token } = useAuth();
  const addMut = useMutation(api.userUniversities.add);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addAll() {
    if (busy || items.length === 0 || !token) return;
    setBusy(true);
    setErr(null);
    try {
      for (const it of items) {
        try {
          await addMut({
            token,
            source: it.source,
            externalId: it.externalId,
            origin: "manual",
          } as never);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Failed to add one university");
        }
      }
      clear();
      void navigate({ to: "/dashboard" });
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
                {err ?? "We'll save them and start deep-researching each one in the background."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              disabled={busy}
              onClick={addAll}
              className="inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3.5 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60 sm:flex-none sm:px-4"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to my list & research
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
