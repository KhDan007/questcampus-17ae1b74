"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * A small portal-rendered confirmation modal. Rendered above the chat panel
 * (z-[95]) with a dimmed backdrop. Esc or a backdrop click cancels. Mobile-safe:
 * the card is centered with side margins and a max width.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  destructive = false,
  showDontAskAgain = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  showDontAskAgain?: boolean;
  onCancel: () => void;
  onConfirm: (dontAskAgain: boolean) => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Reset the checkbox each time the dialog opens so a prior tick never leaks.
  useEffect(() => {
    if (open) setDontAskAgain(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (typeof document === "undefined") return null;

  // Destructive uses the error token when it exists in the design system.
  const confirmClass = destructive
    ? "border-on-surface bg-error text-on-error"
    : "border-on-surface bg-primary text-white";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-dialog"
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm"
          >
            <p className="font-display text-label-md font-bold text-on-surface">{title}</p>
            <p className="mt-2 text-body-sm text-on-surface-variant">{body}</p>

            {showDontAskAgain && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-label-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-2 border-on-surface accent-primary"
                />
                Don&apos;t ask again
              </label>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(dontAskAgain)}
                className={`rounded-md border-2 px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${confirmClass}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
