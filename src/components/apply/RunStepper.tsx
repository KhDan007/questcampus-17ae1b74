"use client";

import {
  Check,
  X,
  ListChecks,
  MonitorPlay,
  LogIn,
  PencilLine,
  ClipboardCheck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

type Phase = {
  key: string;
  label: string;
  status: string;
  Icon: LucideIcon;
};

const PHASES: Phase[] = [
  { key: "queued", label: "Queued", status: "queued", Icon: ListChecks },
  { key: "claimed", label: "Browser", status: "claimed", Icon: MonitorPlay },
  { key: "awaiting_login", label: "Log in", status: "awaiting_login", Icon: LogIn },
  { key: "filling", label: "Filling", status: "filling", Icon: PencilLine },
  { key: "awaiting_submit", label: "Review", status: "awaiting_submit", Icon: ClipboardCheck },
  { key: "done", label: "Done", status: "done", Icon: CheckCircle2 },
];

function indexForStatus(status: string): number {
  if (status === "done") return PHASES.length - 1;
  if (status === "cancelled" || status === "error") {
    // Keep active at the phase we were last known to be on. We don't have it,
    // so default to whichever phase is "in flight" — best guess is filling.
    return 3;
  }
  const i = PHASES.findIndex((p) => p.status === status);
  return i < 0 ? 0 : i;
}

export function RunStepper({ status }: { status: string }) {
  const current = indexForStatus(status);
  const errored = status === "error";
  const cancelled = status === "cancelled";

  return (
    <ol className="flex flex-col gap-2 rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-3 qc-soft-shadow sm:flex-row sm:items-stretch sm:gap-0 sm:p-4">
      {PHASES.map((p, i) => {
        const isDone = i < current || (status === "done" && i <= current);
        const isActive = i === current && !isDone;
        const isFailedHere = isActive && errored;
        const isStoppedHere = isActive && cancelled;
        const isPending = i > current;

        const Icon = isFailedHere ? X : isDone ? Check : p.Icon;

        const circleCls = isFailedHere
          ? "border-error bg-error text-white"
          : isStoppedHere
            ? "border-on-surface bg-surface text-on-surface"
            : isDone
              ? "border-on-surface bg-primary text-white"
              : isActive
                ? "border-on-surface bg-surface text-on-surface"
                : "border-dashed border-on-surface/30 bg-surface text-on-surface/50";

        const labelCls = isPending
          ? "text-on-surface/50"
          : isFailedHere
            ? "font-bold text-error"
            : isActive
              ? "font-bold text-on-surface"
              : "text-on-surface";

        const connectorCls = i < current
          ? "bg-on-surface"
          : "border-t-2 border-dashed border-on-surface/25 bg-transparent";

        return (
          <li key={p.key} className="flex items-center gap-2 sm:min-w-0 sm:flex-1">
            <div className="relative flex items-center">
              <span
                className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${circleCls}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
              <span
                className={`block truncate font-[var(--font-label)] text-label-sm ${labelCls}`}
              >
                {p.label}
              </span>
              {i < PHASES.length - 1 && (
                <span
                  aria-hidden
                  className={`ml-2 hidden h-0.5 flex-1 sm:block ${connectorCls}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
