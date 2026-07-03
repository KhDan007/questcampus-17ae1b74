"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { IntakeItem } from "@/lib/apply/intake";
import { IntakeItemField } from "@/components/apply/collect/RequirementField";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  open: boolean;
  onClose: () => void;
  item: IntakeItem | null;
  system: string;
  externalId: string;
  onSave?: (value: string) => void;
};

export function RequirementEditorDialog({ open, onClose, item, system, externalId, onSave }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Prevent background scroll while dialog is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  // Essays live in the dedicated Essay Assistant — jump straight there.
  if (item.kind === "essay") {
    void navigate({
      to: "/essay",
      search: {
        system,
        externalId,
        ...(item.conceptKey ? { conceptKey: item.conceptKey } : {}),
        ...(item.prompt ? { prompt: item.prompt } : {}),
        ...(item.wordLimit ? { wordLimit: item.wordLimit } : {}),
      },
    });
    onClose();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${item.label}`}
        className="relative w-full max-w-xl rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              {item.kind === "document" ? "Upload" : item.kind === "video" ? "Video" : "Fill in"}
            </p>
            <h2 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              {item.label}
            </h2>
            {item.prompt && (
              <p className="mt-1 text-body-sm text-on-surface-variant">{item.prompt}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-on-surface/20 bg-surface text-on-surface hover:border-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <IntakeItemField item={item} onChange={(v) => onSave?.(v)} />

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
