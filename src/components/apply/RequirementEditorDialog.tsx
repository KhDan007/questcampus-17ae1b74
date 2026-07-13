"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { IntakeItem } from "@/lib/apply/intake";
import { IntakeItemField } from "@/components/apply/collect/RequirementField";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
  const { t } = useI18n();

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
        aria-label={t("audit.requirementEditor.title", { label: item.label })}
        className="relative w-full max-w-xl rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6"
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <IntakeItemField item={item} onChange={(v) => onSave?.(v)} />

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
