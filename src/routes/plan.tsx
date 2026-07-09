import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Loader2,
  PenLine,
  Send,
  Users,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";

// -----------------------------------------------------------------------------
// Backend contract (planner.unifiedPlan). The generated api is an untyped stub,
// so we type the response ourselves — matching the codebase pattern of casting
// useQuery results.
// -----------------------------------------------------------------------------

type UnifiedTask = {
  id: string;
  system: string;
  externalId: string;
  targetName: string;
  kind: string;
  label: string;
  detail?: string;
  conceptKey?: string;
  docType?: string;
  estimateMin: number;
  deadlineMs: number | null;
  done: boolean;
  route: string;
};

type UnifiedDay = { date: string; totalMin: number; tasks: UnifiedTask[] };

type UnifiedPlan = {
  days: UnifiedDay[];
  unscheduled: UnifiedTask[];
  overdueCount: number;
  targets: Array<{
    system: string;
    externalId: string;
    name: string;
    deadlineMs: number | null;
  }>;
  summary: { total: number; done: number; overdueCount: number };
};

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Your plan — QuestCampus" },
      {
        name: "description",
        content:
          "Every application task across your universities, split small and balanced day by day.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  // NOTE: all hooks BEFORE any auth guard — Rules of Hooks.
  const { isAuthenticated, isHydrated, token } = useAuth();
  // Stable now — a fresh Date.now() per render would refetch forever.
  const [nowMs] = useState(() => Date.now());
  const [view, setView] = useState<"todo" | "calendar">("todo");

  const plan = useQuery(
    api.planner.unifiedPlan,
    token ? { token, nowMs } : "skip",
  ) as UnifiedPlan | null | undefined;

  const setDone = useMutation(api.planner.setUnifiedTaskDone);

  // Optimistic overrides: taskId -> done. UI responds instantly.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const toggle = (task: UnifiedTask, next: boolean) => {
    setOverrides((prev) => ({ ...prev, [task.id]: next }));
    if (!token) return;
    void setDone({ token, taskId: task.id, done: next }).catch(() => {
      // Roll back on failure.
      setOverrides((prev) => {
        const copy = { ...prev };
        delete copy[task.id];
        return copy;
      });
    });
  };
  const isDone = (task: UnifiedTask) => overrides[task.id] ?? task.done;

  if (!isHydrated) {
    return (
      <DashboardShell>
        <LivingBackground />
        <main className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12">
          <div className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your plan...
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/plan" } as never} />;
  }

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12"
      >
        <header>
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Your plan
          </p>
          <h1 className="mt-2 font-display text-display-md text-on-surface text-balance">
            Every application, one schedule.
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            We split each application into small tasks and balance them across your days, so nothing
            piles up at the deadline.
          </p>

          {plan && (
            <div className="mt-5 flex flex-wrap gap-2">
              <SummaryChip label="tasks" value={plan.summary.total} />
              <SummaryChip label="done" value={plan.summary.done} />
              {plan.summary.overdueCount > 0 && (
                <SummaryChip label="overdue" value={plan.summary.overdueCount} tone="error" />
              )}
              <SummaryChip label="universities" value={plan.targets.length} />
            </div>
          )}
        </header>

        {/* View toggle */}
        <div className="mt-8">
          <div className="inline-flex flex-wrap gap-1 rounded-full border-2 border-on-surface bg-surface p-1 qc-hard-shadow-sm">
            {(
              [
                { k: "todo", label: "To-do" },
                { k: "calendar", label: "Calendar" },
              ] as { k: "todo" | "calendar"; label: string }[]
            ).map((t) => {
              const active = view === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setView(t.k)}
                  className={`rounded-full px-5 py-1.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
                    active
                      ? "bg-primary text-white qc-hard-shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          {plan === undefined ? (
            <div className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Building your plan…
            </div>
          ) : plan === null ? (
            <p className="text-body-sm text-on-surface-variant">
              Your session expired. Please sign in again.
            </p>
          ) : plan.days.length === 0 && plan.unscheduled.length === 0 ? (
            <EmptyState />
          ) : view === "todo" ? (
            <TodoView plan={plan} nowMs={nowMs} isDone={isDone} onToggle={toggle} />
          ) : (
            <CalendarView plan={plan} nowMs={nowMs} isDone={isDone} onToggle={toggle} />
          )}
        </div>
      </main>
    </DashboardShell>
  );
}

// -----------------------------------------------------------------------------
// Shared bits
// -----------------------------------------------------------------------------

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "error";
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-[var(--font-label)] text-label-sm " +
        (tone === "error"
          ? "border-error bg-error-container/40 text-on-surface"
          : "border-on-surface/20 bg-surface text-on-surface-variant")
      }
    >
      <span className="font-bold text-on-surface">{value}</span> {label}
    </span>
  );
}

const KIND_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  essay: PenLine,
  document: FileText,
  profile: ClipboardList,
  recommender: Users,
  fee: CreditCard,
  submit: Send,
};

function kindIcon(kind: string): React.ComponentType<{ className?: string }> {
  // kinds may be finer-grained (e.g. "essay_supplement") — match by prefix.
  const base = kind.split(/[_-]/)[0];
  return KIND_ICONS[base] ?? CalendarClock;
}

function fmtMin(min: number): string {
  if (min >= 60) {
    const h = Math.round((min / 60) * 10) / 10;
    return `~${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  return `~${min} min`;
}

function TaskRow({
  task,
  nowMs,
  done,
  onToggle,
}: {
  task: UnifiedTask;
  nowMs: number;
  done: boolean;
  onToggle: (task: UnifiedTask, next: boolean) => void;
}) {
  const Icon = kindIcon(task.kind);
  const overdue = task.deadlineMs != null && task.deadlineMs < nowMs && !done;
  return (
    <li className="flex items-start gap-3 rounded-xl border-2 border-on-surface/15 bg-surface p-3 qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => onToggle(task, e.target.checked)}
        aria-label={`Mark "${task.label}" ${done ? "not done" : "done"}`}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
      />
      <a
        href={task.route}
        className="flex min-w-0 flex-1 items-start gap-3"
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-display text-title-sm font-bold text-on-surface ${
              done ? "line-through opacity-60" : ""
            }`}
          >
            {task.label}
          </p>
          {task.detail && (
            <p className="mt-0.5 line-clamp-1 text-label-sm text-on-surface-variant">
              {task.detail}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-on-surface/20 bg-surface px-2 py-0.5 text-label-sm text-on-surface-variant">
              {task.targetName}
            </span>
            <span className="font-[var(--font-label)] text-label-sm text-on-surface/50">
              {task.estimateMin}m
            </span>
            {overdue && (
              <span className="inline-flex items-center rounded-full border border-error bg-error-container/40 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
                overdue
              </span>
            )}
          </div>
        </div>
      </a>
    </li>
  );
}

// -----------------------------------------------------------------------------
// To-do view
// -----------------------------------------------------------------------------

function dayHeading(dateStr: string, nowMs: number): string {
  const d = parseISO(dateStr);
  const today = new Date(nowMs);
  const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, tomorrow)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

function TodoView({
  plan,
  nowMs,
  isDone,
  onToggle,
}: {
  plan: UnifiedPlan;
  nowMs: number;
  isDone: (task: UnifiedTask) => boolean;
  onToggle: (task: UnifiedTask, next: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {plan.days.map((day) => (
        <section
          key={day.date}
          className="rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow-sm sm:p-5"
        >
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-headline-sm font-bold text-on-surface">
              {dayHeading(day.date, nowMs)}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface/20 bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
              <CalendarClock className="h-3.5 w-3.5" />
              {fmtMin(day.totalMin)}
            </span>
          </header>
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {day.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                nowMs={nowMs}
                done={isDone(task)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      ))}

      {plan.unscheduled.length > 0 && (
        <section className="rounded-2xl border-2 border-on-surface/15 bg-surface/80 p-4 qc-hard-shadow-sm sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-headline-sm font-bold text-on-surface">Anytime</h2>
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              No fixed deadline yet
            </span>
          </header>
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {plan.unscheduled.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                nowMs={nowMs}
                done={isDone(task)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Calendar view
// -----------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarView({
  plan,
  nowMs,
  isDone,
  onToggle,
}: {
  plan: UnifiedPlan;
  nowMs: number;
  isDone: (task: UnifiedTask) => boolean;
  onToggle: (task: UnifiedTask, next: boolean) => void;
}) {
  const today = new Date(nowMs);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date(nowMs)));
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, UnifiedDay>();
    for (const d of plan.days) map.set(d.date, d);
    return map;
  }, [plan.days]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-headline-sm font-bold text-on-surface">
          {format(cursor, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface/20 bg-surface text-on-surface transition-colors hover:border-on-surface"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface/20 bg-surface text-on-surface transition-colors hover:border-on-surface"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="pb-1 text-center font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {gridDays.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const day = byDate.get(key);
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isSelected = selected === key;
          const hasTasks = !!day && day.tasks.length > 0;
          return (
            <button
              key={key}
              type="button"
              disabled={!hasTasks}
              onClick={() => setSelected(isSelected ? null : key)}
              className={`flex min-h-[68px] min-w-0 flex-col rounded-lg border-2 p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2 ${
                isSelected
                  ? "border-on-surface bg-secondary-container"
                  : hasTasks
                    ? "border-on-surface/20 bg-surface hover:border-on-surface"
                    : "border-on-surface/10 bg-surface/60"
              } ${inMonth ? "" : "opacity-40"} ${
                isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-surface" : ""
              } ${hasTasks ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`font-[var(--font-label)] text-label-sm font-bold ${
                  isToday ? "text-primary" : "text-on-surface"
                }`}
              >
                {format(d, "d")}
              </span>

              {day && (
                <>
                  {/* Desktop: up to 2 chips + overflow */}
                  <div className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {day.tasks.slice(0, 2).map((task) => (
                      <span
                        key={task.id}
                        className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight text-on-surface"
                      >
                        {task.label}
                      </span>
                    ))}
                    {day.tasks.length > 2 && (
                      <span className="text-[10px] font-semibold text-on-surface-variant">
                        +{day.tasks.length - 2} more
                      </span>
                    )}
                    <span className="mt-0.5 text-[10px] text-on-surface/50">
                      {fmtMin(day.totalMin)}
                    </span>
                  </div>
                  {/* Mobile: dot + count only */}
                  <div className="mt-auto flex items-center gap-1 sm:hidden">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-semibold text-on-surface-variant">
                      {day.tasks.length}
                    </span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected-day panel */}
      {selectedDay && (
        <section className="mt-6 rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow-sm sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-headline-sm font-bold text-on-surface">
              {dayHeading(selectedDay.date, nowMs)}
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface/20 bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
              <CalendarClock className="h-3.5 w-3.5" />
              {fmtMin(selectedDay.totalMin)}
            </span>
          </header>
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {selectedDay.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                nowMs={nowMs}
                done={isDone(task)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty state
// -----------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-surface qc-hard-shadow-sm">
        <CalendarClock className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-title-lg font-bold text-on-surface">
        Nothing scheduled yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-body-sm text-on-surface-variant">
        Save universities and finish research to build your plan — we'll split the work into small,
        balanced days.
      </p>
      <Link
        to="/universities"
        search={{ q: "" } as never}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        Find universities
      </Link>
    </div>
  );
}
