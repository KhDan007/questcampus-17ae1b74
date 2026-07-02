"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useActiveApplyJob } from "@/lib/applyQueue/client";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";

const STATUS_HINT: Record<string, string> = {
  queued: "Queued — waiting for a worker",
  claimed: "Starting the browser",
  awaiting_login: "Waiting for you to log in",
  filling: "Filling the application",
  awaiting_submit: "Ready for your review",
};

function ResumeBannerInner() {
  const job = useActiveApplyJob();
  if (!job) return null;
  const hint = STATUS_HINT[job.status] ?? "In progress";
  return (
    <Link
      to="/apply/$jobId"
      params={{ jobId: job.jobId }}
      className="group flex items-center gap-3 rounded-2xl border-2 border-on-surface bg-primary/10 px-4 py-3 qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white">
        <PlayCircle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-label-lg font-bold text-on-surface">
          Resume {job.targetName ?? "your application"}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">{hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function ResumeBanner() {
  return (
    <SilentErrorBoundary>
      <ResumeBannerInner />
    </SilentErrorBoundary>
  );
}
