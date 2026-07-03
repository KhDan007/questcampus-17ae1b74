import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CollectWorkspace } from "@/components/apply/collect/CollectWorkspace";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  useGuidedSteps,
  type GuidedStep,
} from "@/lib/apply/guidedSteps";
import type { BackendTarget } from "@/lib/apply/intake";

export const Route = createFileRoute("/prep")({
  head: () => ({
    meta: [
      { title: "Prep your applications — QuestCampus" },
      {
        name: "description",
        content:
          "A guided, step-by-step workspace to prepare every university application. Answer once — reuse everywhere.",
      },
    ],
  }),
  component: PrepPage,
});

function PrepPage() {
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({
        system: s.source,
        externalId: s.externalId,
        name: s.name,
      })),
    [saved],
  );
  const guided = useGuidedSteps(targets);
  const percent =
    guided.total > 0 ? Math.round((guided.doneCount / guided.total) * 100) : 0;

  const nextLabel = guided.next ? nextStepLabel(guided.next) : null;

  return (
    <>
      <LivingBackground />
      <DashboardShell>
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-(--container-content) px-4 pb-16 pt-20 sm:px-6 lg:px-8"
        >
          <Link
            to="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>

          <header className="mb-6 rounded-2xl border-2 border-on-surface bg-surface/95 p-5 backdrop-blur-md qc-hard-shadow sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                  Guided application prep
                </p>
                <h1 className="mt-1 font-display text-display-sm font-bold text-on-surface sm:text-display-md">
                  One question at a time.
                </h1>
                <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                  We ask only what your universities need. Each answer is saved
                  and reused across every application in your shortlist.
                </p>
                {nextLabel && (
                  <p className="mt-3 font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                    Up next: <span className="text-primary">{nextLabel}</span>
                  </p>
                )}
              </div>
              {guided.total > 0 && (
                <div className="shrink-0 text-right">
                  <p className="font-display text-display-sm font-bold text-on-surface">
                    {percent}%
                  </p>
                  <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                    {guided.doneCount} of {guided.total} steps done
                  </p>
                </div>
              )}
            </div>
            {guided.total > 0 && (
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface">
                <div
                  className="h-full bg-primary transition-[width] duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </header>

          <SilentErrorBoundary>
            <CollectWorkspace targets={targets} />
          </SilentErrorBoundary>
        </main>
      </DashboardShell>
    </>
  );
}

function nextStepLabel(step: GuidedStep): string {
  const scope = step.targetName ? ` — ${step.targetName}` : "";
  switch (step.kind) {
    case "eligibility":
      return `${step.label}${scope}`;
    case "document":
      return `Upload ${step.label.toLowerCase()}`;
    case "essay":
      return `${step.label}${scope}`;
    case "field":
    default:
      return `${step.label}${scope}`;
  }
}
