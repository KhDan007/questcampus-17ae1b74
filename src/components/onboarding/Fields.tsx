"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

// Input fields per DESIGN.md: soft surface, 1px border → 2px indigo on focus,
// Manrope 16px text for clarity.
const fieldBase =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 " +
  "text-body-md text-on-surface placeholder:text-on-surface-variant/60 " +
  "transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function TextField({
  label,
  className = "",
  ...props
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-label-md font-semibold text-on-surface-variant">
          {label}
        </span>
      )}
      <input className={`${fieldBase} ${className}`} {...props} />
    </label>
  );
}

export function NumberField({
  label,
  className = "",
  ...props
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-label-md font-semibold text-on-surface-variant">
          {label}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        className={`${fieldBase} ${className}`}
        {...props}
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  className = "",
  ...props
}: { label?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-label-md font-semibold text-on-surface-variant">
          {label}
        </span>
      )}
      <select className={`${fieldBase} cursor-pointer ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
