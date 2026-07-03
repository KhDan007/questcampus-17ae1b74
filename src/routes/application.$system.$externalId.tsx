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
  useSetAnswer,
  type BackendTarget,
  type IntakeItem,
  type EligibilityPerTarget,
} from "@/lib/apply/intake";
import {
  useUniFacts,
  useUniScholarships,
  useResearchProgress,
  type UniFacts,
  type UniDeadline,
  type Scholarship,
  type ResearchProgress,
} from "@/lib/apply/uniData";
import { useApplyActions } from "@/lib/applyQueue/client";
import { useGuides } from "@/lib/apply/guidance";
import { GuideBlock, findGuide } from "@/components/apply/GuideBlock";
import type { GuideRow } from "@/lib/apply/guidance";
import { ApplicationPlanView } from "@/components/apply/ApplicationPlanView";
import { RequirementEditorDialog } from "@/components/apply/RequirementEditorDialog";

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
  const { isAuthenticated, isHydrated } = useAuth();
  const { system, externalId } = Route.useParams();

  if (isHydrated && !isAuthenticated) {
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
        {isHydrated ? (
          <ApplicationDetailContent system={system} externalId={externalId} />
        ) : (
          <main className="relative mx-auto flex w-full max-w-(--container-content) items-center justify-center px-5 pt-24 sm:px-8 lg:px-12">
            <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
          </main>
        )}
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
  const facts = useUniFacts(system, externalId);
  const scholarships = useUniScholarships(system, externalId);
  const research = useResearchProgress(system, externalId);
  const specific = (plan?.specific ?? []).find(
    (s) => s.system === system && s.externalId === externalId,
  );
  const eligPer = elig?.perTarget.find(
    (p) => p.system === system && p.externalId === externalId,
  );
  const checklistPer = checklist?.perTarget.find(
    (c) => c.system === system && c.externalId === externalId,
  );
  const ready = !!checklistPer?.checklist?.ready && eligPer?.verdict !== "ineligible";

  const specItems = specific?.items ?? [];
  const documents = specItems.filter((i) => i.kind === "document");
  const essays = specItems.filter((i) => i.kind === "essay");
  const videos = specItems.filter((i) => i.kind === "video");
  const fields = specItems.filter((i) => i.kind === "field");
  const guideRows = useGuides(
    specItems.map((i) => ({
      kind: i.kind,
      docType: i.docType ?? null,
      conceptKey: i.conceptKey ?? null,
      label: i.label ?? null,
    })),
  );

  const [tab, setTab] = useState<"requirements" | "plan">("requirements");

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

          {tab === "requirements" && (
            <nav className="mt-6 flex flex-wrap gap-2">
              <Anchor href="#general">General</Anchor>
              <Anchor href="#deadlines">Deadlines</Anchor>
              <Anchor href="#eligibility">Eligibility</Anchor>
              <Anchor href="#documents">Documents</Anchor>
              <Anchor href="#essays">Essays</Anchor>
              <Anchor href="#scholarships">Scholarships</Anchor>
            </nav>
          )}
        </header>

        {/* Tabs */}
        <div className="mt-6 flex gap-2" role="tablist" aria-label="Application view">
          <TabButton active={tab === "requirements"} onClick={() => setTab("requirements")}>
            Requirements
          </TabButton>
          <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
            Plan
          </TabButton>
        </div>

        {tab === "requirements" ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {/* Left / main column */}
            <div className="space-y-5 lg:col-span-2">
              <GeneralInfoCard facts={facts} />
              <DeadlinesCard facts={facts} />
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
                research={research}
                system={system}
                externalId={externalId}
                guideRows={guideRows}
              />
              <RequirementsList
                id="essays"
                icon={<ScrollText className="h-4 w-4" />}
                title="Essays & short answers"
                subtitle="Written prompts we'll help you draft."
                items={essays}
                emptyLabel="No essays required."
                found={found}
                research={research}
                system={system}
                externalId={externalId}
                guideRows={guideRows}
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
                  research={research}
                  system={system}
                  externalId={externalId}
                  guideRows={guideRows}
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
                  research={research}
                  system={system}
                  externalId={externalId}
                  guideRows={guideRows}
                />
              )}
              <ScholarshipsCard scholarships={scholarships} />
            </div>

            {/* Right rail */}
            <aside className="space-y-5">
              <ReadinessCard ready={ready} found={found} checklistPer={checklistPer} />
              <QuickLinks uni={uni} />
            </aside>
          </div>
        ) : (
          <div className="mt-4">
            <ApplicationPlanView system={system} externalId={externalId} />
          </div>
        )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "rounded-md border-2 border-on-surface px-4 py-1.5 font-[var(--font-label)] text-label-md font-bold qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none " +
        (active ? "bg-on-surface text-surface" : "bg-surface text-on-surface")
      }
    >
      {children}
    </button>
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

function formatUsd(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function GeneralInfoCard({ facts }: { facts: UniFacts | null | undefined }) {
  if (facts === undefined) {
    return (
      <SectionCard id="general" icon={<Info className="h-4 w-4" />} title="General info">
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-on-surface/10 bg-surface/70" />
          ))}
        </div>
      </SectionCard>
    );
  }
  if (facts === null) return null;

  const rows: { label: string; value: string }[] = [];
  if (facts.ownership) rows.push({ label: "Type", value: titleCase(facts.ownership) });
  if (facts.studentSize != null)
    rows.push({ label: "Undergraduate enrollment", value: facts.studentSize.toLocaleString("en-US") });
  if (facts.admissionRate != null)
    rows.push({ label: "Acceptance rate", value: `${(facts.admissionRate * 100).toFixed(1)}%` });
  if (facts.satAvg != null) rows.push({ label: "SAT avg", value: String(facts.satAvg) });
  if (facts.actMidpoint != null) rows.push({ label: "ACT mid", value: String(facts.actMidpoint) });

  const cost =
    facts.costAttendance != null
      ? { label: "Cost of attendance", value: formatUsd(facts.costAttendance)! }
      : facts.tuitionOutState != null
        ? { label: "Tuition (out-of-state)", value: formatUsd(facts.tuitionOutState)! }
        : facts.tuitionInState != null
          ? { label: "Tuition (in-state)", value: formatUsd(facts.tuitionInState)! }
          : facts.fees?.amount != null
            ? {
                label: "Tuition & fees",
                value: `${facts.fees.amount.toLocaleString("en-US")}${facts.fees.currency ? ` ${facts.fees.currency}` : ""}`,
              }
            : null;
  if (cost) rows.push(cost);

  const loc = [facts.city, facts.state, facts.country].filter(Boolean).join(", ");
  if (loc) rows.push({ label: "Location", value: loc });
  if (facts.globalRank != null) rows.push({ label: "Global rank", value: `#${facts.globalRank}` });

  if (rows.length === 0) return null;

  return (
    <SectionCard
      id="general"
      icon={<Info className="h-4 w-4" />}
      title="General info"
      subtitle="Overview and facts about this university."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <Fact key={r.label} label={r.label} value={r.value} />
        ))}
      </dl>
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

function DeadlinesCard({ facts }: { facts: UniFacts | null | undefined }) {
  const loading = facts === undefined;
  const raw = facts?.deadlines ?? [];

  // Dedupe by (isoDate || dateText)
  const seen = new Set<string>();
  const deduped: UniDeadline[] = [];
  for (const d of raw) {
    const key = d.isoDate || d.dateText;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(d);
  }
  // Sort: with isoDate ascending first, then the rest
  deduped.sort((a, b) => {
    if (a.isoDate && b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    if (a.isoDate) return -1;
    if (b.isoDate) return 1;
    return 0;
  });
  const rows = deduped.slice(0, 8);

  return (
    <SectionCard
      id="deadlines"
      icon={<CalendarClock className="h-4 w-4" />}
      title="Deadlines"
      subtitle="Key dates for this application cycle."
    >
      {loading ? (
        <div className="h-24 animate-pulse rounded-lg border border-on-surface/10 bg-surface/70" />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
          We don&apos;t have structured deadlines for this school yet.
          {facts?.website && (
            <>
              {" "}
              <a
                href={facts.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
              >
                Check the official deadlines page <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-on-surface/10">
          {rows.map((d, i) => {
            const primary =
              d.dateText ||
              (d.isoDate
                ? new Date(d.isoDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "");
            return (
              <li key={`${d.isoDate || d.dateText}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-label-md font-bold text-on-surface">{primary}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {d.intake && (
                      <span className="text-label-sm text-on-surface-variant">{d.intake}</span>
                    )}
                    {d.category === "admission" && (
                      <span className="rounded-full border border-on-surface/20 bg-primary-fixed px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-primary">
                        admission
                      </span>
                    )}
                    {d.sourceUrl && (
                      <a
                        href={d.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
  research,
  system,
  externalId,
  guideRows,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  items: IntakeItem[];
  emptyLabel: string;
  found: boolean;
  research?: ResearchProgress | null;
  system: string;
  externalId: string;
  guideRows: GuideRow[] | undefined;
}) {
  return (
    <SectionCard
      id={id}
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={
        found && research?.status === "ready" && research.coverage ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-on-surface/20 bg-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wider text-on-surface/70">
            {research.coverage} coverage
          </span>
        ) : undefined
      }
    >
      {!found ? (
        <ResearchProgressBlock research={research} />
      ) : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const guide = findGuide(guideRows, {
              kind: it.kind,
              docType: it.docType ?? null,
              conceptKey: it.conceptKey ?? null,
              label: it.label ?? null,
            });
            return (
              <li
                key={it.key}
                className="rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3"
              >
                <div className="flex items-start gap-3">
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
                </div>
                <div className="pl-9">
                  <GuideBlock
                    guide={guide}
                    explainArgs={{
                      system,
                      externalId,
                      kind: it.kind,
                      docType: it.docType ?? null,
                      conceptKey: it.conceptKey ?? null,
                      label: it.label ?? null,
                      prompt: it.prompt ?? null,
                    }}
                    compact
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function ResearchProgressBlock({ research }: { research?: ResearchProgress | null }) {
  const p = research?.progress ?? null;
  const percent =
    p?.percent != null ? Math.max(0, Math.min(100, Math.round(p.percent))) : null;
  const message = p?.message ?? "Researching — this list will populate live.";
  return (
    <div className="rounded-lg border-2 border-dashed border-on-surface/20 bg-surface/70 p-4">
      <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{message}</span>
      </div>
      {percent != null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ScholarshipsCard({ scholarships }: { scholarships: Scholarship[] | undefined }) {
  const loading = scholarships === undefined;
  const items = scholarships ?? [];
  return (
    <SectionCard
      id="scholarships"
      icon={<Trophy className="h-4 w-4" />}
      title="Scholarships & aid"
      subtitle="Financial support programs offered by this school."
    >
      {loading ? (
        <div className="h-24 animate-pulse rounded-lg border border-on-surface/10 bg-surface/70" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
          No scholarship data for this school yet — we surface aid programs as we research them.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => {
            const tag = s.category || s.type;
            return (
              <li
                key={s._id}
                className="rounded-lg border border-on-surface/10 bg-surface-container-lowest p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-label-md font-bold text-on-surface">
                    {s.name}
                    {s.provider && (
                      <span className="ml-1.5 font-[var(--font-label)] text-label-sm font-normal text-on-surface-variant">
                        · {s.provider}
                      </span>
                    )}
                  </p>
                  {s.amount && (
                    <p className="font-[var(--font-label)] text-label-sm font-semibold text-tertiary">
                      {s.amount}
                    </p>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {tag && (
                    <span className="rounded-full border border-on-surface/20 bg-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wider text-on-surface/70">
                      {tag}
                    </span>
                  )}
                  {s.deadline && (
                    <span className="text-label-sm text-on-surface-variant">
                      Deadline: {s.deadline}
                    </span>
                  )}
                </div>
                {s.eligibility && (
                  <p className="mt-1 text-body-sm text-on-surface-variant">{s.eligibility}</p>
                )}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
                  >
                    Details <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
  checklistPer?: { checklist: { ready: boolean; [k: string]: unknown } | null };
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
