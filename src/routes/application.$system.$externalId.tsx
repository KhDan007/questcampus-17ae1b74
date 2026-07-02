import { createFileRoute, Link, Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  ScrollText,
  Sparkles,
  Send,
  ShieldCheck,
  ExternalLink,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  useIntakePlan,
  useEligibility,
  useChecklist,
  type BackendTarget,
  type IntakeItem,
  type EligibilityPerTarget,
} from "@/lib/apply/intake";
import { useApplyActions } from "@/lib/applyQueue/client";

function ApplicationRouteError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { system, externalId } = Route.useParams();
  return (
    <DashboardShell>
      <LivingBackground />
      <ApplicationFallback
        target={{ system, externalId, name: "This university" }}
        onRetry={() => {
          void router.invalidate();
          reset();
        }}
      />
    </DashboardShell>
  );
}

function ApplicationFallback({
  target,
  onRetry,
}: {
  target: BackendTarget;
  onRetry?: () => void;
}) {
  return (
    <main
      id="main-content"
      className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12"
    >
      <BackLink />
      <section className="mt-4 rounded-2xl border-2 border-on-surface bg-surface-container-lowest p-6 qc-hard-shadow sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary-fixed text-primary">
            <GraduationCap className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Application workspace
            </p>
            <h1 className="mt-1 font-display text-display-sm font-bold text-on-surface sm:text-display-md">
              {target.name}
            </h1>
            <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
              We couldn&apos;t load the live application details yet. You can still come back to your dashboard while research continues in the background.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  Try again
                </button>
              )}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/application/$system/$externalId")({
  head: () => ({ meta: [{ title: "Application — QuestCampus" }] }),
  component: ApplicationDetailPage,
  errorComponent: ApplicationRouteError,
});

function ApplicationDetailPage() {
  const { isAuthenticated } = useAuth();
  const { system, externalId } = Route.useParams();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/signin"
        search={{ redirect: `/application/${system}/${externalId}` } as never}
      />
    );
  }

  const fallbackTarget = { system, externalId, name: "This university" } satisfies BackendTarget;

  return (
    <DashboardShell>
      <LivingBackground />
      <SilentErrorBoundary fallback={<ApplicationFallback target={fallbackTarget} />}>
        <ApplicationDetailContent system={system} externalId={externalId} />
      </SilentErrorBoundary>
    </DashboardShell>
  );
}

function ApplicationDetailContent({ system, externalId }: { system: string; externalId: string }) {
  const { saved } = useSavedUniversities();

  const uni = (saved ?? []).find((s) => s.source === system && s.externalId === externalId);
  const target: BackendTarget = useMemo(
    () => ({ system, externalId, name: uni?.name ?? "This university" }),
    [system, externalId, uni?.name],
  );
  const targets = useMemo(() => [target], [target]);

  const plan = useIntakePlan(targets);
  const targetInfo = plan?.targets.find(
    (t) => t.system === system && t.externalId === externalId,
  );
  const found = targetInfo?.found ?? false;
  const researchedTargets = useMemo(() => (found ? targets : []), [found, targets]);
  const elig = useEligibility(researchedTargets);
  const checklist = useChecklist(researchedTargets);
  const specific = (plan?.specific ?? []).find(
    (s) => s.system === system && s.externalId === externalId,
  );
  const eligPer = elig?.perTarget.find(
    (p) => p.system === system && p.externalId === externalId,
  );
  const checklistPer = checklist?.perTarget.find(
    (c) => c.system === system && c.externalId === externalId,
  );
  const ready = !!checklistPer?.checklist.ready && eligPer?.verdict !== "ineligible";

  const specItems = specific?.items ?? [];
  const documents = specItems.filter((i) => i.kind === "document");
  const essays = specItems.filter((i) => i.kind === "essay");
  const videos = specItems.filter((i) => i.kind === "video");
  const fields = specItems.filter((i) => i.kind === "field");

  return (
    <main
      id="main-content"
      className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12"
    >
        <BackLink />

        {/* Hero */}
        <header className="mt-4 rounded-2xl border-2 border-on-surface bg-surface-container-lowest p-6 qc-hard-shadow sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary-fixed text-primary">
                <GraduationCap className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                  Application workspace
                </p>
                <h1 className="mt-1 font-display text-display-sm font-bold text-on-surface sm:text-display-md">
                  {uni?.name ?? "Loading…"}
                </h1>
                {(uni?.city || uni?.country) && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-body-md text-on-surface-variant">
                    <MapPin className="h-4 w-4" />
                    {[uni?.city, uni?.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill found={found} ready={ready} />
              <SilentErrorBoundary>
                <ApplyCTA target={target} ready={ready} />
              </SilentErrorBoundary>
            </div>
          </div>

          {/* Sub-nav anchors */}
          <nav className="mt-6 flex flex-wrap gap-2">
            <Anchor href="#general">General</Anchor>
            <Anchor href="#deadlines">Deadlines</Anchor>
            <Anchor href="#eligibility">Eligibility</Anchor>
            <Anchor href="#documents">Documents</Anchor>
            <Anchor href="#essays">Essays</Anchor>
            <Anchor href="#scholarships">Scholarships</Anchor>
          </nav>
        </header>

        {/* Grid */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Left / main column */}
          <div className="space-y-5 lg:col-span-2">
            <GeneralInfoCard uni={uni} />
            <DeadlinesCard />
            <EligibilityCardSection eligibility={eligPer} found={found} />
            <RequirementsList
              id="documents"
              icon={<FileText className="h-4 w-4" />}
              title="Documents required"
              subtitle={
                found
                  ? "Pulled from the school's official application."
                  : "Researching this school right now — the exact document list will appear here."
              }
              items={documents}
              emptyLabel="No document uploads required."
              found={found}
            />
            <RequirementsList
              id="essays"
              icon={<ScrollText className="h-4 w-4" />}
              title="Essays & short answers"
              subtitle="Written prompts we'll help you draft."
              items={essays}
              emptyLabel="No essays required."
              found={found}
            />
            {videos.length > 0 && (
              <RequirementsList
                id="videos"
                icon={<Sparkles className="h-4 w-4" />}
                title="Video responses"
                subtitle="Recorded video prompts."
                items={videos}
                emptyLabel="No videos required."
                found={found}
              />
            )}
            {fields.length > 0 && (
              <RequirementsList
                id="fields"
                icon={<Info className="h-4 w-4" />}
                title="School-specific questions"
                subtitle="Extra fields this university asks."
                items={fields}
                emptyLabel="No extra questions."
                found={found}
              />
            )}
            <ScholarshipsCard />
          </div>

          {/* Right rail */}
          <aside className="space-y-5">
            <ReadinessCard ready={ready} found={found} checklistPer={checklistPer} />
            <QuickLinks uni={uni} />
            <MockNoticeCard />
          </aside>
        </div>
    </main>
  );
}

/* ---------------- Sub-components ---------------- */

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
        else void navigate({ to: "/dashboard" });
      }}
      className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-amber-700">
      Mock
    </span>
  );
}

function StatusPill({ found, ready }: { found: boolean; ready: boolean }) {
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface bg-tertiary-fixed px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-tertiary">
        <CheckCircle2 className="h-3.5 w-3.5" /> Ready to apply
      </span>
    );
  }
  if (found) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface bg-secondary-container px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
        <Sparkles className="h-3.5 w-3.5" /> Research complete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface bg-primary-fixed px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-primary">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Researching
    </span>
  );
}

function ApplyCTA({ target, ready }: { target: BackendTarget; ready: boolean }) {
  const { startApply } = useApplyActions();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function launch() {
    if (busy) return;
    setBusy(true);
    try {
      const id = await startApply({
        system: target.system,
        externalId: target.externalId,
        targetName: target.name,
      });
      void navigate({ to: "/apply/$jobId", params: { jobId: id } });
    } catch {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={launch}
      disabled={!ready || busy}
      className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Start auto-apply
    </button>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full border-2 border-on-surface/20 bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface/80 hover:border-on-surface hover:text-on-surface"
    >
      {children}
    </a>
  );
}

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  right,
  children,
}: {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm sm:p-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {icon && (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary-fixed text-primary">
              {icon}
            </span>
          )}
          <div>
            <h2 className="font-display text-headline-sm font-bold text-on-surface">{title}</h2>
            {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function GeneralInfoCard({ uni }: { uni?: { city?: string; country?: string; name?: string } }) {
  // MOCK: general facts. Real values will come from backend enrichment.
  return (
    <SectionCard
      id="general"
      icon={<Info className="h-4 w-4" />}
      title="General info"
      subtitle="Overview and facts about this university."
      right={<MockBadge />}
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label="Type" value="Private research university" />
        <Fact label="Founded" value="1885" />
        <Fact label="Undergraduate enrollment" value="~7,600" />
        <Fact label="Acceptance rate" value="~4%" />
        <Fact label="Tuition (est.)" value="$62,000 / yr" />
        <Fact label="Setting" value={uni?.city ? `${uni.city} — suburban` : "Suburban campus"} />
      </dl>
      <p className="mt-4 text-body-sm text-on-surface-variant">
        Replace this section with backend-provided university facts once the enrichment pipeline exposes them.
      </p>
    </SectionCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3">
      <dt className="font-[var(--font-label)] text-label-sm uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-label-md font-bold text-on-surface">{value}</dd>
    </div>
  );
}

function DeadlinesCard() {
  // MOCK
  const rows = [
    { label: "Early Action", date: "Nov 1, 2026", note: "Non-binding" },
    { label: "Regular Decision", date: "Jan 5, 2027", note: "Final application deadline" },
    { label: "Financial aid (CSS Profile)", date: "Feb 15, 2027", note: "Priority" },
    { label: "Decision released", date: "Late March 2027", note: "" },
  ];
  return (
    <SectionCard
      id="deadlines"
      icon={<CalendarClock className="h-4 w-4" />}
      title="Deadlines"
      subtitle="Key dates for this application cycle."
      right={<MockBadge />}
    >
      <ul className="divide-y divide-on-surface/10">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="font-display text-label-md font-bold text-on-surface">{r.label}</p>
              {r.note && <p className="text-label-sm text-on-surface-variant">{r.note}</p>}
            </div>
            <p className="shrink-0 font-[var(--font-label)] text-label-md font-semibold text-on-surface">
              {r.date}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function EligibilityCardSection({
  eligibility,
  found,
}: {
  eligibility?: EligibilityPerTarget;
  found: boolean;
}) {
  const verdict = eligibility?.verdict ?? "unknown";
  const tone =
    verdict === "eligible"
      ? "text-tertiary"
      : verdict === "ineligible"
        ? "text-error"
        : "text-on-surface-variant";
  const label =
    verdict === "eligible"
      ? "You appear eligible"
      : verdict === "ineligible"
        ? "You may not meet the requirements"
        : found
          ? "We need a bit more info to confirm"
          : "Waiting on research to complete";

  return (
    <SectionCard
      id="eligibility"
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Eligibility"
      subtitle="Based on your profile answers and the school's stated criteria."
    >
      <p className={`font-display text-label-lg font-bold ${tone}`}>{label}</p>

      {eligibility?.blockers && eligibility.blockers.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-error">
            Blockers
          </p>
          {eligibility.blockers.map((b) => (
            <BlockerRow key={b.criterion} b={b} />
          ))}
        </div>
      )}
      {eligibility?.warnings && eligibility.warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-amber-700">
            Warnings
          </p>
          {eligibility.warnings.map((b) => (
            <BlockerRow key={b.criterion} b={b} />
          ))}
        </div>
      )}
      {eligibility?.unknowns && eligibility.unknowns.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Still need to confirm
          </p>
          {eligibility.unknowns.map((b) => (
            <BlockerRow key={b.criterion} b={b} />
          ))}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
          >
            Answer in the workspace →
          </Link>
        </div>
      )}
    </SectionCard>
  );
}

function BlockerRow({
  b,
}: {
  b: { criterion: string; label: string; evidence?: string; evidenceUrl?: string };
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-on-surface">{b.label}</p>
        {b.evidence && (
          <p className="mt-1 text-label-sm text-on-surface-variant">{b.evidence}</p>
        )}
        {b.evidenceUrl && (
          <a
            href={b.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
          >
            Source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function RequirementsList({
  id,
  icon,
  title,
  subtitle,
  items,
  emptyLabel,
  found,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  items: IntakeItem[];
  emptyLabel: string;
  found: boolean;
}) {
  return (
    <SectionCard id={id} icon={icon} title={title} subtitle={subtitle}>
      {!found ? (
        <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" /> Researching — this list will populate live.
        </div>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-start gap-3 rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3"
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
                  it.answered
                    ? "border-on-surface bg-tertiary text-white"
                    : "border-on-surface/40 bg-surface text-on-surface/40"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-label-md font-bold text-on-surface">
                  {it.label}
                  {it.required && (
                    <span className="ml-1.5 font-[var(--font-label)] text-label-sm font-semibold text-error">
                      required
                    </span>
                  )}
                  {it.wordLimit && (
                    <span className="ml-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                      · {it.wordLimit} words
                    </span>
                  )}
                </p>
                {it.prompt && (
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">{it.prompt}</p>
                )}
              </div>
              <Link
                to="/dashboard"
                className="shrink-0 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
              >
                {it.answered ? "Edit" : "Fill in"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ScholarshipsCard() {
  // MOCK
  const items = [
    {
      name: "Need-based financial aid",
      award: "Up to full tuition",
      note: "Automatically considered for all admitted students.",
    },
    {
      name: "International Merit Award",
      award: "$5,000 – $20,000 / yr",
      note: "Considered for international applicants with strong academics.",
    },
    {
      name: "STEM Excellence Scholarship",
      award: "$10,000 / yr",
      note: "Requires separate application by Dec 15.",
    },
  ];
  return (
    <SectionCard
      id="scholarships"
      icon={<Trophy className="h-4 w-4" />}
      title="Scholarships & aid"
      subtitle="Financial support programs offered by this school."
      right={<MockBadge />}
    >
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.name}
            className="rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-label-md font-bold text-on-surface">{s.name}</p>
              <p className="font-[var(--font-label)] text-label-sm font-semibold text-tertiary">
                {s.award}
              </p>
            </div>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{s.note}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ReadinessCard({
  ready,
  found,
  checklistPer,
}: {
  ready: boolean;
  found: boolean;
  checklistPer?: { checklist: { ready: boolean; [k: string]: unknown } };
}) {
  const items = Object.entries(checklistPer?.checklist ?? {})
    .filter(([k]) => k !== "ready")
    .slice(0, 6);
  return (
    <aside className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
      <h3 className="font-display text-headline-sm font-bold text-on-surface">Readiness</h3>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">
        {ready
          ? "You're ready to launch auto-apply."
          : found
            ? "Fill remaining items to unlock auto-apply."
            : "Waiting on background research."}
      </p>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map(([k, v]) => (
            <li key={k} className="flex items-center gap-2 text-body-sm">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                  v ? "border-on-surface bg-tertiary text-white" : "border-on-surface/30 bg-surface text-transparent"
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <span className="capitalize text-on-surface/80">{k.replace(/([A-Z])/g, " $1")}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function QuickLinks({ uni }: { uni?: { website?: string; name: string } }) {
  return (
    <aside className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 p-5 qc-hard-shadow-sm">
      <h3 className="font-display text-headline-sm font-bold text-on-surface">Quick links</h3>
      <ul className="mt-3 space-y-2">
        {uni?.website && (
          <li>
            <a
              href={uni.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline"
            >
              Official site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        )}
        <li>
          <Link to="/dashboard" className="text-body-sm text-primary hover:underline">
            Answer requirements →
          </Link>
        </li>
        <li>
          <Link to="/essay" className="text-body-sm text-primary hover:underline">
            Draft essays →
          </Link>
        </li>
        <li>
          <Link to="/apply" className="text-body-sm text-primary hover:underline">
            Manage picks →
          </Link>
        </li>
      </ul>
    </aside>
  );
}

function MockNoticeCard() {
  return (
    <aside className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-body-sm text-on-surface-variant">
      <p className="font-display text-label-md font-bold text-on-surface">Heads up</p>
      <p className="mt-1">
        Sections labelled <MockBadge /> use placeholder values until the backend
        surfaces real data for that school. The live requirement list, eligibility,
        and readiness above are real.
      </p>
    </aside>
  );
}
