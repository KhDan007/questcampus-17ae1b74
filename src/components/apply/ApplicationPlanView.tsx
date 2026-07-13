"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, CheckCircle2, Circle, ChevronDown, ChevronRight, CalendarClock, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useApplicationPlan,
  useSetPlanDeadline,
  useSetTaskDone,
  useEssaysForTarget,
  useTargetReadiness,
  type PlanTask,
  type EssayForTarget,
} from "@/lib/apply/plan";
import { TaskGuideDialog } from "@/components/apply/TaskGuideDialog";

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
  const readiness = useTargetReadiness(system, externalId);
  const setDeadline = useSetPlanDeadline();
  const setTaskDone = useSetTaskDone();
  const essays = useEssaysForTarget(system, externalId);

  const essaysByConcept = useMemo(() => {
    const map = new Map<string | null, EssayForTarget[]>();
    (essays ?? []).forEach((e) => {
      const key = e.conceptKey ?? null;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [essays]);

  if (plan === undefined) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-10 qc-soft-shadow">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </div>
    );
  }
  if (plan === null) {
    return (
      <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-6 text-body-md text-on-surface-variant qc-soft-shadow">
        Sign in to see your plan.
      </div>
    );
  }
  if (plan.found === false) {
    return (
      <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-6 text-body-md text-on-surface-variant qc-soft-shadow">
        We&apos;re still researching this university&apos;s requirements.
      </div>
    );
  }

  // Hold the full plan behind a consistent panel until the target clears the
  // data-quality gate (same truth /plan uses to keep unresearched targets out of
  // the schedule). needs_user_input still shows the plan — that IS how the user
  // supplies what's missing. Only needs_research / unsupported are held.
  if (readiness && (readiness.qualityStatus === "needs_research" || readiness.qualityStatus === "unsupported")) {
    const researching = readiness.qualityStatus === "needs_research";
    return (
      <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-6 qc-soft-shadow">
        <h3 className="font-display text-headline-sm font-bold text-on-surface">
          {researching ? "Still researching this university" : "This portal needs a manual step"}
        </h3>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {researching
            ? "We're confirming this university's exact requirements. Your step-by-step plan appears here as soon as the data is trustworthy — no guessing, no half-filled forms."
            : "This university's portal can't be prepared automatically yet. We'll guide you through the manual steps."}
        </p>
        <p className="mt-3 text-body-sm text-on-surface-variant">
          Meanwhile, your shared work (profile, personal statement, transcript) is already in{" "}
          <Link to="/plan" className="font-semibold text-primary underline-offset-2 hover:underline">
            your full plan
          </Link>
          .
        </p>
      </div>
    );
  }

  const overdueDeadline = plan.deadline.dueMs < Date.now();

  return (
    <div className="space-y-5">
      {/* Deadline header */}
      <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6">
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
              className="rounded-md border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-md text-on-surface"
            />
          </label>
        </div>
      </section>

      {/* Phases */}
      {plan.phases.map((phase) => (
        <section
          key={phase.key}
          className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6"
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
                  matchingEssays={
                    t.kind === "essay"
                      ? essaysByConcept.get(t.conceptKey ?? null) ?? []
                      : []
                  }
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
    <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
      {label}
    </span>
  );
}

function TaskRow({
  task,
  system,
  externalId,
  matchingEssays,
  onToggle,
}: {
  task: PlanTask;
  system: string;
  externalId: string;
  matchingEssays: EssayForTarget[];
  onToggle: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const overdue = task.dueMs < Date.now() && !task.done;
  const isEssay = task.kind === "essay";

  function writeEssay() {
    void navigate({
      to: "/essay",
      search: {
        system,
        externalId,
        ...(task.conceptKey ? { conceptKey: task.conceptKey } : {}),
        ...(task.detail ? { prompt: task.detail } : {}),
        ...(task.wordLimit ? { wordLimit: task.wordLimit } : {}),
      },
    });
  }

  const nonEssayLabel =
    task.editor === "document"
      ? "Write"
      : task.upload
      ? "Upload"
      : task.kind === "profile"
      ? "Complete"
      : "Open guide";

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
              "rounded-full px-2 py-0.5 font-[var(--font-label)] text-label-sm " +
              (overdue
                ? "bg-error-container/60 text-on-error-container"
                : "bg-surface-container text-on-surface-variant")
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
        {isEssay && draftsOpen && matchingEssays.length > 0 && (
          <ul className="mt-2 divide-y divide-on-surface/10 rounded-md border border-on-surface/8 bg-surface-container-lowest">
            {matchingEssays.map((d) => (
              <li key={d.essayId}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftsOpen(false);
                    void navigate({ to: "/essay", search: { essayId: d.essayId } });
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-surface-container-lowest"
                >
                  <p className="text-body-sm text-on-surface">
                    {d.preview.length > 80
                      ? d.preview.slice(0, 80) + "…"
                      : d.preview || "(empty draft)"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {d.wordCount} words · {fmtDate(d.editedAt ?? d.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isEssay ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            aria-label="Open step-by-step guide"
            className="inline-flex items-center gap-1 rounded-md border border-on-surface/15 bg-surface px-2.5 py-1.5 font-[var(--font-label)] text-label-sm text-on-surface transition-colors hover:bg-on-surface/5"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Guide
          </button>
          <button
            type="button"
            onClick={writeEssay}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            Write
          </button>
          {matchingEssays.length > 0 && (
            <button
              type="button"
              onClick={() => setDraftsOpen((v) => !v)}
              aria-expanded={draftsOpen}
              className="inline-flex items-center gap-1 rounded-md border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm text-on-surface transition-colors hover:bg-on-surface/5"
            >
              Use a draft ({matchingEssays.length})
              <ChevronDown
                className={
                  "h-3.5 w-3.5 transition-transform " +
                  (draftsOpen ? "rotate-180" : "")
                }
              />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white transition-colors hover:bg-primary/90"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {nonEssayLabel}
        </button>
      )}

      <TaskGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        task={task}
        system={system}
        externalId={externalId}
        onDone={onToggle}
      />
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
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6">
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
