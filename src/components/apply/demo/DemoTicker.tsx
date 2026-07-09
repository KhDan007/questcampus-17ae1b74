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
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-2 border-on-surface/20 bg-surface px-3 py-2 qc-hard-shadow-sm"
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
        className={`inline-flex items-center rounded-md border-2 px-1.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold ${
          yours
            ? "border-tertiary/60 bg-tertiary-container/50 text-on-surface"
            : "border-secondary/50 bg-secondary-container/60 text-on-surface"
        }`}
      >
        {yours ? "your answer" : "example"}
      </span>
    </div>
  );
}
