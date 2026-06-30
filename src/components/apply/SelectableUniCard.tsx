"use client";

import { Check, GraduationCap, MapPin, Send } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";

type Props = {
  source: string;
  externalId: string;
  name: string;
  city?: string;
  country?: string;
  onApplyNow?: () => void;
};

export function SelectableUniCard({ source, externalId, name, city, country, onApplyNow }: Props) {
  const { isSelected, toggle } = useApplySelection();
  const selected = isSelected(source, externalId);
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border-2 bg-surface-container-lowest p-4 transition-all ${
        selected
          ? "border-primary bg-primary-fixed/40 qc-hard-shadow"
          : "border-on-surface/15 hover:border-on-surface hover:qc-hard-shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => toggle({ source, externalId, name })}
        aria-pressed={selected}
        aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
        className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md border-2 transition-colors ${
          selected
            ? "border-on-surface bg-primary text-white"
            : "border-on-surface/30 bg-surface text-transparent hover:border-on-surface"
        }`}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-fixed text-on-surface">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-label-lg font-bold leading-tight text-on-surface line-clamp-2">
            {name}
          </p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-label-sm text-on-surface-variant">
              <MapPin className="h-3 w-3" /> {location}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onApplyNow) onApplyNow();
          else toggle({ source, externalId, name });
        }}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        <Send className="h-3.5 w-3.5" />
        {selected ? "Selected for apply" : "Start application"}
      </button>
    </div>
  );
}
