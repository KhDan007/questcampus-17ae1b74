import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Loader2,
  Play,
  Search,
  Send,
  Square,
} from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DocumentManager } from "@/components/apply/DocumentManager";
import { ApplyStepper } from "@/components/apply/ApplyStepper";
import { ResearchDock } from "@/components/apply/ResearchDock";
import { ResumeBanner } from "@/components/apply/ResumeBanner";
import { NextProductiveAction } from "@/components/apply/NextProductiveAction";
import { SelectableUniCard } from "@/components/apply/SelectableUniCard";
import { BatchActionBar } from "@/components/apply/BatchActionBar";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { useApplySelection } from "@/lib/applyQueue/selection";
import { useApplyActions } from "@/lib/applyQueue/client";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";
import { useMemo, useState } from "react";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";

export const Route = createFileRoute("/apply")({
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
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated)
    return <Navigate to="/signin" search={{ redirect: "/apply" } as never} />;

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-44 pt-28 sm:px-8 sm:pb-32 lg:px-12"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mt-6">
          <ApplyStepper current="pick" />
        </div>

        <header className="mt-8">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Auto-Apply
          </p>
          <h1 className="mt-2 font-display text-display-md text-on-surface">
            <Send className="mr-2 inline h-7 w-7 text-primary" />
            Pick universities. We do the rest.
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Select one or many. Prep your details once. We deep-research each portal, fill it in a
            live browser, and hand you the wheel before submit.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          <ResumeBanner />

          <SilentErrorBoundary>
            <ResearchDock />
          </SilentErrorBoundary>

          <SilentErrorBoundary>
            <NextProductiveAction />
          </SilentErrorBoundary>

          <SilentErrorBoundary>
            <SavedToPick />
          </SilentErrorBoundary>

          <details className="rounded-2xl border-2 border-on-surface/15 bg-surface/70 p-4 backdrop-blur-sm">
            <summary className="cursor-pointer font-display text-headline-sm font-bold text-on-surface">
              Your documents
            </summary>
            <div className="mt-4">
              <SilentErrorBoundary>
                <DocumentManager />
              </SilentErrorBoundary>
            </div>
          </details>
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
      <section className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
        <p className="font-display text-headline-sm font-bold text-on-surface">
          Start by saving a few universities
        </p>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Browse your AI matches or search to build a shortlist — then come back to deep-research and apply in one batch.
        </p>
        <Link
          to="/universities"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
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
    <section className="rounded-2xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
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
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </header>

      {count === 0 && (
        <p className="mt-3 rounded-md border-2 border-dashed border-on-surface/20 bg-surface-container-lowest px-3 py-2 text-label-sm text-on-surface-variant">
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
