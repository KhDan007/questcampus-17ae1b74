"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Loader2, Sparkles } from "lucide-react";
import { useIntakeSchedule, type ScheduleSection } from "@/lib/apply/commonAppProfile";

function fmtDue(dueMs: number, now: number): { label: string; tone: "overdue" | "soon" | "neutral" } {
  const diff = dueMs - now;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 0) {
    const days = Math.max(1, Math.round(-diff / day));
    return { label: `${days}d overdue`, tone: "overdue" };
  }
  if (diff < 7 * day) {
    const days = Math.max(1, Math.round(diff / day));
    return { label: `Due in ${days}d`, tone: "soon" };
  }
  const date = new Date(dueMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return { label: `Due ${date}`, tone: "neutral" };
}

function toneClass(tone: "overdue" | "soon" | "neutral") {
  if (tone === "overdue")
    return "border-red-500/50 bg-red-500/10 text-red-700";
  if (tone === "soon")
    return "border-amber-500/50 bg-amber-500/10 text-amber-800";
  return "border-on-surface/20 bg-surface text-on-surface-variant";
}

export function CommonAppScheduleCard() {
  // Freeze `now` per mount so the query stays cacheable; refresh hourly.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const schedule = useIntakeSchedule(now);

  if (schedule === undefined) {
    return (
      <section className="flex items-center justify-center rounded-2xl border-2 border-on-surface/15 bg-surface/70 p-8 backdrop-blur-sm">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </section>
    );
  }
  if (schedule === null) return null;

  const { sections } = schedule;

  if (sections.length === 0) {
    return (
      <section className="rounded-2xl border-2 border-tertiary/50 bg-tertiary/10 p-5 qc-hard-shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-surface text-tertiary">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-tertiary">
              All done
            </p>
            <h3 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              Common App profile complete
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Every question is answered. The autofill connector will use these answers on every Common App school.
            </p>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-tertiary" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Common App plan
          </p>
          <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
            Finish these sections, in this order
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
            Broken into bite-sized sections with real deadlines so you're never staring at 150 questions at once.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface/20 bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          <CalendarClock className="h-3.5 w-3.5" />
          {sections.length} section{sections.length === 1 ? "" : "s"} left
        </span>
      </header>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <ScheduleRow key={s.sectionKey} section={s} now={now} />
        ))}
      </ul>
    </section>
  );
}

function ScheduleRow({ section, now }: { section: ScheduleSection; now: number }) {
  const due = fmtDue(section.dueMs, now);
  const total = section.unansweredTotal || 1;
  // Progress is inverted: we know how many are LEFT, not how many are done.
  // Show a required-only progress bar assuming all required were "todo" at start.
  const requiredLeft = section.unansweredRequired;
  const optionalLeft = Math.max(0, section.unansweredTotal - requiredLeft);
  return (
    <li className="flex flex-col gap-3 rounded-xl border-2 border-on-surface/15 bg-surface p-4 qc-hard-shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest text-primary">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-title-md font-bold text-on-surface">
              {section.title}
            </h3>
            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              {requiredLeft} required
              {optionalLeft > 0 ? ` · ${optionalLeft} optional` : ""} left
            </p>
          </div>
        </div>
        <span
          className={
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-[var(--font-label)] text-label-sm " +
            toneClass(due.tone)
          }
        >
          <CalendarClock className="h-3 w-3" />
          {due.label}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={section.unansweredTotal}
      >
        <div
          className={
            "h-full " +
            (due.tone === "overdue"
              ? "bg-red-500"
              : due.tone === "soon"
                ? "bg-amber-500"
                : "bg-primary")
          }
          style={{
            width: `${Math.min(100, Math.max(8, (section.unansweredTotal / (total + 4)) * 100))}%`,
          }}
        />
      </div>

      <Link
        to="/common-app"
        search={{ section: section.sectionKey } as never}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        Complete this section <ArrowRight className="h-4 w-4" />
      </Link>
    </li>
  );
}
