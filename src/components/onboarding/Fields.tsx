"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function TextField({
  label,
  className = "",
  ...props
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block font-body text-ink" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <input className={`bc-input ${className}`} {...props} />
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
        <span className="mb-2 block font-body text-ink" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <input type="number" inputMode="decimal" className={`bc-input ${className}`} {...props} />
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
        <span className="mb-2 block font-body text-ink" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <select className={`bc-input cursor-pointer ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
