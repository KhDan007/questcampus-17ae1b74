"use client";

import { Check, GraduationCap, MapPin, Plus, Sparkles, X } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";

type Props = {
  source: string;
  externalId: string;
  name: string;
  city?: string;
  country?: string;
  researched?: boolean;
  onApplyNow?: () => void;
};

export function SelectableUniCard({ source, externalId, name, city, country, researched, onApplyNow }: Props) {
  const { isSelected, toggle, remove } = useApplySelection();
  const selected = isSelected(source, externalId);
  const location = [city, country].filter(Boolean).join(", ");

  const add = () => {
    if (!selected) toggle({ source, externalId, name });
  };
  const drop = () => {
    if (selected) remove(source, externalId);
  };

  return (
    <button
      type="button"
      onClick={selected ? drop : add}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${name} from batch` : `Add ${name} to batch`}
      className={`group relative flex w-full flex-col rounded-2xl border-2 bg-surface-container-lowest p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? "border-primary bg-primary-fixed/40 qc-hard-shadow"
          : "border-on-surface/15 hover:border-on-surface hover:qc-hard-shadow-sm"
      }`}
    >
      <span
        aria-hidden
        className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md border-2 transition-colors ${
          selected
            ? "border-on-surface bg-primary text-white"
            : "border-on-surface/30 bg-surface text-transparent group-hover:border-on-surface"
        }`}
      >
        <Check className="h-4 w-4" />
      </span>

      <span className="flex items-start gap-3 pr-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-fixed text-on-surface">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-label-lg font-bold leading-tight text-on-surface line-clamp-2">
            {name}
          </span>
          {location && (
            <span className="mt-0.5 flex items-center gap-1 truncate text-label-sm text-on-surface-variant">
              <MapPin className="h-3 w-3" /> {location}
            </span>
          )}
        </span>
      </span>

      {researched && (
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border-2 border-tertiary bg-tertiary-fixed px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-tertiary">
          <Sparkles className="h-3 w-3" /> Already researched
        </span>
      )}

      <span
        className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 font-[var(--font-label)] text-label-md font-bold transition-colors ${
          selected
            ? "border-on-surface/30 bg-surface text-on-surface-variant"
            : "border-on-surface bg-primary text-white qc-hard-shadow-sm"
        }`}
      >
        {selected ? (
          <>
            <X className="h-3.5 w-3.5" /> Remove from batch
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            {researched ? "Add to batch" : "Add to batch"}
          </>
        )}
      </span>
      {onApplyNow && !selected && (
        <span
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onApplyNow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onApplyNow();
            }
          }}
          className="mt-2 cursor-pointer text-center font-[var(--font-label)] text-label-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Or apply to this one now
        </span>
      )}
    </button>
  );
}
