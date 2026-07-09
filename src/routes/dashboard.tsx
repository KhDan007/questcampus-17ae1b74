import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAction } from "convex/react";
import {
  Sparkles,
  Award,
  GraduationCap,
  ArrowRight,
  CalendarClock,
  Send,
  TrendingUp,
  Lock,
  Loader2,
  Play,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import type { RecCard } from "@/components/profile/UniversityCard";
import { UniversitySearchSection } from "@/components/universities/UniversitySearchSection";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { NextStepCard } from "@/components/dashboard/NextStepCard";
import { ResumeBanner } from "@/components/apply/ResumeBanner";
import { AgentCommandCard } from "@/components/agent/AgentCommandCard";
import { markProgress } from "@/lib/progress";
import { useActiveApplyJob } from "@/lib/applyQueue/client";
import { useRunDemo } from "@/lib/applyQueue/useRunDemo";
import { useSavedUniversities } from "@/lib/universities/savedClient";

import { BestForAidSection } from "@/components/dashboard/BestForAidSection";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";
import { useGuidedSteps, describeGuidedStep } from "@/lib/apply/guidedSteps";
import { WAITLIST_BASE_DISCOUNT } from "@/lib/config";
import { CheckCircle2 } from "lucide-react";


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
};
type SavedPayload = { matches: SavedMatch[]; at: number };

function normalizeUrl(u?: string): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

const BUCKET_STYLES: Record<Bucket, { border: string; chip: string; icon: typeof Award }> = {
  Safety: {
    border: "border-l-[5px] border-l-[#3b6934]",
    chip: "bg-[#bcf0ae] text-[#073707]",
    icon: GraduationCap,
  },
  Target: {
    border: "border-l-[5px] border-l-[#2e4a7a]",
    chip: "bg-[#c7d8f0] text-[#0d2240]",
    icon: Sparkles,
  },
  Reach: {
    border: "border-l-[5px] border-l-[#5e2150]",
    chip: "bg-[#f0c7e6] text-[#3a0e2e]",
    icon: Award,
  },
};

const COMING_SOON = [
  {
    key: "tracker",
    title: "Deadline tracker",
    desc: "Every requirement, fee, and deadline auto-synced to your calendar.",
    icon: CalendarClock,
  },
  {
    key: "scholarships",
    title: "Scholarship matcher",
    desc: "Ranked scholarships you actually qualify for, with deadlines and effort scores.",
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
      match: Math.round((r.score ?? 0.7) * 100),
      bucket: bucketCap(r.bucket),
      why: r.why || "",
      tag: r.fields?.[0] ?? r.region ?? r.country ?? "",
      website: r.website,
    })),
  };
}

function DashboardPage() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated, token, isHydrated } = useAuth();
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

  // For signed-in users, always pull server-side matches; force when ?refresh=1.
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
          // Clear the ?refresh flag from the URL after a moment.
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
  }, [sessionId, authed, token, recommend, refresh, navigate]);

  const firstName = useMemo(() => {
    if (!authed) return null;
    const n = user?.name?.trim();
    return n ? n.split(/\s+/)[0] : null;
  }, [authed, user]);

  const loading = authed && serverStatus === "loading" && !saved;

  return (
    <>
      <LivingBackground />
      <DashboardShell>
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-(--container-content) px-4 pb-16 pt-20 sm:px-6 lg:px-8"
        >
          {/* Re-ranked celebration banner */}
          <AnimatePresence>
            {justRefreshed && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-on-surface bg-primary px-4 py-3 text-white qc-hard-shadow"
              >
                <motion.span
                  animate={{ rotate: [0, 14, -8, 0] }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.span>
                <p className="font-display text-label-md font-bold">
                  Re-ranked with your new answers — here are your fresh matches.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact stat bar */}
          <SilentErrorBoundary>
              <StatBar
                firstName={firstName}
              isAuthenticated={authed}
                quizMatches={saved?.matches.length ?? 0}
              />
          </SilentErrorBoundary>

          {/* Resume any live application first */}
          <div className="mt-6">
            <ResumeBanner />
          </div>

          {/* See it in action — the live demo, front and center */}
          {authed && (
            <div className="mt-6">
              <SilentErrorBoundary>
                <DemoHeroCard />
              </SilentErrorBoundary>
            </div>
          )}

          {authed && (
            <div className="mt-6">
              <SilentErrorBoundary>
                <AgentCommandCard
                  title="Let the deep agent plan the next move"
                  body="One roadmap uses your profile, saved schools, requirements, documents, scholarship signals, extension state, and applied tracker."
                />
              </SilentErrorBoundary>
            </div>
          )}

          {/* Split hero: next-step (8) + task rail (4) */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <NextStepCard isAuthenticated={authed} />
            </div>
            <div className="lg:col-span-4">
              <SilentErrorBoundary>
                <TaskRail isAuthenticated={authed} />
              </SilentErrorBoundary>
            </div>
          </div>

          {/* Your picks — main picks grid */}
          {authed && (
            <SilentErrorBoundary>
              <YourPicksSection />
            </SilentErrorBoundary>
          )}

          {/* Best for scholarships & aid — ranked from saved schools */}
          {authed && (
            <SilentErrorBoundary>
              <BestForAidSection />
            </SilentErrorBoundary>
          )}

          {/* Secondary utility row: prep progress + search (quiet tier) */}
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {authed ? (
              <SilentErrorBoundary>
                <PrepSummaryCard />
              </SilentErrorBoundary>
            ) : (
              <section className="rounded-2xl border border-on-surface/15 bg-surface/60 p-5 backdrop-blur-md">
                <h2 className="font-display text-headline-sm font-bold text-on-surface">
                  Save this workspace
                </h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Create a free account to save picks, essays, and answers across devices.
                </p>
                <Link
                  to="/signin"
                  search={{ mode: "signup" } as never}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-display text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  Create account <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            )}

            {/* Search — quiet utility (essay lives in the task rail + sidebar) */}
            <section className="rounded-2xl border border-on-surface/15 bg-surface/60 p-5 backdrop-blur-md">
              <SilentErrorBoundary>
                <UniversitySearchSection
                  title="Search 11,000+ universities"
                  subtitle="Add any school to your shortlist."
                />
              </SilentErrorBoundary>
              <Link
                to="/universities"
                search={{ q: "" }}
                className="mt-3 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
              >
                Open full workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          </div>

          {/* Quiz matches — collapsed compact strip */}
          {(loading || (saved && saved.matches.length > 0) || !saved) && (
            <section className="mt-10">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-headline-sm font-bold text-on-surface">
                    From your quiz
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {loading
                      ? "Loading matches…"
                      : saved
                        ? `${saved.matches.length} AI match${saved.matches.length === 1 ? "" : "es"} · save the ones you like to your picks`
                        : "Take the quiz to see your first matches."}
                  </p>
                </div>
                {!saved && !loading && (
                  <Link
                    to="/"
                    className="inline-flex shrink-0 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                  >
                    Take quiz
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-40 animate-pulse rounded-lg border-2 border-on-surface/20 bg-surface/60"
                    />
                  ))}
                </div>
              ) : saved && saved.matches.length > 0 ? (
                <motion.div
                  key={saved.at}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
                  }}
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {saved.matches.slice(0, 6).map((m, i) => (
                    <MatchCard
                      key={`${saved.at}-${m.name}-${i}`}
                      match={m}
                      celebrate={justRefreshed}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-6 text-center backdrop-blur-sm">
                  <p className="text-body-md text-on-surface-variant">
                    No matches yet. Take the 60-second quiz to populate this.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Coming soon compact */}
          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-headline-sm font-bold text-on-surface">
                What's next
              </h2>
              <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                Tap to join the waitlist · {WAITLIST_BASE_DISCOUNT}% off monthly
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {COMING_SOON.map((t, i) => (
                <ToolTile
                  key={t.key}
                  title={t.title}
                  desc={t.desc}
                  Icon={t.icon}
                  delay={i * 0.04}
                  onClick={() => setModal({ title: t.title })}
                />
              ))}
            </div>
          </section>

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

function DemoHeroCard() {
  const { run, starting, error } = useRunDemo();
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-primary-fixed p-5 qc-hard-shadow sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-surface text-primary qc-hard-shadow-sm">
            <Play className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              See it in action
            </p>
            <h2 className="mt-0.5 font-display text-headline-md font-bold text-on-surface">
              Watch us fill 3 real university applications with your answers in 60 seconds
            </h2>
            <p className="mt-1 max-w-xl text-body-md text-on-surface-variant">
              We open a live browser and fill three portals from your profile. Nothing is submitted.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={() => void run()}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-3 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {starting ? "Starting demo…" : "Run the demo"}
          </button>
          {error && (
            <p role="alert" className="text-label-sm font-semibold text-primary">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchCard({ match, celebrate = false }: { match: SavedMatch; celebrate?: boolean }) {
  const style = BUCKET_STYLES[match.bucket] ?? BUCKET_STYLES.Target;
  const Icon = style.icon;
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.95, rotate: celebrate ? -1.5 : 0 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 260, damping: 22 } }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-on-surface bg-surface-container-lowest p-5 ${style.border} qc-hard-shadow hover:shadow-[6px_6px_0_0_var(--color-primary)] transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-bold ${style.chip}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {match.bucket}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-headline-lg font-bold text-primary">
            {match.match}
          </span>
          <span className="font-[var(--font-label)] text-label-md font-semibold text-primary/80">
            %
          </span>
        </div>
      </div>
      <h3 className="mt-4 text-headline-sm text-on-surface">{match.name}</h3>
      {match.location && (
        <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {match.location}
        </p>
      )}
      {match.why && <p className="mt-4 flex-1 text-body-md text-on-surface/80">{match.why}</p>}
      {(match.tag || normalizeUrl(match.website)) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-on-surface/10 pt-4">
          {match.tag && (
            <span className="rounded-md bg-secondary-container/40 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-secondary-container">
              {match.tag}
            </span>
          )}
          {normalizeUrl(match.website) && (
            <a
              href={normalizeUrl(match.website)!}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-on-surface/15 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
            >
              Official site <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </motion.article>
  );
}

function ToolTile({
  title,
  desc,
  price,
  Icon,
  onClick,
  delay = 0,
}: {
  title: string;
  desc: string;
  price?: string;
  Icon: typeof Award;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 280, damping: 22 } }}
      className="group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-on-surface/15 bg-surface/60 p-4 text-left backdrop-blur-md transition-all hover:border-on-surface hover:qc-hard-shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary-container text-on-primary-container">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-label-lg font-bold text-on-surface">{title}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-on-surface/8 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-on-surface-variant">
            <Lock className="h-3 w-3" /> Soon
          </span>
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">{desc}</p>
        {price && (
          <p className="mt-2 font-[var(--font-label)] text-label-sm font-semibold text-primary">
            {price}
          </p>
        )}
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-on-surface/40 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
    </motion.button>
  );
}

function ActiveApplyResumeCard() {
  const job = useActiveApplyJob();
  if (!job) return null;
  return (
    <Link
      to="/apply/$jobId"
      params={{ jobId: job.jobId }}
      className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-on-surface bg-primary-fixed/40 p-4 backdrop-blur-md qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary text-white">
        <Send className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wide text-primary">
          Application in progress
        </p>
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {job.targetName ?? job.externalId ?? "Resume application"}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {job.progress?.message ?? job.status}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-on-surface/60" />
    </Link>
  );
}

function PrepSummaryCard() {
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

  if (saved === undefined) {
    return (
      <div className="h-56 animate-pulse rounded-2xl border-2 border-on-surface/15 bg-surface/60" />
    );
  }

  const hasTargets = targets.length > 0;
  const percent =
    guided.total > 0 ? Math.round((guided.doneCount / guided.total) * 100) : 0;
  const nextTitle = guided.next ? describeGuidedStep(guided.next) : null;
  const isDone = hasTargets && guided.total > 0 && guided.doneCount === guided.total;

  return (
    <section
      id="dashboard-prep"
      className="flex h-full flex-col rounded-2xl border border-on-surface/15 bg-surface/60 p-5 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Guided prep
          </p>
          <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
            Prep applications
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Answer once — reused everywhere.
          </p>
        </div>
        {hasTargets && guided.total > 0 && (
          <div className="shrink-0 text-right">
            <p className="font-display text-headline-lg font-bold text-on-surface">
              {percent}%
            </p>
            <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              {guided.doneCount}/{guided.total}
            </p>
          </div>
        )}
      </div>

      {hasTargets && guided.total > 0 && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex-1">
        {!hasTargets ? (
          <p className="text-body-sm text-on-surface-variant">
            Save some universities first — we'll surface the exact questions each one asks.
          </p>
        ) : guided.loading ? (
          <p className="text-body-sm text-on-surface-variant">Loading your prep queue…</p>
        ) : isDone ? (
          <div className="flex items-center gap-2 rounded-lg border-2 border-on-surface/15 bg-tertiary-fixed px-3 py-2 text-on-tertiary-fixed">
            <CheckCircle2 className="h-4 w-4" />
            <p className="font-[var(--font-label)] text-label-md font-semibold">
              Everything's ready — launch auto-apply.
            </p>
          </div>
        ) : nextTitle ? (
          <div className="rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest p-3">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
              Next step
            </p>
            <p className="mt-1 font-display text-label-lg font-bold text-on-surface">
              {nextTitle}
            </p>
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            We're pulling the exact questions each university asks.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={hasTargets ? "/prep" : "/apply"}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          {hasTargets ? (isDone ? "Review & launch" : "Continue prep") : "Pick universities"}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {hasTargets && guided.total > 0 && (
          <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
            {guided.total - guided.doneCount} step{guided.total - guided.doneCount === 1 ? "" : "s"} left
          </span>
        )}
      </div>
    </section>
  );
}

function YourPicksSection() {
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
  const plan = useIntakePlan(targets);

  if (saved === undefined) return null;
  if (targets.length === 0) return null;

  const foundMap = new Map<string, boolean>(
    (plan?.targets ?? []).map((t) => [`${t.system}::${t.externalId}`, t.found]),
  );

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-md font-bold text-on-surface">
            Your picks{" "}
            <span className="font-[var(--font-label)] text-label-md font-semibold text-on-surface-variant">
              · {targets.length}
            </span>
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Deep-researched in the background — status updates live.
          </p>
        </div>
        <Link
          to="/apply"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          Add more <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(saved ?? []).map((s) => {
          const key = `${s.source}::${s.externalId}`;
          const found = foundMap.get(key);
          const location = [s.city, s.country].filter(Boolean).join(", ");
          return (
            <li key={s.id}>
              <Link
                to="/application/$system/$externalId"
                params={{ system: s.source, externalId: s.externalId }}
                className="group flex w-full items-center gap-3 rounded-xl border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 text-left qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary-fixed text-primary">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-label-md font-bold text-on-surface">
                    {s.name}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-label-sm text-on-surface-variant">
                    {found ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-tertiary" />
                        <span className="text-tertiary">Ready</span>
                        {location && <span className="text-on-surface/40">· {location}</span>}
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <span className="text-primary">Researching</span>
                        {location && <span className="text-on-surface/40">· {location}</span>}
                      </>
                    )}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/40 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatBar({
  firstName,
  isAuthenticated,
  quizMatches,
}: {
  firstName: string | null;
  isAuthenticated: boolean;
  quizMatches: number;
}) {
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
  const plan = useIntakePlan(targets);
  const picks = targets.length;
  const ready = plan?.targets?.filter((t) => t.found).length ?? 0;

  return (
    <section className="grid grid-cols-1 items-center gap-3 rounded-2xl border-2 border-on-surface bg-surface/95 px-4 py-3 backdrop-blur-md qc-hard-shadow sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-headline-md font-bold text-on-surface">
            {firstName ? `Hey ${firstName} 👋` : "Welcome to QuestCampus"}
          </h1>
          <p className="truncate text-body-sm text-on-surface-variant">
            {isAuthenticated
              ? "Your admissions command center."
              : "Sign in to save picks and drafts across devices."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
        <StatChip label="Picks" value={picks} />
        <span className="hidden h-8 w-px bg-on-surface/15 sm:block" />
        <StatChip
          label="Researched"
          value={ready}
          tone={ready === picks && picks > 0 ? "success" : "default"}
        />
        <span className="hidden h-8 w-px bg-on-surface/15 sm:block" />
        <StatChip label="Quiz matches" value={quizMatches} />
      </div>
    </section>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <div className="text-center">
      <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p
        className={`font-display text-headline-sm font-bold leading-none ${
          tone === "success" ? "text-tertiary" : "text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TaskRail({ isAuthenticated }: { isAuthenticated: boolean }) {
  const job = useActiveApplyJob();
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
  const plan = useIntakePlan(targets);
  const researching = (plan?.targets ?? []).filter((t) => !t.found).length;
  const ready = (plan?.targets ?? []).filter((t) => t.found).length;

  const items: Array<{
    key: string;
    dot: "primary" | "tertiary" | "muted";
    title: string;
    subtitle: string;
    to: string;
    params?: Record<string, string>;
  }> = [];

  if (job) {
    items.push({
      key: "active",
      dot: "primary",
      title: job.targetName ?? job.externalId ?? "Resume application",
      subtitle: job.progress?.message ?? job.status,
      to: "/apply/$jobId",
      params: { jobId: job.jobId },
    });
  }
  if (researching > 0) {
    items.push({
      key: "researching",
      dot: "primary",
      title: `${researching} deep-research${researching === 1 ? "" : "es"} in progress`,
      subtitle: "Requirements pulled from each portal",
      to: "/apply",
    });
  }
  if (ready > 0) {
    items.push({
      key: "ready",
      dot: "tertiary",
      title: `${ready} universit${ready === 1 ? "y" : "ies"} ready to prep`,
      subtitle: "Answer questions, then auto-apply",
      to: "/apply",
    });
  }
  if (isAuthenticated) {
    items.push({
      key: "essay",
      dot: "muted",
      title: "Personal statement",
      subtitle: "Draft or review with AI",
      to: "/essay",
    });
  }
  if (targets.length === 0 && isAuthenticated) {
    items.push({
      key: "pick",
      dot: "primary",
      title: "Pick your first universities",
      subtitle: "Choose from matches or search",
      to: "/apply",
    });
  }
  if (!isAuthenticated) {
    items.push({
      key: "signin",
      dot: "primary",
      title: "Save your work",
      subtitle: "Create a free account",
      to: "/signin",
    });
  }

  const dotColor = (d: "primary" | "tertiary" | "muted") =>
    d === "tertiary" ? "bg-tertiary" : d === "muted" ? "bg-on-surface/30" : "bg-primary";

  return (
    <aside className="flex h-full flex-col rounded-2xl border-2 border-on-surface bg-surface/95 p-5 backdrop-blur-md qc-hard-shadow">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-headline-sm font-bold text-on-surface">Task rail</h3>
        <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
          Live
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          You're all caught up — enjoy the calm.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                to={it.to as never}
                params={it.params as never}
                className="group flex items-center gap-3 rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface"
              >
                <span
                  className={`relative grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full ${dotColor(it.dot)}`}
                >
                  {it.dot === "primary" && (
                    <span
                      className={`absolute inset-0 animate-ping rounded-full ${dotColor(it.dot)} opacity-50`}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-label-md font-bold text-on-surface">
                    {it.title}
                  </p>
                  <p className="truncate text-label-sm text-on-surface-variant">{it.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/40 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}



