"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Selectable option card — single + multi choice workhorse. Uses inset box-shadow
// for the selection ring (instead of ring-2) so the box model never shifts.
export function OptionCard({
  label,
  selected,
  onSelect,
  multi = false,
  index = 0,
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
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index * 0.03, 0.3) }}
    >
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
