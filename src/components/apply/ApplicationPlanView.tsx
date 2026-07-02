"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, CheckCircle2, Circle, ChevronDown, ChevronRight, CalendarClock } from "lucide-react";
import {
  useApplicationPlan,
  useSetPlanDeadline,
  useSetTaskDone,
  type PlanTask,
} from "@/lib/apply/plan";
import { useCreateDocument } from "@/lib/documents";

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInput(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function countdown(dueMs: number): string {
  const diff = dueMs - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `overdue by ${Math.abs(days)}d`;
  if (days === 0) return "due today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function ApplicationPlanView({
  system,
  externalId,
}: {
  system: string;
  externalId: string;
}) {
  const plan = useApplicationPlan(system, externalId);
  const setDeadline = useSetPlanDeadline();
  const setTaskDone = useSetTaskDone();

  if (plan === undefined) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-on-surface/20 bg-surface p-10">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </div>
    );
  }
  if (plan === null) {
    return (
      <div className="rounded-2xl border-2 border-on-surface/20 bg-surface p-6 text-body-md text-on-surface-variant">
        Sign in to see your plan.
      </div>
    );
  }
  if (plan.found === false) {
    return (
      <div className="rounded-2xl border-2 border-on-surface/20 bg-surface p-6 text-body-md text-on-surface-variant">
        We&apos;re still researching this university&apos;s requirements.
      </div>
    );
  }

  const overdueDeadline = plan.deadline.dueMs < Date.now();

  return (
    <div className="space-y-5">
      {/* Deadline header */}
      <section className="rounded-2xl border-2 border-on-surface bg-surface-container-lowest p-5 qc-hard-shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-on-surface-variant">
              <CalendarClock className="h-3.5 w-3.5" /> Application deadline
            </p>
            <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
              {fmtDate(plan.deadline.dueMs)}
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              <span
                className={
                  overdueDeadline
                    ? "font-semibold text-error"
                    : "font-semibold text-on-surface"
                }
              >
                {overdueDeadline ? "overdue" : countdown(plan.deadline.dueMs)}
              </span>
              {" · "}
              <SourceTag source={plan.deadline.source} />
            </p>
            <p className="mt-2 text-label-sm text-on-surface-variant">
              {plan.counts.required} required tasks · deadline {fmtDate(plan.deadline.dueMs)}
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              Change deadline
            </span>
            <input
              type="date"
              defaultValue={toDateInput(plan.deadline.dueMs)}
              onChange={(e) => {
                void setDeadline({ system, externalId, iso: e.target.value });
              }}
              className="rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-md text-on-surface qc-hard-shadow-sm"
            />
          </label>
        </div>
      </section>

      {/* Phases */}
      {plan.phases.map((phase) => (
        <section
          key={phase.key}
          className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm sm:p-6"
        >
          <h3 className="mb-3 font-display text-headline-sm font-bold text-on-surface">
            {phase.label}
          </h3>
          {phase.tasks.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nothing to do here.</p>
          ) : (
            <ul className="divide-y divide-on-surface/10">
              {phase.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  system={system}
                  externalId={externalId}
                  onToggle={() =>
                    setTaskDone({
                      system,
                      externalId,
                      taskId: t.id,
                      done: !t.done,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* Conditional */}
      {plan.conditional.length > 0 && (
        <ConditionalSection tasks={plan.conditional} field={plan.userFields[0]} />
      )}
    </div>
  );
}

function SourceTag({ source }: { source: "scraped" | "user" | "default" }) {
  const label =
    source === "scraped"
      ? "from the university"
      : source === "user"
      ? "you set this"
      : "estimated — edit";
  return (
    <span className="inline-flex items-center rounded-full border border-on-surface/25 bg-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
      {label}
    </span>
  );
}

function TaskRow({
  task,
  system,
  externalId,
  onToggle,
}: {
  task: PlanTask;
  system: string;
  externalId: string;
  onToggle: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const createDoc = useCreateDocument();
  const [busy, setBusy] = useState(false);

  const overdue = task.dueMs < Date.now() && !task.done;

  async function handleCta() {
    if (busy) return;
    if (task.editor === "essay") {
      void navigate({ to: "/essay" });
      return;
    }
    if (task.editor === "document") {
      setBusy(true);
      try {
        const id = await createDoc({
          docKind: task.editorKind ?? "other",
          system,
          externalId,
        });
        void navigate({ to: "/documents/$id", params: { id } });
      } catch {
        setBusy(false);
      }
      return;
    }
    if (task.upload) {
      void navigate({ to: "/apply" });
      return;
    }
    if (task.kind === "profile") {
      void navigate({ to: "/apply" });
    }
  }

  const ctaLabel =
    task.editor === "essay" || task.editor === "document"
      ? "Write"
      : task.upload
      ? "Upload"
      : task.kind === "profile"
      ? "Complete"
      : null;

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        onClick={() => void onToggle()}
        aria-label={task.done ? "Mark not done" : "Mark done"}
        className="mt-0.5 shrink-0 text-on-surface-variant hover:text-on-surface"
      >
        {task.done ? (
          <CheckCircle2 className="h-5 w-5 text-tertiary" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={
              "font-[var(--font-label)] text-label-lg font-semibold " +
              (task.done
                ? "text-on-surface-variant line-through"
                : "text-on-surface")
            }
          >
            {task.title}
          </p>
          <span
            className={
              "rounded-full border px-2 py-0.5 font-[var(--font-label)] text-label-sm " +
              (overdue
                ? "border-error bg-error-container/40 text-on-error-container"
                : "border-on-surface/20 bg-surface text-on-surface-variant")
            }
          >
            {overdue ? "Overdue" : `due ${fmtDate(task.dueMs)}`}
          </span>
          {task.wordLimit ? (
            <span className="text-label-sm text-on-surface-variant">
              · ~{task.wordLimit} words
            </span>
          ) : null}
          {!task.required && (
            <span className="text-label-sm text-on-surface-variant">· optional</span>
          )}
        </div>
        {task.detail && (
          <p className="mt-1 text-body-sm text-on-surface-variant">{task.detail}</p>
        )}
      </div>

      {ctaLabel && (
        <button
          type="button"
          onClick={() => void handleCta()}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {ctaLabel}
        </button>
      )}
    </li>
  );
}

function ConditionalSection({
  tasks,
  field,
}: {
  tasks: PlanTask[];
  field: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const fieldLabel = (field ?? "your major").toUpperCase();
  const title = useMemo(
    () => `Probably not required for your major (${fieldLabel}) — ${tasks.length}`,
    [fieldLabel, tasks.length],
  );
  return (
    <section className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-[var(--font-label)] text-label-lg font-semibold text-on-surface">
          {title}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
        ) : (
          <ChevronRight className="h-4 w-4 text-on-surface-variant" />
        )}
      </button>
      {open && (
        <ul className="mt-3 divide-y divide-on-surface/10">
          {tasks.map((t) => (
            <li key={t.id} className="py-3">
              <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                {t.title}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                only if you&apos;re applying for a different program
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
