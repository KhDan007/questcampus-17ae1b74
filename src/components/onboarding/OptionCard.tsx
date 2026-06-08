"use client";

import type { ReactNode } from "react";

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
        className="group flex w-full items-start gap-3 p-4 text-left transition-[box-shadow,transform] duration-150"
        style={{
          background: selected ? "#FFCF00" : "#FFFFFF",
          border: "2px solid #111111",
          borderRadius: 9999,
          boxShadow: selected ? "2px 2px 0 #111111" : "none",
          color: "#111111",
        }}
      >
        <span
          aria-hidden
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
          style={{
            border: "2px solid #111111",
            background: selected ? "#111111" : "transparent",
            color: selected ? "#FFCF00" : "transparent",
            borderRadius: multi ? 2 : 9999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge ?? (selected ? "✓" : "")}
        </span>

        <span className="flex-1">
          <span className="block font-body" style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
          {children}
        </span>
      </button>
    </div>
  );
}
