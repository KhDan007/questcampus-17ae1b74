import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { DemoPortalProgress } from "@/lib/applyQueue/client";

/**
 * Portal chapter rail — one chip per demo portal, above the screencast canvas.
 * Shows university name, live state (pending / filling / done), and a filled/total
 * count. Wraps on mobile; single column at the narrowest widths so nothing
 * overflows horizontally at 375px.
 */
export function PortalChapterRail({ portals }: { portals: DemoPortalProgress[] }) {
  const reduce = useReducedMotion();
  if (portals.length === 0) return null;

  return (
    <ol className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {portals.map((p) => (
        <PortalChip key={p.key} portal={p} reduce={!!reduce} />
      ))}
    </ol>
  );
}

function PortalChip({
  portal,
  reduce,
}: {
  portal: DemoPortalProgress;
  reduce: boolean;
}) {
  const { state, name, filled, total } = portal;
  const active = state === "filling";
  const done = state === "done";

  return (
    <li
      className={`flex min-w-0 items-center gap-2.5 rounded-2xl border-2 border-on-surface bg-surface px-3 py-2.5 qc-hard-shadow-sm ${
        active ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <span className="shrink-0">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-tertiary" aria-hidden />
        ) : active ? (
          <Loader2
            className={`h-5 w-5 text-primary ${reduce ? "" : "animate-spin"}`}
            aria-hidden
          />
        ) : (
          <Circle className="h-5 w-5 text-on-surface/35" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          {name}
        </span>
        <span className="block font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {done ? "Filled" : active ? "Filling" : "Waiting"}
        </span>
      </span>
      <span className="shrink-0 font-[var(--font-label)] text-label-sm tabular-nums text-on-surface-variant">
        {filled}/{total}
      </span>
    </li>
  );
}
