import type { DemoFieldSource } from "@/lib/applyQueue/client";

/**
 * Live field ticker — under the screencast canvas. Reads `demo.currentField`
 * and reads as "Filling <label> · your answer" (green dot, source "yours") or
 * "Filling <label> · example" (amber dot + explicit "example" badge text for
 * source "example"). The badge always carries text, never color alone.
 */
export function DemoTicker({
  field,
}: {
  field?: { label: string; source: DemoFieldSource } | null;
}) {
  if (!field) return null;
  const yours = field.source === "yours";

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2 qc-soft-shadow"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
          yours ? "bg-tertiary" : "bg-secondary"
        }`}
        aria-hidden
      />
      <span className="min-w-0 text-body-sm text-on-surface">
        Filling <span className="font-semibold">{field.label}</span>
      </span>
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold ${
          yours
            ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            : "bg-secondary-fixed text-on-secondary-fixed-variant"
        }`}
      >
        {yours ? "your answer" : "example"}
      </span>
    </div>
  );
}
