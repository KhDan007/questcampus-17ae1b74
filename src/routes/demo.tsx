import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ListChecks,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  PortalReplica,
  type PortalReplicaSpec,
  type PortalReplicaStep,
} from "@/components/demo/PortalReplica";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n/I18nProvider";

/* ── Local types for the (untyped) demo.plan contract ───────────────────── */

type DemoPlanStep = PortalReplicaStep;
type DemoPlanPortal = PortalReplicaSpec;
type DemoPlan = {
  portals: DemoPlanPortal[];
  totals: { portals: number; fields: number; yours: number; examples: number };
};

/* ── Animation pacing (ms) ──────────────────────────────────────────────── */

const MS_PER_CHAR = 30;
const FIELD_TYPE_CAP = 600;
const FIELD_BEAT = 250;
const PORTAL_BEAT = 900;

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo — QuestCampus" }] }),
  component: DemoPage,
});

function DemoPage() {
  // All hooks BEFORE any auth guard — Rules of Hooks.
  const { isAuthenticated, token, isHydrated } = useAuth();

  if (isHydrated && !isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/demo" } as never} />;
  }

  return (
    <DashboardShell>
      <main
        id="main-content"
        className="mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Auto-Apply
        </Link>
        {token ? <DemoBody token={token} /> : <DemoSkeleton />}
      </main>
    </DashboardShell>
  );
}

function DemoBody({ token }: { token: string }) {
  const prefill = useMutation(api.commonAppProfile.prefillFromOnboarding);

  // Idempotent onboarding prefill so basics show as the user's own data. Fire
  // once on mount; ignore errors (it's best-effort and safe to skip).
  const [prefillDone, setPrefillDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // Hard cap: a slow or failed prefill must never block the demo. Whichever
    // settles first — the mutation or this cap — unblocks the plan query.
    // No ref-guard: prefillFromOnboarding is idempotent, and a ref-guard would
    // deadlock the gate under React's dev effect double-invoke (the first run's
    // finally sees a stale flag, the re-armed run early-returns → never flips).
    const cap = setTimeout(() => {
      if (!cancelled) setPrefillDone(true);
    }, 2500);
    void (async () => {
      try {
        await prefill({ token });
      } catch {
        // best-effort — the plan still returns fallback portals.
      } finally {
        if (!cancelled) setPrefillDone(true);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [prefill, token]);

  // Load the plan only after the prefill attempt resolves, so onboarding basics
  // land in applicationAnswers first and surface as "yours".
  const plan = useQuery(
    api.demo.plan,
    prefillDone && token ? { token } : "skip",
  ) as DemoPlan | undefined;

  if (plan === undefined) return <DemoSkeleton />;
  return <DemoStage plan={plan} />;
}

/* ── The stage: single-clock animation loop drives everything ───────────── */

type PortalRunState = "pending" | "filling" | "done";

function DemoStage({ plan }: { plan: DemoPlan }) {
  const reduce = useReducedMotion();
  const portals = plan.portals;

  // ── One local state source: every field below updates in the SAME commit as
  //    the ticker, rail and activity, so they are in perfect sync by construction.
  const [activePortalIdx, setActivePortalIdx] = useState(0);
  const [portalStates, setPortalStates] = useState<PortalRunState[]>(() =>
    portals.map((_, i) => (i === 0 ? "filling" : "pending")),
  );
  const [filledCounts, setFilledCounts] = useState<number[]>(() => portals.map(() => 0));
  const [displayValueByFieldKey, setDisplayValueByFieldKey] = useState<Record<string, string>>({});
  const [filledFieldKeys, setFilledFieldKeys] = useState<Set<string>>(() => new Set());
  const [tickerField, setTickerField] = useState<{ label: string; source: "yours" | "example" } | null>(
    null,
  );
  const [fillingFieldKey, setFillingFieldKey] = useState<string | undefined>(undefined);
  const [activityLines, setActivityLines] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  const portalRefs = useRef<Array<HTMLDivElement | null>>([]);
  const feedRef = useRef<HTMLOListElement>(null);
  // Monotonic run id: bumping it aborts any in-flight loop (Replay/Skip/unmount).
  const runIdRef = useRef(0);

  const totalFields = useMemo(
    () => portals.reduce((s, p) => s + p.steps.length, 0),
    [portals],
  );

  // Reset to a fresh pristine state (shared by initial run, Replay).
  const resetState = useCallback(() => {
    setActivePortalIdx(0);
    setPortalStates(portals.map((_, i) => (i === 0 ? "filling" : "pending")));
    setFilledCounts(portals.map(() => 0));
    setDisplayValueByFieldKey({});
    setFilledFieldKeys(new Set());
    setTickerField(null);
    setFillingFieldKey(undefined);
    setActivityLines([]);
    setComplete(false);
  }, [portals]);

  // ── The driver. Bumps runIdRef; if a newer run starts (or we unmount) the
  //    `runId !== runIdRef.current` checks bail so no setState fires stale.
  const runLoop = useCallback(async () => {
    const runId = ++runIdRef.current;
    const alive = () => runId === runIdRef.current;
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(res, ms);
        // If aborted mid-sleep, the resolve still fires but alive() gates the next step.
        void id;
      });

    resetState();
    // Let the reset commit before the loop mutates state again.
    await sleep(0);
    if (!alive()) return;

    for (let pi = 0; pi < portals.length; pi++) {
      const portal = portals[pi];
      if (!alive()) return;
      setActivePortalIdx(pi);
      setPortalStates((prev) => prev.map((s, i) => (i === pi ? "filling" : s)));
      // Scroll the portal into view as it becomes active.
      portalRefs.current[pi]?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });

      for (let si = 0; si < portal.steps.length; si++) {
        const step = portal.steps[si];
        if (!alive()) return;

        setTickerField({ label: step.label, source: step.source });
        setFillingFieldKey(step.fieldKey);
        setActivityLines((prev) => [...prev, `${portal.university}: ${step.label}`]);

        // Type the value char-by-char (capped), or set at once for reduced motion.
        if (reduce || step.value.length === 0) {
          setDisplayValueByFieldKey((prev) => ({ ...prev, [step.fieldKey]: step.value }));
        } else {
          const perChar = Math.max(4, Math.min(MS_PER_CHAR, FIELD_TYPE_CAP / step.value.length));
          for (let ci = 1; ci <= step.value.length; ci++) {
            if (!alive()) return;
            const partial = step.value.slice(0, ci);
            setDisplayValueByFieldKey((prev) => ({ ...prev, [step.fieldKey]: partial }));
            await sleep(perChar);
          }
        }
        if (!alive()) return;

        setFilledFieldKeys((prev) => {
          const next = new Set(prev);
          next.add(step.fieldKey);
          return next;
        });
        setFilledCounts((prev) => prev.map((c, i) => (i === pi ? si + 1 : c)));
        await sleep(FIELD_BEAT);
      }

      if (!alive()) return;
      setFillingFieldKey(undefined);
      setPortalStates((prev) => prev.map((s, i) => (i === pi ? "done" : s)));
      setActivityLines((prev) => [
        ...prev,
        `${portal.university} — filled ${portal.steps.length}/${portal.steps.length}`,
      ]);
      await sleep(PORTAL_BEAT);
    }

    if (!alive()) return;
    setTickerField(null);
    setComplete(true);
    setActivityLines((prev) => [
      ...prev,
      `Done — ${plan.totals.portals} portals · ${plan.totals.fields} fields · ${plan.totals.yours} your answers · ${plan.totals.examples} examples`,
    ]);
  }, [portals, plan.totals, reduce, resetState]);

  // Kick the loop on mount / when the plan changes; abort it on unmount.
  useEffect(() => {
    void runLoop();
    return () => {
      // Invalidate the in-flight run so queued setTimeouts don't setState after unmount.
      runIdRef.current++;
    };
  }, [runLoop]);

  // Auto-scroll the activity feed to the newest line.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activityLines.length]);

  // ── Replay: reset and run from scratch.
  const replay = useCallback(() => {
    void runLoop();
  }, [runLoop]);

  // ── Skip to end: abort the loop, fill everything instantly, complete.
  const skipToEnd = useCallback(() => {
    runIdRef.current++; // abort any in-flight loop
    const allValues: Record<string, string> = {};
    const allKeys = new Set<string>();
    for (const p of portals) {
      for (const s of p.steps) {
        allValues[s.fieldKey] = s.value;
        allKeys.add(s.fieldKey);
      }
    }
    setDisplayValueByFieldKey(allValues);
    setFilledFieldKeys(allKeys);
    setFilledCounts(portals.map((p) => p.steps.length));
    setPortalStates(portals.map(() => "done"));
    setActivePortalIdx(portals.length - 1);
    setFillingFieldKey(undefined);
    setTickerField(null);
    setComplete(true);
    setActivityLines([
      `Done — ${plan.totals.portals} portals · ${plan.totals.fields} fields · ${plan.totals.yours} your answers · ${plan.totals.examples} examples`,
    ]);
  }, [portals, plan.totals]);

  const scrollToPortal = useCallback((idx: number) => {
    portalRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Live demo
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 font-display text-headline-lg font-bold text-on-surface">
            <span>Auto-apply demo</span>
            <span className="rounded-md bg-surface-container px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Demo — nothing is submitted
            </span>
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Watch one set of answers fill {portals.length} university portals, perfectly in sync.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
          >
            Replay
          </button>
          {!complete && (
            <button
              type="button"
              onClick={skipToEnd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-[var(--font-label)] text-label-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              Skip to end
            </button>
          )}
        </div>
      </header>

      {/* Chapter rail */}
      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {portals.map((p, i) => (
          <PortalChip
            key={p.key}
            name={p.name}
            university={p.university}
            state={portalStates[i]}
            filled={filledCounts[i]}
            total={p.steps.length}
            active={i === activePortalIdx && !complete}
            reduce={!!reduce}
            onClick={() => scrollToPortal(i)}
          />
        ))}
      </ol>

      {/* Ticker */}
      <DemoTickerLine field={tickerField} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Stage — all three portals stay mounted, stacked. */}
        <div className="min-w-0 space-y-8">
          {portals.map((p, i) => (
            <div
              key={p.key}
              ref={(el) => {
                portalRefs.current[i] = el;
              }}
              className={`scroll-mt-28 rounded-2xl transition-shadow ${
                i === activePortalIdx && !complete ? "ring-1 ring-primary/30" : ""
              }`}
            >
              <PortalReplica
                portal={p}
                fillingFieldKey={i === activePortalIdx ? fillingFieldKey : undefined}
                displayValueByFieldKey={displayValueByFieldKey}
                filledFieldKeys={filledFieldKeys}
              />
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <aside className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow lg:sticky lg:top-28 lg:self-start">
          <h2 className="flex items-center gap-1.5 font-display text-headline-sm font-bold text-on-surface">
            <ListChecks className="h-4 w-4 text-primary" /> Activity
            {!complete && (
              <span className="ml-1 inline-flex items-center gap-1.5 text-label-sm font-normal text-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                live
              </span>
            )}
          </h2>
          <ol
            ref={feedRef}
            className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1 text-body-sm"
          >
            {activityLines.length === 0 ? (
              <li className="text-on-surface-variant">Starting the demo…</li>
            ) : (
              activityLines.map((line, i) => (
                <li
                  key={`${i}-${line}`}
                  className="min-w-0 break-words rounded-md px-2 py-1.5 text-on-surface"
                >
                  {line}
                </li>
              ))
            )}
          </ol>
        </aside>
      </div>

      {complete && <DemoSummary totals={plan.totals} totalFields={totalFields} />}
    </>
  );
}

/* ── Local demo-scoped subcomponents (QC design tokens) ─────────────────── */

function PortalChip({
  name,
  university,
  state,
  filled,
  total,
  active,
  reduce,
  onClick,
}: {
  name: string;
  university: string;
  state: PortalRunState;
  filled: number;
  total: number;
  active: boolean;
  reduce: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const done = state === "done";
  const filling = state === "filling";
  const icon = done ? (
    <CheckCircle2 className="h-5 w-5 text-tertiary" aria-hidden />
  ) : filling ? (
    <Loader2 className={`h-5 w-5 text-primary ${reduce ? "" : "animate-spin"}`} aria-hidden />
  ) : (
    <Circle className="h-5 w-5 text-on-surface/35" aria-hidden />
  );

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onClick}
        title={t("audit.demo.scrollTo", { university })}
        className={`flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2.5 text-left qc-soft-shadow transition-colors hover:bg-on-surface/[0.03] ${
          active ? "ring-1 ring-primary/30" : ""
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
            {name}
          </span>
          <span className="block font-[var(--font-label)] text-label-sm text-on-surface-variant">
            {done ? "Filled" : filling ? "Filling" : "Waiting"}
          </span>
        </span>
        <span className="shrink-0 font-[var(--font-label)] text-label-sm tabular-nums text-on-surface-variant">
          {filled}/{total}
        </span>
      </button>
    </li>
  );
}

function DemoTickerLine({
  field,
}: {
  field: { label: string; source: "yours" | "example" } | null;
}) {
  if (!field) return null;
  const yours = field.source === "yours";
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2 qc-soft-shadow"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
          yours ? "bg-tertiary" : "bg-secondary"
        }`}
        aria-hidden
      />
      <span className="min-w-0 text-body-sm text-on-surface">
        Filling <span className="font-semibold">{field.label}</span>
      </span>
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold ${
          yours
            ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            : "bg-secondary-fixed text-on-secondary-fixed-variant"
        }`}
      >
        {yours ? "your answer" : "example"}
      </span>
    </div>
  );
}

function DemoSummary({
  totals,
  totalFields,
}: {
  totals: DemoPlan["totals"];
  totalFields: number;
}) {
  const fields = totals.fields || totalFields;
  return (
    <div className="mt-8 rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6">
      <p className="flex items-center gap-1.5 font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-4 w-4" aria-hidden /> Demo complete
      </p>
      <p className="mt-2 font-display text-headline-md font-bold text-on-surface">
        {totals.portals} portals · {fields} fields · 1 set of answers
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-tertiary" aria-hidden />
          {totals.yours} your answers
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-secondary" aria-hidden />
          {totals.examples} examples
        </span>
      </p>
      <div className="mt-5">
        <Link
          to="/extension"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
        >
          This, on your real application — get the extension
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function DemoSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-on-surface/10" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-on-surface/10" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="aspect-[16/11] w-full animate-pulse rounded-2xl bg-on-surface/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-on-surface/10" />
      </div>
    </div>
  );
}
