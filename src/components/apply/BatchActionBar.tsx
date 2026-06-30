"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";

export function BatchActionBar() {
  const { count, clear } = useApplySelection();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border-2 border-on-surface bg-surface px-4 py-3 qc-hard-shadow sm:gap-3"
        >
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
              Ready when you are.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/apply/prep" })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3.5 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:px-4"
          >
            Apply to {count} <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
