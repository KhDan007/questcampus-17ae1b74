import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAction } from "convex/react";
import {
  Sparkles,
  Award,
  GraduationCap,
  ArrowRight,
  BarChart3,
  Send,
  TrendingUp,
  Lock,
  Loader2,
  Play,
  Bookmark,
  BookmarkCheck,
  Compass,
  CheckCircle2,
  PenLine,
  ScanSearch,
  Rocket,
  Upload,
  ClipboardCheck,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import { WhyReasons } from "@/components/common/WhyReasons";
import { useAutoTranslate } from "@/lib/i18n/useAutoTranslate";
import { askAssistant } from "@/lib/assistant";
import type { RecCard } from "@/components/profile/UniversityCard";
import { UniversitySearchSection } from "@/components/universities/UniversitySearchSection";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { ResumeBanner } from "@/components/apply/ResumeBanner";
import { AgentCommandCard } from "@/components/agent/AgentCommandCard";
import { markProgress, useProgress, nextStep, type NextStep } from "@/lib/progress";
import { useActiveApplyJob } from "@/lib/applyQueue/client";
import { useRunDemo } from "@/lib/applyQueue/useRunDemo";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { BestForAidSection } from "@/components/dashboard/BestForAidSection";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";
import { useGuidedSteps, describeGuidedStep, type GuidedStep } from "@/lib/apply/guidedSteps";
import { useApplicationStrength } from "@/lib/apply/applicationStrength";
import { WAITLIST_BASE_DISCOUNT } from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — QuestCampus" }] }),
  validateSearch: (s: Record<string, unknown>): { refresh?: number } => ({
    refresh:
      typeof s.refresh === "string"
        ? Number(s.refresh) || undefined
        : (s.refresh as number | undefined),
  }),
  component: DashboardPage,
});

type Bucket = "Safety" | "Target" | "Reach";
type SavedMatch = {
  name: string;
  location: string;
  match: number;
  bucket: Bucket;
  why: string;
  tag: string;
  website?: string;
  source?: string;
  externalId?: string;
};
type SavedPayload = { matches: SavedMatch[]; at: number };

// Semantic tone → soft pastel icon tile. The whole workspace speaks one
// icon-tile vocabulary (coral = action, green = ready, amber = value/score,
// muted = passive) so color always means status, never decoration.
type Tone = "coral" | "green" | "amber" | "muted";
const TILE: Record<Tone, string> = {
  coral: "bg-primary-fixed text-on-primary-fixed-variant",
  green: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  amber: "bg-secondary-fixed text-on-secondary-fixed-variant",
  muted: "bg-surface-container text-on-surface-variant",
};

function normalizeUrl(u?: string): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

const BUCKET_STYLES: Record<Bucket, { chip: string; icon: typeof Award }> = {
  Safety: { chip: "bg-tertiary-fixed text-on-tertiary-fixed-variant", icon: GraduationCap },
  Target: { chip: "bg-secondary-fixed text-on-secondary-fixed-variant", icon: Sparkles },
  Reach: { chip: "bg-primary-fixed text-on-primary-fixed-variant", icon: Award },
};

const COMING_SOON = [
  {
    key: "tracker",
    title: "Deadline tracker",
    desc: "Every requirement, fee, and deadline synced to your calendar.",
    icon: CalendarClock,
  },
  {
    key: "scholarships",
    title: "Scholarship matcher",
    desc: "Ranked scholarships you actually qualify for.",
    icon: TrendingUp,
  },
];

function loadSaved(): SavedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("qc.landing.matches");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPayload;
    if (!Array.isArray(parsed?.matches)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function bucketCap(b: RecCard["bucket"]): Bucket {
  return (b.charAt(0).toUpperCase() + b.slice(1)) as Bucket;
}

function recsToSaved(recs: RecCard[]): SavedPayload {
  return {
    at: Date.now(),
    matches: recs.map((r) => ({
      name: r.name,
      location: [r.city, r.state, r.country].filter(Boolean).join(", "),
      match: Math.round(r.matchPercent ?? (r.score ?? 0.7) * 100),
      bucket: bucketCap(r.bucket),
      why: r.why || "",
      tag: r.fields?.[0] ?? r.region ?? r.country ?? "",
      website: r.website,
      source: r.source ?? "scorecard",
      externalId: r.externalId,
    })),
  };
}

function DashboardPage() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated, token, isHydrated, hasPaidAccess } = useAuth();
  const { lang } = useI18n();
  const { saved: savedUnis } = useSavedUniversities();
  const savedCount = savedUnis?.length ?? 0;
  const showBrowseAll = hasPaidAccess && savedCount >= 20;
  const authed = isHydrated && isAuthenticated;
  const { refresh } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPayload | null>(null);
  const [serverStatus, setServerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modal, setModal] = useState<null | { title: string }>(null);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const recommend = useAction(api.rag.recommend.recommend);

  useEffect(() => {
    setSessionId(getSessionId());
    setSaved(loadSaved());
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (!authed) return;
    let cancelled = false;
    setServerStatus("loading");
    const force = refresh === 1;
    (async () => {
      try {
        const res = (await recommend({
          sessionId,
          token: token ?? undefined,
          plan: "free",
          force,
          lang,
        })) as { results?: RecCard[]; error?: string };
        if (cancelled) return;
        if (res?.error || !res?.results) {
          setServerStatus("error");
          return;
        }
        const payload = recsToSaved(res.results);
        setSaved(payload);
        try {
          window.localStorage.setItem("qc.landing.matches", JSON.stringify(payload));
        } catch {
          // localStorage may be unavailable in private browsing.
        }
        setServerStatus("ready");
        if (force) {
          markProgress("refined", true);
          setJustRefreshed(true);
          window.setTimeout(() => {
            navigate({ search: {} as never, replace: true });
          }, 100);
          window.setTimeout(() => setJustRefreshed(false), 4500);
        }
      } catch {
        if (!cancelled) setServerStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, authed, token, recommend, refresh, navigate, lang]);

  const firstName = useMemo(() => {
    if (!authed) return null;
    const n = user?.name?.trim();
    return n ? n.split(/\s+/)[0] : null;
  }, [authed, user]);

  const loading = authed && serverStatus === "loading" && !saved;

  const quizSubtitleRaw = loading
    ? "Loading matches…"
    : saved
      ? `${saved.matches.length} AI matches · save the ones you like`
      : "Take the quiz to see your first matches.";
  const quizSubtitle = useAutoTranslate(quizSubtitleRaw) ?? quizSubtitleRaw;

  return (
    <>
      <DashboardShell>
        <main
          id="main-content"
          className="mx-auto w-full max-w-(--container-content) px-4 pb-16 pt-20 sm:px-6 lg:px-8"
        >
          {/* Plain page header — greeting, not a boxed stat strip. */}
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-headline-lg font-bold text-on-surface">
                {firstName ? `Hey ${firstName}` : "Welcome to QuestCampus"}
              </h1>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {authed
                  ? "Here's what's next on your applications."
                  : "Sign in to save picks and drafts across devices."}
              </p>
            </div>
          </header>

          <AnimatePresence>
            {justRefreshed && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 flex items-center gap-3 rounded-2xl bg-primary-fixed px-4 py-3 text-on-primary-fixed-variant"
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <p className="font-[var(--font-label)] text-label-md font-semibold">
                  Re-ranked with your new answers — here are your fresh matches.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5">
            <ResumeBanner />
          </div>

          {showBrowseAll && (
            <div className="mt-5">
              <BrowseAllCard savedCount={savedCount} />
            </div>
          )}

          {/* Two-column workspace: primary work in the wide column, quieter
              context in the rail. Stacks to one column below lg. */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-8">
              {authed && (
                <SilentErrorBoundary>
                  <AgentCommandCard
                    title="Ask the agent to plan your next move"
                    body="One roadmap across your profile, saved schools, requirements, documents, scholarships, and application tracker."
                  />
                </SilentErrorBoundary>
              )}

              {authed && (
                <SilentErrorBoundary>
                  <ThingsToDo isAuthenticated={authed} />
                </SilentErrorBoundary>
              )}

              {!showBrowseAll &&
                (loading || (saved && saved.matches.length > 0) || !saved) && (
                  <QuizMatchesSection
                    loading={loading}
                    saved={saved}
                    subtitle={quizSubtitle}
                    justRefreshed={justRefreshed}
                  />
                )}

              {authed && (
                <SilentErrorBoundary>
                  <BestForAidSection />
                </SilentErrorBoundary>
              )}
            </div>

            <aside className="flex flex-col gap-6 lg:col-span-4">
              {authed ? (
                <SilentErrorBoundary>
                  <SnapshotCard quizMatches={saved?.matches.length ?? 0} />
                </SilentErrorBoundary>
              ) : (
                <GuestSaveCard />
              )}

              {authed && (
                <SilentErrorBoundary>
                  <YourPicksRail />
                </SilentErrorBoundary>
              )}

              {authed && (
                <SilentErrorBoundary>
                  <DemoCard />
                </SilentErrorBoundary>
              )}

              <SilentErrorBoundary>
                <SearchRail />
              </SilentErrorBoundary>

              <ComingSoonRail onOpen={(title) => setModal({ title })} />
            </aside>
          </div>

          {!authed && (
            <p className="mt-8 text-center text-body-sm text-on-surface-variant">
              You're browsing as a guest.{" "}
              <a href="/signin?mode=signup" className="text-primary hover:underline">
                Create a free account
              </a>{" "}
              to save this across devices.
            </p>
          )}
        </main>
      </DashboardShell>

      <WaitlistPopup
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `${modal.title} — coming soon` : "Coming soon"}
        body={`Join the waitlist to be first in line and lock in ${WAITLIST_BASE_DISCOUNT}% off monthly access.`}
        feature={modal?.title}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Card shell — the single calm surface primitive everything on the page sits in.
// ---------------------------------------------------------------------------

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={`rounded-2xl border border-on-surface/8 bg-surface-container-lowest qc-soft-shadow ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-headline-sm font-bold text-on-surface">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Things to do — the workspace centerpiece. Merges the guided-prep next step,
// live research/ready counts, strength, and the recommendation ladder into one
// scannable action list. One row = one next action.
// ---------------------------------------------------------------------------

type TodoItem = {
  key: string;
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  to: string;
  params?: Record<string, string>;
  live?: boolean;
};

function guidedIcon(kind: GuidedStep["kind"]): ComponentType<{ className?: string }> {
  switch (kind) {
    case "document":
      return Upload;
    case "essay":
      return PenLine;
    case "eligibility":
      return ClipboardCheck;
    default:
      return MessageSquare;
  }
}

function ladderItem(step: NextStep): TodoItem | null {
  if (step === "refine")
    return {
      key: "refine",
      tone: "coral",
      icon: Compass,
      title: "Refine your recommendations",
      subtitle: "A few more questions re-ranks your matches with more precision.",
      to: "/onboarding",
    };
  if (step === "draft")
    return {
      key: "draft",
      tone: "coral",
      icon: PenLine,
      title: "Draft your personal statement",
      subtitle: "Turn what you told us into a Common-App essay. First draft is free.",
      to: "/essay",
    };
  if (step === "review")
    return {
      key: "review",
      tone: "coral",
      icon: ScanSearch,
      title: "Review your essay with AI",
      subtitle: "Line-by-line feedback, stronger hooks, one-click rewrites.",
      to: "/essay",
    };
  return null;
}

function ThingsToDo({ isAuthenticated }: { isAuthenticated: boolean }) {
  const job = useActiveApplyJob();
  const progress = useProgress();
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({ system: s.source, externalId: s.externalId, name: s.name })),
    [saved],
  );
  const plan = useIntakePlan(targets);
  const guided = useGuidedSteps(targets);
  const strength = useApplicationStrength();

  const hasTargets = targets.length > 0;
  const researching = (plan?.targets ?? []).filter((t) => !t.found).length;
  const ready = (plan?.targets ?? []).filter((t) => t.found).length;
  const allDone = hasTargets && guided.total > 0 && guided.doneCount === guided.total;

  const items: TodoItem[] = [];

  if (job) {
    items.push({
      key: "active",
      tone: "coral",
      icon: Send,
      title: job.targetName ?? job.externalId ?? "Resume application",
      subtitle: job.progress?.message ?? job.status ?? "In progress",
      to: "/apply/$jobId",
      params: { jobId: job.jobId },
      live: true,
    });
  }

  if (!hasTargets && isAuthenticated) {
    items.push({
      key: "pick",
      tone: "coral",
      icon: GraduationCap,
      title: "Pick your first universities",
      subtitle: "Choose from your matches or search 11,000+ schools.",
      to: "/universities",
    });
    const ladder = ladderItem(nextStep(progress));
    if (ladder) items.push(ladder);
  }

  if (hasTargets) {
    if (guided.next) {
      items.push({
        key: "guided",
        tone: "coral",
        icon: guidedIcon(guided.next.kind),
        title: describeGuidedStep(guided.next),
        subtitle:
          guided.total > 0
            ? `Guided prep · ${guided.doneCount} of ${guided.total} done`
            : "Answer once — reused across every portal.",
        to: "/apply",
      });
    } else if (allDone) {
      items.push({
        key: "launch",
        tone: "green",
        icon: Rocket,
        title: "Everything's ready — launch auto-apply",
        subtitle: "Every required item is complete. Review and launch.",
        to: "/apply",
      });
    }
    if (researching > 0) {
      items.push({
        key: "researching",
        tone: "coral",
        icon: Loader2,
        title: `${researching} deep-research${researching === 1 ? "" : "es"} in progress`,
        subtitle: "Requirements pulled from each portal.",
        to: "/apply",
        live: true,
      });
    }
    if (ready > 0 && !guided.next) {
      items.push({
        key: "ready",
        tone: "green",
        icon: CheckCircle2,
        title: `${ready} universit${ready === 1 ? "y" : "ies"} ready to prep`,
        subtitle: "Answer questions, then auto-apply.",
        to: "/apply",
      });
    }
    items.push({
      key: "strength",
      tone: "amber",
      icon: BarChart3,
      title:
        typeof strength?.overall === "number"
          ? `Application strength ${strength.overall}/100`
          : "Check your application strength",
      subtitle: "Score, weak sections, and the next fixes.",
      to: "/apply/strength",
    });
  }

  const shown = items.slice(0, 5);

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeading title="Things to do" subtitle="Your next best actions, in order." />
      <ul className="mt-4 flex flex-col divide-y divide-on-surface/8">
        {shown.length === 0 ? (
          <li className="flex items-center gap-3 py-3 text-body-sm text-on-surface-variant">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TILE.green}`}>
              <CheckCircle2 className="h-[18px] w-[18px]" />
            </span>
            You're all caught up — enjoy the calm.
          </li>
        ) : (
          shown.map((it) => <TodoRow key={it.key} item={it} />)
        )}
      </ul>
    </Card>
  );
}

function TodoRow({ item }: { item: TodoItem }) {
  const Icon = item.icon;
  const spin = item.icon === Loader2;
  return (
    <li>
      <Link
        to={item.to as never}
        params={item.params as never}
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-on-surface/[0.03]"
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TILE[item.tone]}`}>
          <Icon className={`h-[18px] w-[18px] ${spin ? "animate-spin" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
            {item.title}
          </p>
          <p className="truncate text-label-sm text-on-surface-variant">{item.subtitle}</p>
        </div>
        {item.live && (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary-fixed px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-primary-fixed-variant sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Live
          </span>
        )}
        <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/30 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Snapshot — compact stat rail (replaces the four-chip welcome strip).
// ---------------------------------------------------------------------------

function SnapshotCard({ quizMatches }: { quizMatches: number }) {
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({ system: s.source, externalId: s.externalId, name: s.name })),
    [saved],
  );
  const plan = useIntakePlan(targets);
  const strength = useApplicationStrength();
  const picks = targets.length;
  const ready = plan?.targets?.filter((t) => t.found).length ?? 0;

  const rows: Array<{ label: string; value: string; tone: Tone; to?: string }> = [
    { label: "Picks", value: String(picks), tone: "coral" },
    {
      label: "Researched",
      value: picks > 0 ? `${ready}/${picks}` : "0",
      tone: ready === picks && picks > 0 ? "green" : "muted",
    },
    {
      label: "Strength",
      value: typeof strength?.overall === "number" ? String(strength.overall) : "—",
      tone: "amber",
      to: "/apply/strength",
    },
    { label: "Quiz matches", value: String(quizMatches), tone: "muted" },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-display text-headline-sm font-bold text-on-surface">Snapshot</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2.5">
        {rows.map((r) => {
          const inner = (
            <div className="flex h-full flex-col rounded-xl bg-surface-container/70 px-3 py-2.5">
              <dt className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant/80">
                {r.label}
              </dt>
              <dd
                className={`mt-0.5 font-display text-headline-sm font-bold tabular-nums ${
                  r.tone === "green"
                    ? "text-tertiary"
                    : r.tone === "amber"
                      ? "text-secondary"
                      : r.tone === "coral"
                        ? "text-primary"
                        : "text-on-surface"
                }`}
              >
                {r.value}
              </dd>
            </div>
          );
          return r.to ? (
            <Link key={r.label} to={r.to as never} className="qc-soft-shadow-hover rounded-xl">
              {inner}
            </Link>
          ) : (
            <div key={r.label}>{inner}</div>
          );
        })}
      </dl>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Your picks — compact rail list (was a full-width grid competing for weight).
// ---------------------------------------------------------------------------

function YourPicksRail() {
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({ system: s.source, externalId: s.externalId, name: s.name })),
    [saved],
  );
  const plan = useIntakePlan(targets);

  if (saved === undefined || targets.length === 0) return null;

  const foundMap = new Map<string, boolean>(
    (plan?.targets ?? []).map((t) => [`${t.system}::${t.externalId}`, t.found]),
  );
  const shown = (saved ?? []).slice(0, 5);

  return (
    <Card className="p-4 sm:p-5">
      <SectionHeading
        title="Your picks"
        aside={
          <Link
            to="/apply"
            className="shrink-0 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        }
      />
      <ul className="mt-3 flex flex-col divide-y divide-on-surface/8">
        {shown.map((s) => {
          const found = foundMap.get(`${s.source}::${s.externalId}`);
          const location = [s.city, s.country].filter(Boolean).join(", ");
          return (
            <li key={s.id}>
              <Link
                to="/application/$system/$externalId"
                params={{ system: s.source, externalId: s.externalId }}
                className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-on-surface/[0.03]"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${found ? TILE.green : TILE.muted}`}>
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                    {s.name}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-label-sm">
                    {found ? (
                      <span className="text-tertiary">Ready</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" /> Researching
                      </span>
                    )}
                    {location && <span className="text-on-surface/40">· {location}</span>}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/30 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Demo — a quiet rail card (was a full-width coral hero fighting the agent).
// ---------------------------------------------------------------------------

function DemoCard() {
  const { run, starting, error } = useRunDemo();
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TILE.coral}`}>
          <Play className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">See it in action</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Watch us fill 3 real applications from your answers in 60 seconds. Nothing is submitted.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={starting}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {starting ? "Starting demo…" : "Run the demo"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-label-sm font-semibold text-error">
          {error}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Search + coming-soon — quiet utilities, last in the rail.
// ---------------------------------------------------------------------------

function SearchRail() {
  return (
    <Card className="p-4 sm:p-5">
      <UniversitySearchSection
        title="Search universities"
        subtitle="Add any school to your shortlist."
      />
      <Link
        to="/universities"
        search={{ q: "" }}
        className="mt-3 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
      >
        Open full workspace <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

function ComingSoonRail({ onOpen }: { onOpen: (title: string) => void }) {
  return (
    <Card className="p-4 sm:p-5">
      <SectionHeading title="What's next" subtitle={`Join the waitlist · ${WAITLIST_BASE_DISCOUNT}% off`} />
      <ul className="mt-3 flex flex-col divide-y divide-on-surface/8">
        {COMING_SOON.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onOpen(t.title)}
                className="group -mx-2 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-on-surface/[0.03]"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TILE.muted}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                    {t.title}
                    <Lock className="h-3 w-3 text-on-surface/35" />
                  </p>
                  <p className="truncate text-label-sm text-on-surface-variant">{t.desc}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function GuestSaveCard() {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-display text-headline-sm font-bold text-on-surface">Save this workspace</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Create a free account to save picks, essays, and answers across devices.
      </p>
      <Link
        to="/signin"
        search={{ mode: "signup" } as never}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
      >
        Create account <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quiz matches — kept, but calmer and below the primary work.
// ---------------------------------------------------------------------------

function QuizMatchesSection({
  loading,
  saved,
  subtitle,
  justRefreshed,
}: {
  loading: boolean;
  saved: SavedPayload | null;
  subtitle: string;
  justRefreshed: boolean;
}) {
  return (
    <section>
      <SectionHeading
        title="From your quiz"
        subtitle={subtitle}
        aside={
          !saved && !loading ? (
            <Link
              to="/"
              className="inline-flex shrink-0 rounded-lg border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
            >
              Take quiz
            </Link>
          ) : undefined
        }
      />
      <div className="mt-3">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-on-surface/8 bg-surface-container-lowest" />
            ))}
          </div>
        ) : saved && saved.matches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.matches.slice(0, 4).map((m, i) => (
              <MatchCard key={`${saved.at}-${m.name}-${i}`} match={m} celebrate={justRefreshed} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest p-6 text-center">
            <p className="text-body-md text-on-surface-variant">
              No matches yet. Take the 60-second quiz to populate this.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function MatchCard({ match, celebrate = false }: { match: SavedMatch; celebrate?: boolean }) {
  const reduce = useReducedMotion();
  const style = BUCKET_STYLES[match.bucket] ?? BUCKET_STYLES.Target;
  const Icon = style.icon;
  const translatedWhy = useAutoTranslate(match.why || null);
  const translatedTag = useAutoTranslate(match.tag || null);
  const { isSaved, addFromRecommendation, removeByUniversity, requireAuth } =
    useSavedUniversities();
  const [busy, setBusy] = useState(false);

  const canSave = Boolean(match.source && match.externalId);
  const saved = canSave ? isSaved(match.source!, match.externalId!) : false;

  async function toggleSave() {
    if (!canSave || busy) return;
    if (!requireAuth()) return;
    setBusy(true);
    try {
      if (saved) {
        await removeByUniversity(match.source!, match.externalId!);
        toast.message(`Removed ${match.name} from your picks`);
      } else {
        await addFromRecommendation(match.source!, match.externalId!);
        toast.success(`Saved ${match.name} to your picks`);
      }
    } catch {
      toast.error("Couldn't update your picks — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col rounded-2xl border border-on-surface/10 bg-surface-container-lowest p-4 sm:p-5 qc-soft-shadow-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold ${style.chip}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {match.bucket}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-headline-md font-bold text-primary tabular-nums">
            {match.match}
          </span>
          <span className="font-[var(--font-label)] text-label-md font-semibold text-primary/70">%</span>
        </div>
      </div>
      <h3 className="mt-3 font-display text-headline-sm font-bold text-on-surface">{match.name}</h3>
      {match.location && (
        <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {match.location}
        </p>
      )}
      {match.why && (
        <div className="mt-3 flex-1">
          <WhyReasons why={translatedWhy ?? match.why} className="text-body-sm text-on-surface/75" />
        </div>
      )}

      {canSave && (
        <button
          type="button"
          onClick={toggleSave}
          disabled={busy}
          aria-pressed={saved}
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-[var(--font-label)] text-label-md font-bold transition-colors disabled:opacity-60 ${
            saved
              ? "bg-tertiary-fixed text-on-tertiary-fixed-variant hover:bg-tertiary-fixed-dim"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-4 w-4" /> Saved to your picks
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" /> Save to my picks
            </>
          )}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-on-surface/8 pt-3">
        {match.tag && (
          <span className="rounded-md bg-surface-container px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
            {translatedTag ?? match.tag}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              askAssistant(`Is ${match.name} a good fit for me? Give me the key pros and cons for my profile.`)
            }
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </button>
          {normalizeUrl(match.website) && (
            <a
              href={normalizeUrl(match.website)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
            >
              Site <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------
// Browse-all — paid power users with a big shortlist skip the 3 quiz picks.
// ---------------------------------------------------------------------------

function BrowseAllCard({ savedCount }: { savedCount: number }) {
  return (
    <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TILE.coral}`}>
          <Compass className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            Your shortlist is looking strong
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {savedCount} universities saved. Explore the full catalogue of 11,000+ to find your next add.
          </p>
        </div>
      </div>
      <Link
        to="/universities"
        search={{} as never}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
      >
        <GraduationCap className="h-4 w-4" /> Browse all
      </Link>
    </Card>
  );
}
