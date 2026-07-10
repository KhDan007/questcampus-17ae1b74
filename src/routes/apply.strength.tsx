import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Target,
} from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ApplyStepper } from "@/components/apply/ApplyStepper";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { useAuth } from "@/lib/auth/useAuth";
import {
  STRENGTH_CRITERIA,
  criterionTone,
  strengthSummaryCopy,
  useApplicationStrength,
  type StrengthCriterion,
} from "@/lib/apply/applicationStrength";

export const Route = createFileRoute("/apply/strength")({
  head: () => ({
    meta: [
      { title: "Application strength - QuestCampus" },
      {
        name: "description",
        content:
          "Review your application strength score, weakest areas, and next fixes inside QuestCampus Applications.",
      },
    ],
  }),
  component: ApplicationStrengthPage,
});

function ApplicationStrengthPage() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <DashboardShell>
        <LivingBackground />
        <main className="relative mx-auto w-full max-w-(--container-content) px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12">
          <LoadingPill copy="Loading application strength..." />
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/apply/strength" } as never} />;
  }

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:px-12"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Applications
        </Link>

        <div className="mt-6">
          <ApplyStepper current="prep" />
        </div>

        <SilentErrorBoundary>
          <StrengthBody />
        </SilentErrorBoundary>
      </main>
    </DashboardShell>
  );
}

function StrengthBody() {
  const strength = useApplicationStrength();

  if (strength === undefined) {
    return <LoadingPill copy="Checking application strength..." />;
  }

  const sorted = [...strength.criteria].sort((a, b) => a.score - b.score);
  const gaps = sorted.filter((c) => c.score < 70);

  return (
    <div className="mt-6 space-y-5 sm:mt-8">
      <section className="overflow-hidden rounded-2xl border-2 border-on-surface bg-surface qc-hard-shadow">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Application strength
            </p>
            <h1 className="mt-2 font-display text-display-md font-bold text-on-surface">
              {strength.overall}/100
            </h1>
            <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
              {strength.bandLabel}. {strengthSummaryCopy(strength)}
            </p>
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(0, Math.min(100, strength.overall))}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface bg-primary text-white">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
                  Next fix
                </p>
                <p className="font-display text-headline-sm font-bold text-on-surface">
                  {gaps[0] ? STRENGTH_CRITERIA[gaps[0].key].shortLabel : "Keep polishing"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-body-sm text-on-surface-variant">
              {gaps[0]?.gapLine ?? "No weak section stands out right now."}
            </p>
            <Link
              to="/apply"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              Fill gaps in Applications <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {strength.criteria.map((criterion) => (
          <CriterionCard key={criterion.key} criterion={criterion} />
        ))}
      </section>

      <section className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Guided fill
            </p>
            <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
              Fixes happen in Applications
            </h2>
            <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
              The Applications workspace asks the missing questions, stores reusable answers, and keeps documents and essays tied to the schools that need them.
            </p>
          </div>
          <Link
            to="/apply"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Open Applications <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function CriterionCard({ criterion }: { criterion: StrengthCriterion }) {
  const meta = STRENGTH_CRITERIA[criterion.key];
  const strong = criterion.score >= 70;
  return (
    <article className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-headline-sm font-bold text-on-surface">
            {meta.label}
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">{criterion.gapLine}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold ${criterionTone(criterion.score)}`}
        >
          {strong ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
          {criterion.score}
        </span>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-on-surface/10">
        <div
          className={strong ? "h-full bg-tertiary" : "h-full bg-primary"}
          style={{ width: `${Math.max(0, Math.min(100, criterion.score))}%` }}
        />
      </div>
      <p className="mt-3 text-label-sm text-on-surface-variant">{meta.fillHint}</p>
    </article>
  );
}

function LoadingPill({ copy }: { copy: string }) {
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-md border-2 border-on-surface/15 bg-surface/80 px-4 py-2 text-body-sm text-on-surface-variant backdrop-blur-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> {copy}
    </div>
  );
}
