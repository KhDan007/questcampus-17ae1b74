import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Play,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { useChecklist } from "@/lib/apply/intake";
import { buildAgentCockpitModel, savedUniversitiesToBackendTargets } from "@/lib/agent/cockpitModel";
import {
  targetKey,
  usePortfolioAgent,
  type AgentEvent,
  type ApplicationSubmission,
  type EvidenceEntry,
  type PortfolioBrain,
  type PortfolioTarget,
  type RoadmapAction,
  type RoadmapTip,
  type ScholarshipProgram,
} from "@/lib/agent/portfolio";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Autonomous Agent - QuestCampus" },
      {
        name: "description",
        content:
          "Your application cockpit: deep roadmap, recommendations, scholarships, readiness, extension sync, and applied tracker.",
      },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (isHydrated && !isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/agent" } as never} />;
  }

  return (
    <DashboardShell>
      <SilentErrorBoundary fallback={<AgentFallback />}>
        {isHydrated ? <AgentCockpit /> : <AgentLoading />}
      </SilentErrorBoundary>
    </DashboardShell>
  );
}

function AgentCockpit() {
  const {
    latestBrain,
    roadmap,
    events,
    run,
    submissions,
    startRoadmap,
    refreshBrain,
    startError,
  } = usePortfolioAgent();
  const { saved } = useSavedUniversities();
  const [busy, setBusy] = useState<"start" | "refresh" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const savedTargets = useMemo(() => savedUniversitiesToBackendTargets(saved), [saved]);
  const checklist = useChecklist(savedTargets);

  const model = useMemo(
    () =>
      buildAgentCockpitModel({
        savedTargets,
        latestBrain,
        roadmap,
        events,
        submissions,
        checklist,
      }),
    [savedTargets, latestBrain, roadmap, events, submissions, checklist],
  );
  const {
    targetPlans,
    recommendations,
    scholarshipPrograms,
    nextActions,
    tips,
    evidence,
    readyCount,
    blockedCount,
    extensionEvents,
    latestExtensionEvent,
    appliedCount,
    roadmapReady,
  } = model;
  const runInFlight = run?.status === "queued" || run?.status === "running";

  async function onStart() {
    if (runInFlight) return;
    setBusy("start");
    setActionError(null);
    try {
      await startRoadmap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start roadmap.");
    } finally {
      setBusy(null);
    }
  }

  async function onRefresh() {
    setBusy("refresh");
    setActionError(null);
    try {
      await refreshBrain();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not refresh portfolio brain.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-(--container-content) px-5 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12"
    >
      <header className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-7">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.12em] text-on-surface-variant/70">
              Autonomous application cockpit
            </p>
            <h1 className="mt-2 font-display text-headline-lg font-bold text-on-surface">
              Deep agent, real roadmap, ready applications.
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              QuestCampus checks your profile, saved universities, unsaved matches,
              scholarship routes, requirements, documents, extension state, and applied
              status. Chat can explain it; this cockpit runs it.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5 disabled:opacity-60"
            >
              {busy === "refresh" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh brain
            </button>
            <button
              type="button"
              onClick={() => void onStart()}
              disabled={busy !== null || runInFlight}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy === "start" || runInFlight ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {busy === "start"
                ? "Preparing brain"
                : runInFlight
                  ? "Agent running"
                  : "Run deep roadmap"}
            </button>
          </div>
        </div>

        {run && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-on-surface/8 bg-surface-container px-4 py-3">
            <span className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.12em] text-primary">
              {runInFlight ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Agent run
            </span>
            <span className="font-display text-label-lg font-bold text-on-surface">
              {humanize(run.status ?? "pending")}
            </span>
            <span className="text-label-sm text-on-surface-variant">
              {run.progress?.message ?? (run.finishedAt ? `Finished ${formatTime(run.finishedAt)}` : "Waiting for worker events")}
            </span>
          </div>
        )}

        {(startError || actionError) && (
          <div className="mt-4 rounded-xl border border-error/20 bg-error-container/50 px-4 py-3 text-body-sm text-on-error-container">
            {actionError ?? startError}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Saved targets" value={targetPlans.length} detail="Profile-owned list" />
          <MetricCard label="Ready packages" value={readyCount} detail={`${blockedCount} still blocked`} tone="ready" />
          <MetricCard label="Scholarship routes" value={scholarshipPrograms.length} detail="Aid-aware programs" tone="aid" />
          <MetricCard label="Applied" value={appliedCount} detail="Confirmed or submitted" tone="applied" />
        </div>
      </header>

      <section className="mt-5 grid grid-cols-1 items-start gap-4 sm:mt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <NextActionPanel
            actions={nextActions}
            run={run}
            roadmapReady={roadmapReady}
            roadmapSummary={roadmap?.summary}
          />
          <TargetReadinessPanel targets={targetPlans} submissions={submissions ?? []} />
          <RecommendationPanel targets={recommendations} />
          <ScholarshipPanel priority={roadmap?.scholarshipPlan?.priority} programs={scholarshipPrograms} />
        </div>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          <ExtensionSyncPanel latestEvent={latestExtensionEvent} eventCount={extensionEvents.length} />
          <DecisionTracePanel
            latestBrain={latestBrain}
            roadmapGeneratedAt={roadmap?.generatedAt ?? roadmap?.updatedAt}
            savedCount={targetPlans.length}
            readyCount={readyCount}
            recommendationCount={recommendations.length}
            scholarshipCount={scholarshipPrograms.length}
            extensionEventCount={extensionEvents.length}
            submissionCount={submissions?.length ?? 0}
            evidenceCount={evidence.length}
          />
          <GuardrailsPanel />
          <TipsPanel tips={tips} evidence={evidence} targets={targetPlans} />
          <EventLog events={events ?? []} />
          <AppliedTracker submissions={submissions ?? []} />
        </aside>
      </section>
    </main>
  );
}

function AgentLoading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-(--container-content) px-5 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12"
      aria-busy="true"
    >
      <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-7">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="h-4 w-52 rounded-full bg-primary/20" />
            <div className="mt-4 h-10 w-full max-w-xl rounded-lg bg-on-surface/10" />
            <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-on-surface/10" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-on-surface/10" />
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="h-11 w-36 rounded-lg border border-on-surface/10 bg-surface" />
            <div className="h-11 w-40 rounded-lg border border-on-surface/10 bg-primary/20" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
          {["Saved targets", "Ready packages", "Scholarships", "Applied"].map((label) => (
            <div key={label} className="rounded-xl border border-on-surface/8 bg-surface-container p-4">
              <div className="h-3 w-24 rounded-full bg-on-surface/10" />
              <div className="mt-3 h-8 w-12 rounded bg-on-surface/10" />
              <div className="mt-2 h-3 w-32 rounded-full bg-on-surface/10" />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
              <div className="h-4 w-40 rounded-full bg-on-surface/10" />
              <div className="mt-4 h-7 w-2/3 rounded bg-on-surface/10" />
              <div className="mt-3 h-4 w-full rounded-full bg-on-surface/10" />
              <div className="mt-2 h-4 w-5/6 rounded-full bg-on-surface/10" />
            </div>
          ))}
        </div>
        <aside className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
              <div className="h-4 w-32 rounded-full bg-on-surface/10" />
              <div className="mt-4 space-y-2">
                <div className="h-12 rounded-lg bg-surface-container" />
                <div className="h-12 rounded-lg bg-surface-container" />
                <div className="h-12 rounded-lg bg-surface-container" />
              </div>
            </div>
          ))}
        </aside>
      </section>
    </main>
  );
}

function AgentFallback() {
  return (
    <main className="mx-auto w-full max-w-(--container-content) px-5 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12">
      <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1 className="font-display text-headline-md font-bold text-on-surface">
              Agent cockpit did not load.
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Open Applications while the agent state recovers.
            </p>
            <Link
              to="/apply"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
            >
              Applications <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "ready" | "aid" | "applied";
}) {
  const toneClass =
    tone === "ready"
      ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
      : tone === "aid"
        ? "bg-secondary-fixed text-on-secondary-fixed-variant"
        : tone === "applied"
          ? "bg-primary-fixed text-on-primary-fixed-variant"
          : "bg-surface-container text-on-surface";
  return (
    <div className={`rounded-xl p-4 ${toneClass}`}>
      <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-display text-headline-lg font-bold">{value}</p>
      <p className="text-body-sm opacity-80">{detail}</p>
    </div>
  );
}

function NextActionPanel({
  actions,
  run,
  roadmapReady,
  roadmapSummary,
}: {
  actions: RoadmapAction[];
  run?: { status?: string; progress?: { message?: string; percent?: number }; error?: string } | null;
  roadmapReady?: boolean;
  roadmapSummary?: string;
}) {
  const first = actions[0];
  const terminalStatuses = ["succeeded", "completed", "failed", "cancelled"];
  const hasRoadmapOutput = !!roadmapReady || !!roadmapSummary || actions.length > 0;
  const running =
    run && !terminalStatuses.includes(run.status ?? "");
  const fallbackTitle = hasRoadmapOutput
    ? "Roadmap generated. Review the highest-signal actions below."
    : "Run the deep roadmap to generate your next action.";
  const fallbackSummary = hasRoadmapOutput
    ? "The agent has generated usable roadmap artifacts. Check readiness, recommendations, affordability signals, evidence, and extension sync below."
    : "The agent will synthesize saved targets, matching results, scholarships, requirements, and extension readiness into one actionable plan.";
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.12em] text-primary">
            Next best action
          </p>
          <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
            {first?.label ?? fallbackTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            {roadmapSummary ?? fallbackSummary}
          </p>
          {running && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {run.progress?.message ?? run.status ?? "Agent running"}
              {typeof run.progress?.percent === "number" ? ` - ${run.progress.percent}%` : ""}
            </p>
          )}
          {hasRoadmapOutput && !run?.error && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-tertiary-fixed-variant">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Latest roadmap ready
            </p>
          )}
          {run?.error && (
            <p className="mt-3 rounded-xl border border-error/20 bg-error-container/50 px-3 py-2 text-body-sm text-on-error-container">
              {run.error}
            </p>
          )}
        </div>
        <ActionDestination action={first} />
      </div>
    </section>
  );
}

function ActionDestination({ action }: { action?: RoadmapAction }) {
  const to = routeForAction(action);
  return (
    <Link
      to={to.to as never}
      params={to.params as never}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5"
    >
      {to.label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function TargetReadinessPanel({
  targets,
  submissions,
}: {
  targets: PortfolioTarget[];
  submissions: ApplicationSubmission[];
}) {
  if (!targets.length) {
    return (
      <EmptyPanel
        icon={GraduationCap}
        title="No saved targets yet"
        body="Save universities first. The agent will then classify readiness, missing items, scholarships, and extension eligibility."
        to="/universities"
        cta="Browse universities"
      />
    );
  }

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={ShieldCheck}
        title="Target readiness"
        body="Same readiness contract used by the extension package gate."
      />
      <div className="mt-4 divide-y divide-on-surface/8">
        {targets.map((target) => {
          const key = targetKey(target);
          const submission = submissions.find((item) => item.targetId === key);
          return (
            <article key={key} className="grid grid-cols-1 gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_170px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ReadinessBadge ready={!!target.ready} blocking={target.blocking ?? 0} />
                  {submission?.status && <StatusChip label={humanize(submission.status)} />}
                  {target.coverage && <StatusChip label={humanize(target.coverage)} quiet />}
                </div>
                <h3 className="mt-2 truncate font-display text-headline-sm font-bold text-on-surface">
                  {target.name ?? target.externalId ?? "University target"}
                </h3>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {target.ready
                    ? "Ready package can be requested by the browser extension. Human still reviews and submits."
                    : `${target.requiredSatisfied ?? 0} of ${target.requiredTotal ?? 0} required items satisfied. ${target.blocking ?? 0} blocker${(target.blocking ?? 0) === 1 ? "" : "s"} remain.`}
                </p>
                {!!target.nextActions?.length && (
                  <ul className="mt-2 space-y-1">
                    {target.nextActions.slice(0, 2).map((action) => (
                      <li key={action.id ?? action.label} className="flex items-start gap-2 text-body-sm text-on-surface/80">
                        <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{action.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center lg:justify-end">
                {target.system && target.externalId ? (
                  <Link
                    to="/application/$system/$externalId"
                    params={{ system: target.system, externalId: target.externalId }}
                    className="inline-flex items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-bold text-on-surface transition-colors hover:bg-on-surface/5"
                  >
                    Target detail <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    to="/apply"
                    className="inline-flex items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-bold text-on-surface transition-colors hover:bg-on-surface/5"
                  >
                    Guided prep <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationPanel({ targets }: { targets: PortfolioTarget[] }) {
  if (!targets.length) {
    return (
      <EmptyPanel
        icon={Sparkles}
        title="Recommendations need a roadmap run"
        body="Unsaved universities and aid-aware alternatives appear here after the deep agent checks your profile and matching pool."
        to="/universities"
        cta="Open search"
      />
    );
  }
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={Sparkles}
        title="Unsaved recommendations"
        body="Agent can suggest universities beyond your saved list using matching, RAG, and aid signals."
      />
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {targets.map((target) => (
          <article key={targetKey(target)} className="min-w-0 rounded-xl border border-on-surface/8 bg-surface-container p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-headline-sm font-bold text-on-surface">
                  {target.name ?? "Recommended university"}
                </h3>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  {[target.city, target.state, target.country].filter(Boolean).join(", ") || "Location pending"}
                </p>
              </div>
              {typeof target.aidScore === "number" && (
                <span className="rounded-full bg-secondary-fixed px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-secondary-fixed-variant">
                  Aid {Math.round(target.aidScore * 100)}
                </span>
              )}
            </div>
            <ReasonList reasons={target.matchReasons ?? target.aidReasons ?? target.fieldOverlap} />
            <div className="mt-4 flex flex-wrap gap-2">
              {target.system && target.externalId && (
                <Link
                  to="/application/$system/$externalId"
                  params={{ system: target.system, externalId: target.externalId }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-on-surface/20 px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:bg-on-surface/5"
                >
                  Inspect <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {target.website && (
                <a
                  href={target.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-on-surface/20 px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:bg-on-surface/5"
                >
                  Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <Link
        to="/universities"
        search={{ q: "" }}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-bold text-on-surface transition-colors hover:bg-on-surface/5"
      >
        Open search <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function ScholarshipPanel({
  priority,
  programs,
}: {
  priority?: string;
  programs: ScholarshipProgram[];
}) {
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={Trophy}
        title="Scholarship path"
        body={priority || "Affordability-first route from your profile and scholarship catalog."}
      />
      {programs.length ? (
        <div className="mt-4 space-y-2">
          {programs.map((program, index) => (
            <article
              key={`${program.name ?? "program"}-${index}`}
              className="rounded-xl border border-on-surface/8 bg-surface-container p-3"
            >
              <h3 className="font-[var(--font-label)] text-label-md font-bold text-on-surface">
                {program.name ?? "Scholarship program"}
              </h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {[program.provider, program.amount, program.deadline].filter(Boolean).join(" - ") ||
                  program.eligibility ||
                  "Eligibility details pending."}
              </p>
              {program.url && (
                <a
                  href={program.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
                >
                  Open source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-on-surface/20 bg-surface-container/50 p-4 text-body-sm text-on-surface-variant">
          Run roadmap after completing profile affordability details. Scholarship-backed
          programs show here with deadlines and eligibility.
        </p>
      )}
    </section>
  );
}

function ExtensionSyncPanel({
  latestEvent,
  eventCount,
}: {
  latestEvent?: AgentEvent;
  eventCount: number;
}) {
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={BadgeCheck}
        title="Extension sync"
        body="Chrome and Firefox use target-specific ready packages only."
      />
      <div className="mt-4 rounded-xl border border-on-surface/8 bg-surface-container p-3">
        <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface/70">
          Latest event
        </p>
        <p className="mt-1 font-display text-headline-sm font-bold text-on-surface">
          {latestEvent ? humanize(latestEvent.type ?? "extension event") : "No extension events yet"}
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {latestEvent
            ? `${latestEvent.source} - ${formatTime(latestEvent.createdAt)}`
            : "When the browser extension requests a package, fills a page, rejects a not-ready target, or marks review-ready, it appears here."}
        </p>
      </div>
      <p className="mt-3 text-label-sm text-on-surface-variant">
        {eventCount} extension event{eventCount === 1 ? "" : "s"} recorded. Not-ready
        applications redirect back to web remediation.
      </p>
    </section>
  );
}

function DecisionTracePanel({
  latestBrain,
  roadmapGeneratedAt,
  savedCount,
  readyCount,
  recommendationCount,
  scholarshipCount,
  extensionEventCount,
  submissionCount,
  evidenceCount,
}: {
  latestBrain?: PortfolioBrain | null;
  roadmapGeneratedAt?: number;
  savedCount: number;
  readyCount: number;
  recommendationCount: number;
  scholarshipCount: number;
  extensionEventCount: number;
  submissionCount: number;
  evidenceCount: number;
}) {
  const profile = latestBrain?.profileSnapshot;
  const profileComplete = !!profile?.completed;
  const profileFacts = [
    profile?.homeCountry,
    profile?.financialNeed ? `Need: ${profile.financialNeed}` : null,
    profile?.lifeStage,
  ]
    .filter(Boolean)
    .join(" - ");
  const freshness = roadmapGeneratedAt ?? latestBrain?.updatedAt;
  const profileDetail =
    profileFacts ||
    (profileComplete
      ? "Profile completeness is confirmed from onboarding and application answers."
      : "The agent will not guess background, affordability, country, or goals.");
  const scholarshipDetail = scholarshipCount
    ? "Aid-aware options are available for the current plan."
    : profileComplete
      ? "No named scholarship programs returned yet; school ranking still uses net cost, Pell, and debt signals."
      : "Add affordability details so scholarship-first programs can be ranked.";
  const rows = [
    {
      label: "Profile snapshot",
      healthy: profileComplete,
      value: profileComplete ? "Complete" : "Needs answers",
      detail: profileDetail,
      to: "/profile",
      cta: "Open profile",
    },
    {
      label: "Saved targets",
      healthy: savedCount > 0,
      value: `${savedCount} saved`,
      detail: `${readyCount} ready for extension packages; ${Math.max(savedCount - readyCount, 0)} need remediation.`,
      to: "/universities",
      cta: "Browse universities",
    },
    {
      label: "Unsaved match pool",
      healthy: recommendationCount > 0,
      value: `${recommendationCount} candidates`,
      detail: recommendationCount
        ? "Recommendations can include schools outside the saved list."
        : "Run roadmap after profile and targets are present to score new options.",
      to: "/universities",
      cta: "Open search",
    },
    {
      label: "Scholarship routes",
      healthy: scholarshipCount > 0,
      value: `${scholarshipCount} programs`,
      detail: scholarshipDetail,
      to: "/profile",
      cta: "Add finances",
    },
    {
      label: "Browser and applied state",
      healthy: extensionEventCount > 0 || submissionCount > 0,
      value: `${extensionEventCount} events`,
      detail: `${submissionCount} tracked applications; extension actions still require human review.`,
      to: "/apply",
      cta: "Open applications",
    },
    {
      label: "Evidence index",
      healthy: evidenceCount > 0,
      value: `${evidenceCount} sources`,
      detail: evidenceCount
        ? "Tips and roadmap actions can cite requirements, matches, documents, or scholarship facts."
        : "Run the deep roadmap to attach evidence to tips and actions.",
      to: "/apply",
      cta: "Open applications",
    },
  ] as const;

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={CalendarClock}
        title="Decision trace"
        body="What the agent can currently prove from your workspace."
      />
      <div className="mt-4 rounded-xl border border-on-surface/8 bg-surface-container p-3">
        <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface/70">
          Last synthesis
        </p>
        <p className="mt-1 font-display text-headline-sm font-bold text-on-surface">
          {freshness ? formatTime(freshness) : "Not generated yet"}
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {latestBrain?.staleFlags?.length
            ? `${latestBrain.staleFlags.length} stale signal${latestBrain.staleFlags.length === 1 ? "" : "s"} need review before trusting the roadmap.`
            : "Freshness, source coverage, and gaps stay visible before the agent recommends action."}
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-on-surface/8 bg-surface-container p-3">
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {row.healthy ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <p className="font-[var(--font-label)] text-label-sm font-bold text-on-surface">
                    {row.label}
                  </p>
                </div>
                <p className="mt-1 text-body-sm font-semibold text-on-surface">{row.value}</p>
                <p className="mt-0.5 text-label-sm text-on-surface-variant">{row.detail}</p>
              </div>
              <Link
                to={row.to as never}
                className="inline-flex w-fit rounded-md border border-on-surface/20 px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:bg-on-surface/5"
              >
                {row.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuardrailsPanel() {
  const rails = [
    ["Confirm-first actions", "Chat can propose fills, uploads, navigation, or apply runs. User confirmation executes them."],
    ["Ready-only packages", "Extension bundles are served only for targets that pass backend readiness checks."],
    ["Prompt-injection wall", "Hidden prompts, raw context, tokens, admin routes, and unverified payment links are refused before tools run."],
  ] as const;

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader
        icon={ShieldCheck}
        title="Agent guardrails"
        body="Full access to your workflow, fenced by backend policy and confirmation gates."
      />
      <div className="mt-4 space-y-2">
        {rails.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-on-surface/8 bg-surface-container p-3">
            <p className="font-[var(--font-label)] text-label-md font-bold text-on-surface">{title}</p>
            <p className="mt-1 text-label-sm text-on-surface-variant">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Boilerplate that repeats verbatim across every blocker tip; hoisted to one caption. */
const BLOCKER_CAPTION =
  "Finish the blocking requirements before the browser extension — the package gate rejects incomplete applications.";

function TipsPanel({
  tips,
  evidence,
  targets,
}: {
  tips: RoadmapTip[];
  evidence: EvidenceEntry[];
  targets: PortfolioTarget[];
}) {
  const shown = tips.slice(0, 4);
  const targetById = useMemo(() => {
    const map = new Map<string, PortfolioTarget>();
    for (const t of targets) map.set(targetKey(t), t);
    return map;
  }, [targets]);

  // A tip is a "blocker tip" when it resolves to a saved target that is not ready.
  const resolve = (tip: RoadmapTip) => (tip.targetId ? targetById.get(tip.targetId) : undefined);
  const hasBlockerTip = shown.some((tip) => {
    const t = resolve(tip);
    return t && !t.ready && (t.blocking ?? 0) > 0;
  });

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader icon={FileText} title="Grounded tips" body="No generic advice passes the backend validator." />
      {hasBlockerTip && (
        <p className="mt-3 rounded-lg border border-on-surface/15 bg-surface-container px-3 py-2 text-label-sm text-on-surface-variant">
          {BLOCKER_CAPTION}
        </p>
      )}
      {shown.length ? (
        <div className="mt-4 space-y-3">
          {shown.map((tip) => {
            const target = resolve(tip);
            const isBlocker = !!target && !target.ready && (target.blocking ?? 0) > 0;
            if (isBlocker && target) {
              return (
                <BlockerTipCard
                  key={tip.id ?? tip.title ?? target.externalId}
                  tip={tip}
                  target={target}
                  evidence={evidence}
                />
              );
            }
            return (
              <article
                key={tip.id ?? tip.title}
                className="rounded-xl border border-on-surface/8 bg-surface-container p-3"
              >
                <div className="flex items-start gap-2">
                  <PriorityDot priority={tip.priority} />
                  <div className="min-w-0">
                    <h3 className="font-[var(--font-label)] text-label-md font-bold text-on-surface">
                      {tip.title}
                    </h3>
                    {tip.body && (
                      <p className="mt-1 break-words [overflow-wrap:anywhere] text-body-sm text-on-surface-variant">
                        {tip.body}
                      </p>
                    )}
                    <SourceChips ids={tip.evidenceIds ?? []} evidence={evidence} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Run roadmap to generate non-generic, evidence-linked tips.
        </p>
      )}
    </section>
  );
}

/**
 * Scannable blocker tip: leads with the specific signal (school — % done, N
 * blockers) as a bold line + thin meter, source chips, and one short action.
 * The shared "why" lives once in the panel caption, not repeated here.
 */
function BlockerTipCard({
  tip,
  target,
  evidence,
}: {
  tip: RoadmapTip;
  target: PortfolioTarget;
  evidence: EvidenceEntry[];
}) {
  const total = target.requiredTotal ?? 0;
  const done = target.requiredSatisfied ?? 0;
  const blocking = target.blocking ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const name = target.name ?? target.externalId ?? "University target";
  const action =
    target.nextActions?.[0]?.label ??
    (total > 0 ? `Complete ${total - done} required item${total - done === 1 ? "" : "s"}.` : "Complete required items.");

  return (
    <article className="rounded-xl border border-on-surface/8 bg-surface-container p-3">
      <div className="flex items-start gap-2">
        <PriorityDot priority={tip.priority} />
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 truncate font-[var(--font-label)] text-label-md font-bold text-on-surface">
            {name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
              {percent}% done · {done}/{total} required
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-on-primary-fixed-variant">
              <AlertTriangle className="h-3 w-3" /> {blocking} blocker{blocking === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 break-words [overflow-wrap:anywhere] text-body-sm text-on-surface-variant">
            {action}
          </p>
          <SourceChips ids={tip.evidenceIds ?? []} evidence={evidence} />
        </div>
      </div>
    </article>
  );
}

function EventLog({ events }: { events: AgentEvent[] }) {
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader icon={ScrollText} title="Run log" body="What the agent, web, worker, and extension checked." />
      {events.length ? (
        <ol className="mt-4 space-y-3">
          {events.slice(0, 8).map((event) => (
            <li key={event._id ?? `${event.type}-${event.createdAt}`} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="truncate font-[var(--font-label)] text-label-sm font-bold text-on-surface">
                  {humanize(event.type ?? "event")}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  {event.source ?? "system"} - {formatTime(event.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Agent events appear here as soon as a run starts.
        </p>
      )}
    </section>
  );
}

function AppliedTracker({ submissions }: { submissions: ApplicationSubmission[] }) {
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-5">
      <PanelHeader icon={CheckCircle2} title="Applied tracker" body="Fill success is not submission. Human confirmation wins." />
      {submissions.length ? (
        <div className="mt-4 space-y-2">
          {submissions.slice(0, 6).map((submission) => (
            <article
              key={submission._id ?? submission.targetId}
              className="rounded-xl border border-on-surface/8 bg-surface-container p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-[var(--font-label)] text-label-md font-bold text-on-surface">
                    {submission.targetId ?? `${submission.system}:${submission.externalId}`}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {humanize(submission.status ?? "planned")} - {submission.source ?? "web"}
                  </p>
                </div>
                <StatusChip label={humanize(submission.status ?? "planned")} />
              </div>
              {submission.confirmationNumber && (
                <p className="mt-2 text-label-sm text-on-surface-variant">
                  Confirmation: {submission.confirmationNumber}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Submitted and confirmed-applied applications appear here after web,
          extension, or manual status updates.
        </p>
      )}
    </section>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  body,
  to,
  cta,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
        <div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface">{title}</h2>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{body}</p>
          <Link
            to={to as never}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5"
          >
            {cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <header className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-fixed text-on-primary-fixed-variant">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-headline-sm font-bold text-on-surface">{title}</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">{body}</p>
      </div>
    </header>
  );
}

function ReadinessBadge({ ready, blocking }: { ready: boolean; blocking: number }) {
  return ready ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-tertiary-fixed-variant">
      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-primary-fixed-variant">
      <AlertTriangle className="h-3.5 w-3.5" /> {blocking} blocker{blocking === 1 ? "" : "s"}
    </span>
  );
}

function StatusChip({ label, quiet = false }: { label: string; quiet?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold ${
        quiet
          ? "bg-surface-container text-on-surface-variant"
          : "bg-secondary-fixed text-on-secondary-fixed-variant"
      }`}
    >
      {label}
    </span>
  );
}

function PriorityDot({ priority }: { priority?: string }) {
  const cls =
    priority === "critical" || priority === "high"
      ? "bg-primary"
      : priority === "medium"
        ? "bg-secondary"
        : "bg-tertiary";
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

/** Parse a URL down to a bare hostname (no "www."), for compact source chips. */
function hostnameOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Renders evidence as compact "Source" chips. Chips that resolve to a URL become
 * hostname-only external links (full URL in href + title); non-URL evidence shows
 * as a short quiet label. Never renders a raw long URL inline. Shows up to 3, then
 * a "+N more" chip.
 */
function SourceChips({ ids, evidence }: { ids: string[]; evidence: EvidenceEntry[] }) {
  if (!ids.length) return null;
  const entries = ids
    .map((id) => evidence.find((entry) => entry.id === id) ?? ({ id } as EvidenceEntry))
    .filter(Boolean);
  if (!entries.length) return null;

  const chips = entries.slice(0, 3);
  const extra = entries.length - chips.length;

  return (
    <div className="mt-2 flex max-w-full flex-wrap items-center gap-1.5">
      <span className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface/50">
        Source
      </span>
      {chips.map((entry, index) => {
        const url = entry.sourceUrl || entry.evidenceUrl;
        const host = url ? hostnameOf(url) : null;
        const label = host || entry.name || entry.basis || entry.kind || entry.id || "source";
        const key = entry.id ?? `${label}-${index}`;
        if (url && host) {
          return (
            <a
              key={key}
              href={url}
              title={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-on-surface/20 bg-surface px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
            >
              <span className="truncate">{host}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          );
        }
        return (
          <span
            key={key}
            title={label}
            className="inline-flex max-w-full truncate rounded-full border border-on-surface/15 bg-surface-container px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant"
          >
            {label}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="inline-flex rounded-full border border-on-surface/15 bg-surface-container px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
          +{extra} more
        </span>
      )}
    </div>
  );
}

function ReasonList({ reasons }: { reasons?: unknown[] }) {
  const list = (reasons ?? []).map(String).filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return (
    <ul className="mt-3 space-y-1">
      {list.map((reason) => (
        <li key={reason} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}

function routeForAction(action?: RoadmapAction): { to: string; params?: Record<string, string>; label: string } {
  if (!action) return { to: "/apply", label: "Open applications" };
  if (action.kind === "essay") return { to: "/apply", label: "Open applications" };
  if (action.kind === "document") return { to: "/apply", label: "Open applications" };
  if (action.kind === "extension") return { to: "/apply", label: "Open applications" };
  return { to: "/apply", label: "Do next" };
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatTime(ms?: number) {
  if (!ms) return "time pending";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "time pending";
  }
}
