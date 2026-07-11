"use client";

import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, GraduationCap, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import type { ApplyJob } from "@/lib/applyQueue/client";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";

const READY = new Set(["awaiting_login", "filling", "awaiting_submit"]);

function statusUI(job: ApplyJob) {
  if (job.status === "done") {
    return { icon: CheckCircle2, tone: "text-tertiary", label: "Done" };
  }
  if (job.status === "error" || job.status === "cancelled") {
    return { icon: AlertCircle, tone: "text-on-surface-variant", label: "Couldn't finish — public info still available" };
  }
  if (READY.has(job.status)) {
    return { icon: CheckCircle2, tone: "text-tertiary", label: "Ready — open application" };
  }
  if (job.progress?.stage === "paywalled") {
    return { icon: Lock, tone: "text-on-surface-variant", label: "Behind a paywall" };
  }
  return { icon: Loader2, tone: "text-primary animate-spin", label: job.progress?.message ?? "Researching…" };
}

function JobChip({ job }: { job: ApplyJob }) {
  const ui = statusUI(job);
  const Icon = ui.icon;
  const pct = job.progress?.percent ?? null;
  const actionable = READY.has(job.status) || job.status === "done";
  return (
    <Link
      to="/apply/$jobId"
      params={{ jobId: job.jobId }}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2.5 qc-soft-shadow transition-colors hover:bg-on-surface/5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant">
        <GraduationCap className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-label-md font-bold text-on-surface">
          {job.targetName ?? job.externalId ?? "Application"}
        </p>
        <p className={`flex items-center gap-1.5 truncate text-label-sm ${actionable ? "text-tertiary" : "text-on-surface-variant"}`}>
          <Icon className={`h-3.5 w-3.5 ${ui.tone}`} />
          {ui.label}
        </p>
      </div>
      {actionable && <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/60" />}
      {pct !== null && pct < 100 && (
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-all"
          style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
        />
      )}
    </Link>
  );
}

function ResearchDockInner() {
  const { token } = useAuth();
  // Contract exposes ONLY `myActiveJob` (singular, non-terminal or null).
  const raw = useQuery(
    api.applyQueue.myActiveJob,
    token ? { token } : "skip",
  ) as (ApplyJob & { _id?: string }) | null | undefined;
  const single = raw ? ({ ...raw, jobId: raw.jobId ?? (raw._id as string) } as ApplyJob) : raw;

  const list = single ? [single] : [];
  if (!token || list.length === 0) return null;

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-display text-headline-sm font-bold text-on-surface">
          In progress
        </h2>
        <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
          {list.length} running
        </span>
      </header>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {list.map((j) => (
          <li key={j.jobId}>
            <JobChip job={j} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ResearchDock() {
  return (
    <SilentErrorBoundary>
      <ResearchDockInner />
    </SilentErrorBoundary>
  );
}
