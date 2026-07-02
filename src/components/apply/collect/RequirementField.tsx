"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { IntakeRequirement } from "@/lib/apply/intake";

type Props = {
  req: IntakeRequirement;
  onChange: (value: unknown) => void;
  compact?: boolean;
};

function isAnswered(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function RequirementField({ req, onChange, compact }: Props) {
  const [value, setValue] = useState<unknown>(req.value ?? (req.type === "multiselect" ? [] : ""));

  useEffect(() => {
    setValue(req.value ?? (req.type === "multiselect" ? [] : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.key]);

  function update(v: unknown) {
    setValue(v);
    onChange(v);
  }

  const answered = isAnswered(value);
  const label = req.label ?? req.question ?? req.key;
  const options = (req.options ?? []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value },
  );

  return (
    <div
      className={`rounded-xl border-2 border-on-surface/15 bg-surface p-4 transition-colors ${answered ? "border-on-surface/25" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          {label}
          {req.required && <span className="ml-1 text-primary">*</span>}
        </label>
        {answered && (
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/20 px-2 py-0.5 text-label-sm text-on-surface">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
      {req.help && !compact && (
        <p className="mt-1 text-body-sm text-on-surface-variant">{req.help}</p>
      )}
      <div className="mt-3">
        {req.type === "textarea" ? (
          <textarea
            value={String(value ?? "")}
            onChange={(e) => update(e.target.value)}
            rows={3}
            className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        ) : req.type === "select" ? (
          <select
            value={String(value ?? "")}
            onChange={(e) => update(e.target.value)}
            className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : req.type === "multiselect" ? (
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const on = arr.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() =>
                    update(on ? arr.filter((v) => v !== o.value) : [...arr, o.value])
                  }
                  className={`rounded-full border-2 px-3 py-1 text-label-sm ${on ? "border-on-surface bg-primary text-white" : "border-on-surface/25 bg-surface text-on-surface"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : req.type === "boolean" ? (
          <div className="flex gap-2">
            {["yes", "no"].map((opt) => {
              const on = String(value) === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update(opt)}
                  className={`rounded-md border-2 px-3 py-1.5 text-label-sm capitalize ${on ? "border-on-surface bg-primary text-white" : "border-on-surface/25 bg-surface text-on-surface"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type={req.type === "date" ? "date" : req.type === "number" ? "number" : "text"}
            value={String(value ?? "")}
            onChange={(e) => update(e.target.value)}
            className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
