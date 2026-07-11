import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckSquare,
  Loader2,
  Play,
  Search,
  Square,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SectionHeading } from "@/components/ui/calm";
import { DocumentManager } from "@/components/apply/DocumentManager";
import { ApplyStepper } from "@/components/apply/ApplyStepper";
import { ResearchDock } from "@/components/apply/ResearchDock";
import { ResumeBanner } from "@/components/apply/ResumeBanner";
import { NextProductiveAction } from "@/components/apply/NextProductiveAction";
import { SelectableUniCard } from "@/components/apply/SelectableUniCard";
import { BatchActionBar } from "@/components/apply/BatchActionBar";
import { AgentCommandCard } from "@/components/agent/AgentCommandCard";
import { CollectWorkspace } from "@/components/apply/collect/CollectWorkspace";
import { CommonAppProfile } from "@/components/apply/CommonAppProfile";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { useApplySelection } from "@/lib/applyQueue/selection";
import { useRunDemo } from "@/lib/applyQueue/useRunDemo";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";
import {
  STRENGTH_CRITERIA,
  strengthSummaryCopy,
  useApplicationStrength,
} from "@/lib/apply/applicationStrength";
import { useMemo } from "react";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";

export const Route = createFileRoute("/apply/")({
  head: () => ({
    meta: [
      { title: "Auto-Apply — QuestCampus" },
      {
        name: "description",
        content:
          "Pick your universities, prep once, and we research and fill every application for you.",
      },
    ],
  }),
  component: ApplyHubPage,
});

function ApplyHubPage() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <DashboardShell>
        <main className="mx-auto w-full max-w-(--container-content) px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12">
          <div className="inline-flex items-center gap-2 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface-variant qc-soft-shadow">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading auto-apply workspace...
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated)
    return <Navigate to="/signin" search={{ redirect: "/apply" } as never} />;

  return (
    <DashboardShell>
      <main
        id="main-content"
        className="mx-auto w-full max-w-(--container-content) px-4 pb-44 pt-20 sm:px-6 sm:pb-32 lg:px-8"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mt-5">
          <ApplyStepper current="pick" />
        </div>

        <header className="mt-6">
          <h1 className="font-display text-headline-lg font-bold text-on-surface">
            Applications
          </h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Pick your universities, prep your details once, and we deep-research and fill every
            portal in a live browser — you take the wheel before submit.
          </p>
        </header>

        {/* Guidance + any live job, above the split */}
        <div className="mt-5 flex flex-col gap-4">
          <ResumeBanner />
          <SilentErrorBoundary>
            <NextProductiveAction />
          </SilentErrorBoundary>
        </div>

        {/* Primary flow in the main column; tools + tracking in the rail */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
            <section>
              <SectionHeading
                title="1. Your shortlist"
                subtitle="Select the universities to deep-research and apply to."
                className="mb-4"
              />
              <SilentErrorBoundary>
                <SavedToPick />
              </SilentErrorBoundary>
            </section>

            <section>
              <SectionHeading
                title="2. Prepare your details"
                subtitle="Answer once — reused across every portal we fill."
                className="mb-4"
              />
              <div className="flex flex-col gap-5">
                <SilentErrorBoundary>
                  <CommonAppProfile embedded />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <ApplicationsPrepWorkspace />
                </SilentErrorBoundary>
              </div>
            </section>

            <section>
              <SectionHeading title="3. Research status" className="mb-4" />
              <SilentErrorBoundary>
                <ResearchDock />
              </SilentErrorBoundary>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <SilentErrorBoundary>
              <ApplicationStrengthCard />
            </SilentErrorBoundary>
            <PlanTeaserCard />
            <SilentErrorBoundary>
              <AgentCommandCard
                title="Roadmap this shortlist"
                body="Turn your shortlist into target readiness, missing prep, scholarship route, and tracker state."
              />
            </SilentErrorBoundary>
            <RunLiveDemoCard />
            <details className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow">
              <summary className="cursor-pointer font-display text-headline-sm font-bold text-on-surface">
                Your documents
              </summary>
              <div className="mt-4">
                <SilentErrorBoundary>
                  <DocumentManager />
                </SilentErrorBoundary>
              </div>
            </details>
          </aside>
        </div>
      </main>
      <BatchActionBar />
    </DashboardShell>
  );
}

function SavedToPick() {
  const { saved } = useSavedUniversities();
  const { count, items, toggle, clear } = useApplySelection();
  const planTargets: BackendTarget[] = useMemo(
    () => (saved ?? []).map((u) => ({ system: u.source, externalId: u.externalId, name: u.name })),
    [saved],
  );
  const plan = useIntakePlan(planTargets);
  const researchedSet = useMemo(() => {
    const s = new Set<string>();
    (plan?.targets ?? []).forEach((t) => {
      if (t.found) s.add(`${t.system}::${t.externalId}`);
    });
    return s;
  }, [plan]);

  if (!saved || saved.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest p-8 text-center">
        <p className="font-display text-headline-sm font-bold text-on-surface">
          Start by saving a few universities
        </p>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Browse your AI matches or search to build a shortlist — then come back to deep-research and apply in one batch.
        </p>
        <Link
          to="/universities"
          search={{ q: "" }}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <Search className="h-4 w-4" /> Find universities <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const allSelected = items.length === saved.length && saved.length > 0;
  const selectAll = () => {
    if (allSelected) {
      clear();
      return;
    }
    const selectedKeys = new Set(items.map((i) => `${i.source}::${i.externalId}`));
    for (const u of saved) {
      if (!selectedKeys.has(`${u.source}::${u.externalId}`)) {
        toggle({ source: u.source, externalId: u.externalId, name: u.name });
      }
    }
  };

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-headline-md font-bold text-on-surface">
            Your shortlist · {saved.length}
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Pick the ones you want. Deep-research them all at once, or jump straight into applying.
          </p>
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </header>

      {count === 0 && (
        <p className="mt-3 rounded-md border border-dashed border-on-surface/20 bg-surface-container px-3 py-2 text-label-sm text-on-surface-variant">
          Tip: select one or more universities below, then choose <span className="font-semibold text-on-surface">Deep research</span> or <span className="font-semibold text-on-surface">Apply</span> from the action bar.
        </p>
      )}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((u) => (
          <li key={u.id}>
            <SelectableUniCard
              source={u.source}
              externalId={u.externalId}
              name={u.name}
              city={u.city}
              country={u.country}
              researched={researchedSet.has(`${u.source}::${u.externalId}`)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApplicationsPrepWorkspace() {
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((u) => ({
        system: u.source,
        externalId: u.externalId,
        name: u.name,
      })),
    [saved],
  );

  if (!saved || saved.length === 0) return null;

  return <CollectWorkspace targets={targets} />;
}

function RunLiveDemoCard() {
  const { run: onClick, starting, error } = useRunDemo();

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed-variant">
          <Play className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            See it in action
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Watch auto-apply fill a real portal in ~60 seconds. Nothing is submitted.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={starting}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {starting ? "Starting demo…" : "Run live demo"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-label-sm font-semibold text-primary">
          {error}
        </p>
      )}
    </section>
  );
}

function PlanTeaserCard() {
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Your plan
            </p>
            <h3 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              Every task across your applications, balanced day by day
            </h3>
            <p className="mt-1 max-w-xl text-body-sm text-on-surface-variant">
              We split each application into small tasks and spread them across your days, so nothing
              piles up at the deadline.
            </p>
          </div>
        </div>
        <Link
          to="/plan"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          Open your plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function ApplicationStrengthCard() {
  const strength = useApplicationStrength();
  const weakest = strength
    ? [...strength.criteria].sort((a, b) => a.score - b.score)[0]
    : null;
  const weakestLabel = weakest ? STRENGTH_CRITERIA[weakest.key].shortLabel : null;

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Application strength
            </p>
            <h3 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              {strength ? `${strength.overall}/100 - ${strength.bandLabel}` : "Checking score..."}
            </h3>
            <p className="mt-1 max-w-xl text-body-sm text-on-surface-variant">
              {strength
                ? weakestLabel
                  ? `Weakest section: ${weakestLabel}. ${strengthSummaryCopy(strength)}`
                  : strengthSummaryCopy(strength)
                : "See your score, weak sections, and next fixes."}
            </p>
          </div>
        </div>
        <Link
          to="/apply/strength"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          {strength === undefined ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Open strength
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {strength && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.max(0, Math.min(100, strength.overall))}%` }}
          />
        </div>
      )}
    </section>
  );
}
