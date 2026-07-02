"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import { useApplySelection } from "@/lib/applyQueue/selection";
import { ResearchProgressModal } from "@/components/apply/ResearchProgressModal";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";

export function BatchActionBar() {
  const { items, count, clear } = useApplySelection();
  const { token } = useAuth();
  const addMut = useMutation(api.userUniversities.add);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTargets, setModalTargets] = useState<BackendTarget[]>([]);

  const selectionTargets: BackendTarget[] = useMemo(
    () => items.map((i) => ({ system: i.source, externalId: i.externalId, name: i.name })),
    [items],
  );
  const plan = useIntakePlan(selectionTargets);
  const foundSet = useMemo(() => {
    const s = new Set<string>();
    (plan?.targets ?? []).forEach((t) => {
      if (t.found) s.add(`${t.system}::${t.externalId}`);
    });
    return s;
  }, [plan]);
  const researchedCount = selectionTargets.filter((t) =>
    foundSet.has(`${t.system}::${t.externalId}`),
  ).length;
  const toResearch = selectionTargets.filter(
    (t) => !foundSet.has(`${t.system}::${t.externalId}`),
  );

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
      // Only stream research progress for the ones that aren't already researched.
      if (toResearch.length > 0) {
        setModalTargets(toResearch);
        setModalOpen(true);
      }
      clear();
    } finally {
      setBusy(false);
    }
  }


  const isEmpty = count === 0;

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.15 }}
        className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border-2 border-on-surface bg-surface/95 px-4 py-3 backdrop-blur-md qc-hard-shadow sm:flex-row sm:items-center sm:gap-3"
        style={{ width: "calc(100% - 2rem)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {isEmpty ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary-fixed text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear selection"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-surface text-on-surface hover:bg-surface-container"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-label-lg font-bold text-on-surface">
              {isEmpty
                ? "Pick universities to deep-research"
                : `${count} ${count === 1 ? "university" : "universities"} selected`}
            </p>
            <p className="truncate text-label-sm text-on-surface-variant">
              {err
                ? err
                : isEmpty
                  ? "Tick one or more schools below — we'll pull every requirement in the background."
                  : "We'll save them and start deep-researching each one live."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            disabled={busy || isEmpty}
            onClick={addAll}
            className="inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3.5 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isEmpty ? "Nothing selected" : "Deep research now"}
          </button>
        </div>
      </motion.div>

      <ResearchProgressModal
        open={modalOpen}
        targets={modalTargets}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
