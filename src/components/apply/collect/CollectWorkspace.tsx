"use client";

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";
import {
  useAnswerEligibility,
  useAutoApplyEntitlement,
  useChecklist,
  useEligibility,
  useIntakePlan,
  useSetAnswer,
  useTargetsFromSelection,
  type BackendTarget,
  type IntakeTarget,
} from "@/lib/apply/intake";
import { EligibilityCard } from "./EligibilityCard";
import { ReadinessRail } from "./ReadinessRail";
import { LaunchBar } from "./LaunchBar";
import { GuidedPrep } from "./GuidedPrep";


export function CollectWorkspace({
  targets: targetsProp,
}: {
  targets?: BackendTarget[];
} = {}) {
  const navigate = useNavigate();
  const { items } = useApplySelection();
  const selectionTargets = useTargetsFromSelection(items);
  const targets = targetsProp ?? selectionTargets;
  const targetCount = targets.length;

  const plan = useIntakePlan(targets);
  const eligibility = useEligibility(targets);
  const checklist = useChecklist(targets);
  const entitlement = useAutoApplyEntitlement(targets);
  const setAnswer = useSetAnswer();
  const answerEligibility = useAnswerEligibility();

  const coverageByKey = useMemo(() => {
    const m = new Map<string, "full" | "partial" | "error" | undefined>();
    for (const t of plan?.targets ?? []) {
      m.set(`${t.system}::${t.externalId}`, t.coverage);
    }
    return m;
  }, [plan]);

  // Progress % — count only fully-captured targets so a thin/empty catalog
  // can't inflate readiness.
  const fullKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of plan?.targets ?? []) {
      if (t.coverage === "full") s.add(`${t.system}::${t.externalId}`);
    }
    return s;
  }, [plan]);

  const { answered: countedAnswered, total: countedTotal } = useMemo(() => {
    if (!plan) return { answered: 0, total: 0 };
    let a = 0;
    let t = 0;
    for (const it of plan.shared ?? []) {
      if (!it.required) continue;
      t += 1;
      if (it.answered) a += 1;
    }
    for (const g of plan.specific ?? []) {
      const key = `${g.system}::${g.externalId}`;
      if (!fullKeys.has(key)) continue;
      for (const it of g.items ?? []) {
        if (!it.required) continue;
        t += 1;
        if (it.answered) a += 1;
      }
    }
    // Fallback to backend summary when no per-target coverage yet exists.
    if (t === 0 && plan.summary) {
      return { answered: plan.summary.answered, total: plan.summary.totalAskable };
    }
    return { answered: a, total: t };
  }, [plan, fullKeys]);

  const percent = countedTotal > 0
    ? Math.round((countedAnswered / countedTotal) * 100)
    : 0;

  const planTargets: IntakeTarget[] = useMemo(() => {
    if (plan?.targets && plan.targets.length > 0) return plan.targets;
    return targets.map((t) => ({
      system: t.system,
      externalId: t.externalId,
      name: t.name ?? "",
      found: true,
    }));
  }, [plan, targets]);

  const readyTargets: BackendTarget[] = useMemo(() => {
    return targets.filter((t) => {
      const coverage = coverageByKey.get(`${t.system}::${t.externalId}`);
      if (coverage !== "full") return false;
      const c = checklist?.perTarget.find(
        (x) => x.system === t.system && x.externalId === t.externalId,
      );
      const e = eligibility?.perTarget.find(
        (x) => x.system === t.system && x.externalId === t.externalId,
      );
      return (c?.checklist?.ready ?? false) && e?.verdict !== "ineligible";
    });
  }, [targets, checklist, eligibility, coverageByKey]);

  const hiddenIncompleteCount = useMemo(() => {
    if (!plan?.targets) return 0;
    return targets.filter((t) => {
      const cov = coverageByKey.get(`${t.system}::${t.externalId}`);
      return cov !== undefined && cov !== "full";
    }).length;
  }, [targets, plan, coverageByKey]);


  if (targetCount === 0) {

    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest p-8 text-center">
        <h2 className="font-display text-headline-md font-bold text-on-surface">
          Pick universities first
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Choose one or more universities on your shortlist — we'll pull the exact requirements for each and only ask what's needed.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/apply" })}
          className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" /> Choose universities
        </button>
      </div>
    );
  }

  const loading = plan === undefined || eligibility === undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <header className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                Collect
              </p>
              <h2 className="mt-1 font-display text-headline-lg font-bold text-on-surface">
                Answer once, apply everywhere.
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                We only ask what your {targetCount} {targetCount === 1 ? "university needs" : "universities need"}. Everything saves as you type.
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-display text-display-sm font-bold text-on-surface">{percent}%</p>
              <p className="text-label-sm text-on-surface-variant">
                {countedAnswered} / {countedTotal} answered
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </header>

        {loading ? (
          <div className="grid gap-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {eligibility && (
              <EligibilityCard
                eligibility={eligibility}
                onAnswer={(askKey, value) => answerEligibility(askKey, value)}
                showQuestions={false}
              />
            )}

            <GuidedPrep
              targets={targets}
              plan={plan}
              eligibility={eligibility}
              onSetAnswer={setAnswer}
              onAnswerEligibility={answerEligibility}
            />

            {(plan?.specific ?? []).some(
              (s) =>
                plan?.targets.find(
                  (x) => x.system === s.system && x.externalId === s.externalId,
                )?.found === false,
            ) && (
              <section className="space-y-2">
                {(plan?.specific ?? []).map((s) => {
                  const t = plan?.targets.find(
                    (x) => x.system === s.system && x.externalId === s.externalId,
                  );
                  if (t?.found !== false) return null;
                  return (
                    <div
                      key={`${s.system}::${s.externalId}`}
                      className="flex items-center gap-3 rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest p-4"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
                      <p className="text-body-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{s.name}:</span>{" "}
                        researching requirements… we'll add its questions when ready.
                      </p>
                    </div>
                  );
                })}
              </section>
            )}

            {(plan?.manualNotes ?? []).length > 0 && (
              <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow">
                <h3 className="font-display text-headline-sm font-bold text-on-surface">
                  Handle manually
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {(plan?.manualNotes ?? []).map((n, i) => (
                    <li key={i} className="text-body-sm text-on-surface-variant">
                      <span className="font-semibold capitalize text-on-surface">{n.kind}:</span>{" "}
                      {(n.targetNames ?? []).join(", ")}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <div className="space-y-4">
        <ReadinessRail
          targets={planTargets}
          eligibility={eligibility?.perTarget}
          checklist={checklist}
        />
      </div>

      <div className="lg:col-span-2">
        <LaunchBar
          entitlement={entitlement}
          percent={percent}
          readyTargets={readyTargets}
          hiddenIncompleteCount={hiddenIncompleteCount}
        />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5">
      <div className="h-4 w-40 rounded bg-on-surface/10" />
      <div className="mt-3 h-3 w-full rounded bg-on-surface/10" />
      <div className="mt-2 h-3 w-3/4 rounded bg-on-surface/10" />
    </div>
  );
}
