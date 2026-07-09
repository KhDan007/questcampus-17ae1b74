import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ApplyJobDemo } from "@/lib/applyQueue/client";

/**
 * Completion summary — shown once a demo job reaches its done/review state.
 * Reads `demo.totals`, falls back to counts derived from the per-portal
 * progress if totals were not patched. Closes the run with the extension CTA.
 */
export function DemoSummaryCard({ demo }: { demo: ApplyJobDemo }) {
  const totals = demo.totals ?? deriveTotals(demo);

  return (
    <div className="mt-6 rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm sm:p-6">
      <p className="flex items-center gap-1.5 font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-4 w-4" aria-hidden /> Demo complete
      </p>
      <p className="mt-2 font-display text-headline-md font-bold text-on-surface">
        {totals.portals} portals · {totals.fields} fields · 1 set of answers
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-tertiary" aria-hidden />
          {totals.yours} your answers
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-secondary" aria-hidden />
          {totals.examples} examples
        </span>
      </p>
      <div className="mt-5">
        <Link
          to="/extension"
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          This, on your real application — get the extension
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function deriveTotals(demo: ApplyJobDemo): {
  portals: number;
  fields: number;
  yours: number;
  examples: number;
} {
  const fields = demo.portals.reduce((sum, p) => sum + p.total, 0);
  return { portals: demo.portals.length, fields, yours: fields, examples: 0 };
}
