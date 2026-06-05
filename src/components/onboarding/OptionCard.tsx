"use client";

import type { ReactNode } from "react";

// Selectable option card — single + multi choice workhorse. Uses inset box-shadow
// for the selection ring (instead of ring-2) so the box model never shifts.
// No per-card entry animation: the parent step container already fades in,
// and re-running a y-translate on every selection re-render caused a visible
// upward shift of the option list.
export function OptionCard({
  label,
  selected,
  onSelect,
  multi = false,
  index: _index = 0,
  badge,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  multi?: boolean;
  index?: number;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`group flex w-full items-start gap-3 rounded-md border p-4 text-left
          transition-[background-color,border-color,box-shadow] duration-150
          ${
            selected
              ? "border-primary bg-primary-fixed/60 shadow-[inset_0_0_0_2px_#3525cd]"
              : "border-outline-variant/60 bg-surface-container-lowest shadow-[inset_0_0_0_2px_transparent] hover:border-primary/40 hover:bg-surface-container-low"
          }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-label-sm font-bold transition-colors ${
            multi ? "rounded-[5px]" : "rounded-full"
          } ${
            selected
              ? "bg-primary text-on-primary"
              : "border-2 border-outline-variant bg-transparent text-transparent group-hover:border-primary/50"
          }`}
        >
          {badge ?? (selected ? "✓" : "")}
        </span>

        <span className="flex-1">
          <span className="block text-body-md text-on-surface">{label}</span>
          {children}
        </span>
      </button>
    </motion.div>
  );
}
