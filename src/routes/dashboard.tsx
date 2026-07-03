import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
import {
  Sparkles,
  Award,
  GraduationCap,
  ArrowRight,
  PenLine,
  CalendarClock,
  Send,
  TrendingUp,
  Lock,
  Loader2,
  Bookmark,
  FileText,
  MapPin,
  Layers,
  Search,
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
import { markProgress } from "@/lib/progress";
import { useActiveApplyJob, type ApplyJob, type ApplyJobStatus } from "@/lib/applyQueue/client";
import { useSavedUniversities, type SavedUniversity } from "@/lib/universities/savedClient";

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

type PastEssay = {
  essayId: string;
  targetName?: string;
  wordCount: number;
  preview: string;
  createdAt: number;
};

function normalizeUrl(u?: string): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
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

// Friendly, human-facing labels for the live application state.
const APPLY_STATUS: Record<ApplyJobStatus, { label: string; live: boolean }> = {
  queued: { label: "Queued", live: true },
  claimed: { label: "Starting", live: true },
  awaiting_login: { label: "Needs login", live: true },
  filling: { label: "Filling in", live: true },
  awaiting_submit: { label: "Ready to submit", live: true },
  done: { label: "Submitted", live: false },
  cancelled: { label: "Cancelled", live: false },
  error: { label: "Needs attention", live: true },
};

const COMING_SOON = [
  {
    key: "tracker",
    title: "Deadline tracker",
    desc: "Every requirement, fee, and deadline auto-synced to your calendar.",
    icon: CalendarClock,
  },
  {
    key: "autoapply",
    title: "Auto-Apply",
    desc: "One profile, every common application — pre-filled and submitted.",
    icon: Send,
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
  const { user, isAuthenticated, token } = useAuth();
  const { refresh } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPayload | null>(null);
  const [serverStatus, setServerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modal, setModal] = useState<null | { title: string }>(null);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const recommend = useAction(api.rag.recommend.recommend);

  // Live data sources for the command center.
  const activeJob = useActiveApplyJob();
  const { saved: shortlist } = useSavedUniversities();
  const pastEssays = useQuery(api.essays.listEssays, token ? { token } : "skip") as
    | PastEssay[]
    | undefined;

  useEffect(() => {
    setSessionId(getSessionId());
    setSaved(loadSaved());
  }, []);

  // For signed-in users, always pull server-side matches; force when ?refresh=1.
  useEffect(() => {
    if (!sessionId) return;
    if (!isAuthenticated) return;
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
  }, [sessionId, isAuthenticated, token, recommend, refresh, navigate]);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    return n ? n.split(/\s+/)[0] : null;
  }, [user]);

  const loading = isAuthenticated && serverStatus === "loading" && !saved;

  const matchCount = saved?.matches.length ?? 0;
  const shortlistCount = shortlist?.length ?? 0;
  const essayCount = pastEssays?.length ?? 0;

  return (
    <>
      <LivingBackground />
      <DashboardShell>
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-24 sm:px-8 lg:px-12"
        >
          {/* Re-ranked celebration banner */}
          <AnimatePresence>
            {justRefreshed && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-on-surface bg-primary px-5 py-4 text-white qc-hard-shadow"
              >
                <motion.span
                  animate={{ rotate: [0, 14, -8, 0] }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.span>
                <p className="font-display text-label-lg font-bold">
                  Re-ranked with your new answers — here are your fresh matches.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command-center header */}
          <motion.header
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Command center
            </p>
            <h1 className="mt-2 text-display-lg-mobile text-on-surface text-balance">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome to QuestCampus."}
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              Your shortlist, essays, and next move — all in one place.
            </p>
          </motion.header>

          {/* Signature: the KPI instrument cluster */}
          <StatCluster
            reduce={!!reduce}
            shortlist={shortlistCount}
            matches={matchCount}
            essays={essayCount}
            job={isAuthenticated ? activeJob : null}
          />

          {/* Focus row — what to do right now */}
          <div className="mt-8">
            {isAuthenticated && activeJob ? (
              <SilentErrorBoundary>
                <ApplyFocusCard job={activeJob} reduce={!!reduce} />
              </SilentErrorBoundary>
            ) : (
              <NextStepCard isAuthenticated={isAuthenticated} />
            )}
          </div>

          {/* Working area: matches (main) + rail */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Matches */}
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-headline-lg font-bold text-on-surface">
                    Your matches
                  </h2>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    {loading
                      ? "Loading your matches…"
                      : saved
                        ? `${matchCount} best-fit ${matchCount === 1 ? "school" : "schools"} from your answers`
                        : "We'll save your quiz matches here automatically."}
                  </p>
                </div>
                {!saved && !loading && (
                  <Link
                    to="/"
                    className="hidden shrink-0 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:inline-flex"
                  >
                    Take the quiz
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-56 animate-pulse rounded-lg border-2 border-on-surface/20 bg-surface/60"
                    />
                  ))}
                  <div className="col-span-full mt-2 flex items-center justify-center gap-2 text-body-sm text-on-surface-variant">
                    <Loader2 className="h-4 w-4 animate-spin" /> Re-ranking from your latest answers…
                  </div>
                </div>
              ) : saved && saved.matches.length > 0 ? (
                <motion.div
                  key={saved.at}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
                  }}
                  className="mt-6 grid gap-5 sm:grid-cols-2"
                >
                  {saved.matches.map((m, i) => (
                    <MatchCard
                      key={`${saved.at}-${m.name}-${i}`}
                      match={m}
                      celebrate={justRefreshed}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
                  <p className="text-body-lg text-on-surface-variant">
                    No matches yet. Take the 60-second quiz to fill your shortlist.
                  </p>
                  <Link
                    to="/"
                    className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-2.5 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                  >
                    Start the quiz <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>

            {/* Rail */}
            <aside className="flex flex-col gap-6">
              <SavedSchoolsPanel list={shortlist} isAuthenticated={isAuthenticated} />
              <EssaysPanel essays={pastEssays} isAuthenticated={isAuthenticated} />
            </aside>
          </div>

          {/* Search any university */}
          <section className="mt-12 rounded-2xl border-2 border-on-surface bg-surface/85 p-6 backdrop-blur-md qc-hard-shadow sm:p-8">
            <SilentErrorBoundary>
              <UniversitySearchSection
                title="Search any university"
                subtitle="Search 11,000+ universities and add the ones you're already considering to your shortlist."
              />
            </SilentErrorBoundary>
            <div className="mt-5">
              <Link
                to="/universities"
                search={{ q: "" }}
                className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md font-semibold text-primary hover:underline"
              >
                Open full universities workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* Coming soon — subdued strip */}
          <section className="mt-12">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-headline-md font-bold text-on-surface">
                What's next for you
              </h2>
              <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                Join the waitlist · 30% off monthly
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {COMING_SOON.map((t, i) => (
                <ToolTile
                  key={t.key}
                  title={t.title}
                  desc={t.desc}
                  Icon={t.icon}
                  delay={i * 0.05}
                  onClick={() => setModal({ title: t.title })}
                />
              ))}
            </div>
          </section>

          {!isAuthenticated && (
            <p className="mt-10 text-center text-body-sm text-on-surface-variant">
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
        body="Join the waitlist to be first in line and lock in 30% off monthly access."
        feature={modal?.title}
      />
    </>
  );
}

/* ── Signature: KPI instrument cluster ──────────────────────────────
   A single hard-shadowed panel split into hairline-divided stat tiles.
   The application tile carries a live coral pulse while a job is running. */
function StatCluster({
  reduce,
  shortlist,
  matches,
  essays,
  job,
}: {
  reduce: boolean;
  shortlist: number;
  matches: number;
  essays: number;
  job: ApplyJob | null | undefined;
}) {
  const applyState = job ? APPLY_STATUS[job.status] : null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
      className="mt-8 overflow-hidden rounded-2xl border-2 border-on-surface qc-hard-shadow"
    >
      <div className="grid grid-cols-2 gap-[2px] bg-on-surface/15 sm:grid-cols-4">
        <StatTile
          Icon={Bookmark}
          to="/universities"
          value={shortlist}
          label="Saved schools"
          hint={shortlist === 0 ? "Add your first" : "In your shortlist"}
        />
        <StatTile
          Icon={Layers}
          value={matches}
          label="AI matches"
          hint={matches === 0 ? "Take the quiz" : "Best-fit for you"}
        />
        <StatTile
          Icon={PenLine}
          to="/essay"
          value={essays}
          label="Essays"
          hint={essays === 0 ? "Draft one free" : "Drafted"}
        />
        <ApplyTile state={applyState} />
      </div>
    </motion.div>
  );
}

function StatTile({
  Icon,
  value,
  label,
  hint,
  to,
}: {
  Icon: typeof Award;
  value: number;
  label: string;
  hint: string;
  to?: "/universities" | "/essay";
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon className="h-4 w-4" />
        <span className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="mt-3 font-display text-[2rem] font-bold leading-none text-on-surface">{value}</p>
      <p className="mt-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">{hint}</p>
    </>
  );
  const cls =
    "group flex flex-col bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low";
  return to ? (
    <Link to={to} search={to === "/universities" ? ({ q: "" } as never) : undefined} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function ApplyTile({ state }: { state: { label: string; live: boolean } | null }) {
  return (
    <Link
      to="/apply"
      className="group relative flex flex-col bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low"
    >
      {state?.live && <span className="absolute inset-x-0 top-0 h-1 bg-primary" />}
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Send className="h-4 w-4" />
        <span className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.08em]">
          Application
        </span>
      </div>
      <p className="mt-3 flex items-center gap-2 font-display text-headline-sm font-bold leading-none text-on-surface">
        {state ? state.label : "Not started"}
        {state?.live && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )}
      </p>
      <p className="mt-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        {state ? "Tap to resume" : "Prepare a target"}
      </p>
    </Link>
  );
}

/* ── Focus card: an application currently in progress ─────────────── */
function ApplyFocusCard({ job, reduce }: { job: ApplyJob; reduce: boolean }) {
  const state = APPLY_STATUS[job.status];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
    >
      <Link
        to="/apply/$jobId"
        params={{ jobId: job.jobId }}
        className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border-2 border-on-surface bg-primary p-6 text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/70 bg-white/15">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <p className="inline-flex items-center gap-2 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.16em] text-white/85">
              Application in progress
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            </p>
            <h2 className="mt-1.5 font-display text-headline-md font-bold text-white">
              {job.targetName ?? job.externalId ?? "Your application"}
            </h2>
            <p className="mt-1 text-body-md text-white/85">
              {job.progress?.message ?? `${state.label} — pick up where you left off.`}
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-white bg-white px-5 py-3 font-display text-label-lg font-bold text-primary">
          Resume
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}

/* ── Rail: saved shortlist (real, from userUniversities) ──────────── */
function SavedSchoolsPanel({
  list,
  isAuthenticated,
}: {
  list: SavedUniversity[] | undefined;
  isAuthenticated: boolean;
}) {
  const preview = (list ?? []).slice(0, 4);
  const remaining = Math.max(0, (list?.length ?? 0) - preview.length);
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-display text-headline-sm font-bold text-on-surface">
          <Bookmark className="h-4 w-4 text-primary" /> Saved schools
        </h3>
        {(list?.length ?? 0) > 0 && (
          <Link
            to="/universities"
            search={{ q: "" }}
            className="font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
          >
            Manage
          </Link>
        )}
      </div>

      {!isAuthenticated ? (
        <p className="mt-4 text-body-md text-on-surface-variant">
          <Link to="/signin" className="text-primary underline">
            Sign in
          </Link>{" "}
          to build a shortlist you keep across devices.
        </p>
      ) : list === undefined ? (
        <div className="mt-4 flex items-center gap-2 text-body-md text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : preview.length === 0 ? (
        <div className="mt-4">
          <p className="text-body-md text-on-surface-variant">
            Nothing saved yet. Add schools from your matches or search.
          </p>
          <Link
            to="/universities"
            search={{ q: "" }}
            className="mt-4 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <Search className="h-3.5 w-3.5" /> Find schools
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {preview.map((u) => {
            const location = [u.city, u.state, u.country].filter(Boolean).join(", ");
            return (
              <li
                key={u.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-on-surface/12 bg-surface-container-lowest p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-container">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-label-lg font-bold text-on-surface">
                    {u.name}
                  </p>
                  {location && (
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          {remaining > 0 && (
            <Link
              to="/universities"
              search={{ q: "" }}
              className="inline-flex items-center gap-1.5 pt-1 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
            >
              + {remaining} more <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </ul>
      )}
    </section>
  );
}

/* ── Rail: recent essays (real, from api.essays.listEssays) ───────── */
function EssaysPanel({
  essays,
  isAuthenticated,
}: {
  essays: PastEssay[] | undefined;
  isAuthenticated: boolean;
}) {
  const preview = (essays ?? []).slice(0, 3);
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-display text-headline-sm font-bold text-on-surface">
          <FileText className="h-4 w-4 text-primary" /> Essays
        </h3>
        {preview.length > 0 && (
          <Link
            to="/essay"
            className="font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
          >
            Open
          </Link>
        )}
      </div>

      {!isAuthenticated || preview.length === 0 ? (
        <div className="mt-4">
          <p className="text-body-md text-on-surface-variant">
            Turn your story into a Common App personal statement — grounded in your answers, zero
            invented facts. First draft is free.
          </p>
          <Link
            to="/essay"
            className="group mt-4 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-display text-label-md font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <PenLine className="h-3.5 w-3.5" /> Start writing
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {preview.map((e) => (
            <Link
              key={e.essayId}
              to="/essay"
              className="group flex flex-col gap-1 rounded-xl border-2 border-on-surface/12 bg-surface-container-lowest p-3 transition-colors hover:border-on-surface/30"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-display text-label-lg font-bold text-on-surface">
                  {e.targetName ?? "Personal statement"}
                </p>
                <span className="shrink-0 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                  {e.wordCount}w
                </span>
              </div>
              <p className="line-clamp-2 text-body-sm text-on-surface/70">{e.preview}</p>
              <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                {timeAgo(e.createdAt)}
              </span>
            </Link>
          ))}
        </ul>
      )}
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
  Icon,
  onClick,
  delay = 0,
}: {
  title: string;
  desc: string;
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
      className="group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border-2 border-on-surface/70 bg-surface/70 p-4 text-left backdrop-blur-md transition-all hover:border-on-surface hover:qc-hard-shadow-sm"
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
      </div>
    </motion.button>
  );
}
