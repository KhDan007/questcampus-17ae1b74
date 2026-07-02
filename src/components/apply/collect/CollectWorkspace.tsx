"use client";

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useApplySelection } from "@/lib/applyQueue/selection";
import {
  useAnswerEligibility,
  useAutoApplyEntitlement,
  useEligibility,
  useIntakePlan,
  useSetAnswer,
  useTargetsFromSelection,
  summarizePlan,
  type IntakeTarget,
} from "@/lib/apply/intake";
import { RequirementsZone } from "./RequirementsZone";
import { EligibilityCard } from "./EligibilityCard";
import { ReadinessRail } from "./ReadinessRail";
import { LaunchBar } from "./LaunchBar";

export function CollectWorkspace() {
  const navigate = useNavigate();
  const { items } = useApplySelection();
  const targets = useTargetsFromSelection(items);

  const plan = useIntakePlan(targets);
  const eligibility = useEligibility(targets);
  const entitlement = useAutoApplyEntitlement(targets);
  const setAnswer = useSetAnswer();
  const answerEligibility = useAnswerEligibility();

  const summary = useMemo(() => summarizePlan(plan), [plan]);

  const planTargets: IntakeTarget[] = useMemo(() => {
    if (plan?.targets && plan.targets.length > 0) return plan.targets;
    return items.map((i) => ({ source: i.source, externalId: i.externalId, name: i.name, found: true }));
  }, [plan, items]);

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-dashed border-on-surface/30 bg-surface/80 p-8 text-center qc-hard-shadow-sm">
        <h2 className="font-display text-headline-md font-bold text-on-surface">
          Pick universities first
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Choose one or more universities on your shortlist — we'll pull the exact requirements for each and only ask what's needed.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/apply" })}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
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
        <header className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                Collect
              </p>
              <h2 className="mt-1 font-display text-headline-lg font-bold text-on-surface">
                Answer once, apply everywhere.
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                We only ask what your {items.length} {items.length === 1 ? "university needs" : "universities need"}. Everything saves as you type.
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-display text-display-sm font-bold text-on-surface">{summary.percent}%</p>
              <p className="text-label-sm text-on-surface-variant">
                {summary.answered} / {summary.total} answered
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${summary.percent}%` }}
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
            <EligibilityCard
              entries={eligibility?.entries ?? []}
              onAnswer={(target, key, value) => {
                void answerEligibility({ target, key, value });
              }}
            />

            <RequirementsZone
              title="Shared essentials"
              subtitle="Used across every application on your list."
              requirements={plan?.shared ?? []}
              onChange={(key, value) => setAnswer({ key, value, scope: "shared" })}
            />

            <section className="space-y-3">
              <div>
                <h3 className="font-display text-headline-sm font-bold text-on-surface">
                  University-specific
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Extra questions unique to each school. Grouped so nothing overwhelms.
                </p>
              </div>
              {(plan?.specific ?? []).map((s) => {
                const notFound = s.target.found === false;
                if (notFound) {
                  return (
                    <div
                      key={`${s.target.source}::${s.target.externalId}`}
                      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-on-surface/20 bg-surface/80 p-4"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
                      <p className="text-body-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">
                          {s.target.name ?? s.target.externalId}:
                        </span>{" "}
                        researching requirements… we'll add its questions when ready.
                      </p>
                    </div>
                  );
                }
                return (
                  <RequirementsZone
                    key={`${s.target.source}::${s.target.externalId}`}
                    title={s.target.name ?? s.target.externalId}
                    requirements={s.requirements ?? []}
                    onChange={(key, value) =>
                      setAnswer({
                        key,
                        value,
                        target: { source: s.target.source, externalId: s.target.externalId },
                        scope: "specific",
                      })
                    }
                  />
                );
              })}
              {(plan?.specific ?? []).length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
                  No extra university-specific questions right now.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <div className="space-y-4">
        <ReadinessRail targets={planTargets} eligibility={eligibility?.entries} />
      </div>

      <div className="lg:col-span-2">
        <LaunchBar entitlement={entitlement} percent={summary.percent} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl border-2 border-on-surface/10 bg-surface/70 p-5">
      <div className="h-4 w-40 rounded bg-on-surface/10" />
      <div className="mt-3 h-3 w-full rounded bg-on-surface/10" />
      <div className="mt-2 h-3 w-3/4 rounded bg-on-surface/10" />
    </div>
  );
}
