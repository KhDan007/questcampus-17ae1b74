"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Circle, CircleDot, X } from "lucide-react";

import { useCancelAgentJob, type AgentJob, type AgentTodo } from "@/lib/chat";

/** A single live agent-job card rendered in the chat thread. Reactive:
 * todos + last log line update as the service patches the job. Cancel is
 * available while queued/running. Read-only otherwise. */
export function AgentJobCard({ job }: { job: AgentJob }) {
  const cancel = useCancelAgentJob();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);

  const cancellable = job.status === "queued" || job.status === "running";
  const lastLog = job.log.length > 0 ? job.log[job.log.length - 1] : undefined;

  async function onCancel() {
    if (busy) return;
    setBusy(true);
    try {
      await cancel(job._id);
      toast.message("Job cancelled.");
    } catch {
      toast.error("Couldn't cancel that just now — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-on-surface bg-surface p-3 qc-hard-shadow-sm">
      {/* Goal + status + cancel */}
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 truncate font-display text-body-sm font-bold text-on-surface">
          {job.goal}
        </p>
        <StatusChip status={job.status} reduce={!!reduce} />
        {cancellable && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel job"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-on-surface/25 bg-surface text-on-surface hover:border-on-surface disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Todo checklist */}
      {job.todos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {job.todos.map((t) => (
            <TodoRow key={t.id} todo={t} reduce={!!reduce} />
          ))}
        </ul>
      )}

      {/* Last log line */}
      {lastLog && (
        <p className="mt-2 truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {lastLog.text}
        </p>
      )}

      {/* Result summary on completion */}
      {job.status === "done" && job.resultSummary && (
        <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-on-surface">
          {job.resultSummary}
        </p>
      )}

      {/* Error line */}
      {job.status === "error" && job.error && (
        <p className="mt-2 rounded-md border-2 border-error/30 bg-error/10 px-1.5 py-0.5 text-label-sm text-on-error-container">
          {job.error}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status, reduce }: { status: AgentJob["status"]; reduce: boolean }) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2 py-0.5 font-[var(--font-label)] text-label-sm";
  if (status === "running") {
    return (
      <span className={`${base} border-on-surface bg-surface text-on-surface`}>
        <Loader2 className={`h-3 w-3 ${reduce ? "" : "animate-spin"}`} />
        working
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className={`${base} border-tertiary bg-tertiary/20 text-on-surface`}>
        <CheckCircle2 className="h-3 w-3" />
        done
      </span>
    );
  }
  if (status === "error") {
    return <span className={`${base} border-on-surface/20 bg-surface text-on-surface-variant`}>error</span>;
  }
  if (status === "cancelled") {
    return (
      <span className={`${base} border-on-surface/20 bg-surface text-on-surface-variant`}>cancelled</span>
    );
  }
  // queued
  return <span className={`${base} border-on-surface/20 bg-surface text-on-surface-variant`}>queued</span>;
}

function TodoRow({ todo, reduce }: { todo: AgentTodo; reduce: boolean }) {
  return (
    <li className="flex items-start gap-2 text-label-sm">
      <span className="mt-0.5 shrink-0">
        <TodoIcon status={todo.status} reduce={reduce} />
      </span>
      <span
        className={
          todo.status === "done"
            ? "text-on-surface"
            : todo.status === "skipped"
              ? "text-on-surface-variant line-through"
              : "text-on-surface/80"
        }
      >
        {todo.text}
      </span>
    </li>
  );
}

function TodoIcon({ status, reduce }: { status: AgentTodo["status"]; reduce: boolean }) {
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-tertiary" />;
  if (status === "in_progress")
    return <Loader2 className={`h-3.5 w-3.5 text-primary ${reduce ? "" : "animate-spin"}`} />;
  if (status === "skipped") return <CircleDot className="h-3.5 w-3.5 text-on-surface-variant/60" />;
  return <Circle className="h-3.5 w-3.5 text-on-surface-variant/60" />;
}
