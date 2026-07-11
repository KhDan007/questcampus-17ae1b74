import { CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { DemoPortalProgress } from "@/lib/applyQueue/client";

/**
 * Portal chapter rail — one chip per demo portal, above the screencast canvas.
 * Shows university name, live state (pending / filling / done), and a filled/total
 * count. A finished portal becomes a link to its filled snapshot so the user can
 * open and inspect it. Wraps on mobile; single column at the narrowest widths so
 * nothing overflows horizontally at 375px.
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
  const { state, name, filled, total, viewUrl } = portal;
  const active = state === "filling";
  const done = state === "done";
  const viewable = done && !!viewUrl;

  const icon = done ? (
    <CheckCircle2 className="h-5 w-5 text-tertiary" aria-hidden />
  ) : active ? (
    <Loader2 className={`h-5 w-5 text-primary ${reduce ? "" : "animate-spin"}`} aria-hidden />
  ) : (
    <Circle className="h-5 w-5 text-on-surface/35" aria-hidden />
  );

  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          {name}
        </span>
        <span className="block font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {viewable ? "Filled — tap to view" : done ? "Filled" : active ? "Filling" : "Waiting"}
        </span>
      </span>
      {viewable ? (
        <ExternalLink className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
      ) : (
        <span className="shrink-0 font-[var(--font-label)] text-label-sm tabular-nums text-on-surface-variant">
          {filled}/{total}
        </span>
      )}
    </>
  );

  const base = `flex min-w-0 items-center gap-2.5 rounded-2xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2.5 qc-soft-shadow ${
    active ? "ring-2 ring-primary/40" : ""
  }`;

  if (viewable) {
    return (
      <li className="min-w-0">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`View your filled ${name}`}
          className={`${base} w-full text-left transition-colors hover:bg-surface-container`}
        >
          {inner}
        </a>
      </li>
    );
  }

  return <li className={base}>{inner}</li>;
}
