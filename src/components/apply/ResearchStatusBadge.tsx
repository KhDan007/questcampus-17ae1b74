"use client";

import type { ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { researchStatusView, type ResearchStatusTone } from "@/lib/apply/researchStatus";
import { useResearchProgress, type ResearchProgress } from "@/lib/apply/uniData";

type Props = {
  research: ResearchProgress | null | undefined;
  compact?: boolean;
  className?: string;
};

type LiveProps = Omit<Props, "research"> & {
  system: string;
  externalId: string;
};

const TONE_CLASS: Record<ResearchStatusTone, string> = {
  loading: "border-on-surface/20 bg-surface text-on-surface-variant",
  queued: "border-on-surface/20 bg-surface-container-lowest text-on-surface-variant",
  researching: "border-primary/40 bg-primary-fixed text-primary",
  ready: "border-tertiary/50 bg-tertiary-fixed text-tertiary",
  partial: "border-amber-700/40 bg-amber-50 text-amber-700",
  blocked: "border-secondary/50 bg-secondary-container text-on-surface",
  error: "border-error/40 bg-error-container text-on-error-container",
};

const ICON_BY_TONE = {
  loading: Loader2,
  queued: CircleDashed,
  researching: Sparkles,
  ready: CheckCircle2,
  partial: AlertTriangle,
  blocked: Lock,
  error: AlertTriangle,
} satisfies Record<ResearchStatusTone, ComponentType<{ className?: string }>>;

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function ResearchStatusBadge({ research, compact = false, className }: Props) {
  const view = researchStatusView(research);
  const Icon = ICON_BY_TONE[view.tone];
  const spinning = view.tone === "loading";

  if (compact) {
    return (
      <span
        aria-live={view.tone === "researching" || view.tone === "loading" ? "polite" : undefined}
        className={cx(
          "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold",
          TONE_CLASS[view.tone],
          className,
        )}
      >
        <Icon className={cx("h-3.5 w-3.5", spinning && "animate-spin")} />
        <span>{view.label}</span>
        {view.percent != null && view.tone === "researching" && (
          <span className="opacity-75">{view.percent}%</span>
        )}
      </span>
    );
  }

  return (
    <div
      aria-live={view.tone === "researching" || view.tone === "loading" ? "polite" : undefined}
      className={cx(
        "rounded-xl border-2 p-3",
        TONE_CLASS[view.tone],
        className,
      )}
    >
      <div className="flex items-center gap-2 font-[var(--font-label)] text-label-md font-bold">
        <Icon className={cx("h-4 w-4", spinning && "animate-spin")} />
        <span>{view.label}</span>
        {view.percent != null && view.tone === "researching" && (
          <span className="ml-auto text-label-sm opacity-75">{view.percent}%</span>
        )}
      </div>
      <p className="mt-1 text-label-sm leading-relaxed opacity-80">{view.detail}</p>
      {view.percent != null && view.tone === "researching" && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
          <div
            className="h-full bg-current transition-[width] duration-300"
            style={{ width: `${view.percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function LiveResearchStatusBadge({ system, externalId, ...props }: LiveProps) {
  const research = useResearchProgress(system, externalId);
  return <ResearchStatusBadge {...props} research={research} />;
}
