import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAction } from "convex/react";
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
  Compass,
  Loader2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { NavV2 } from "@/components/landing2/NavV2";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import type { RecCard } from "@/components/profile/UniversityCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — QuestCampus" }] }),
  validateSearch: (s: Record<string, unknown>): { refresh?: number } => ({
    refresh: typeof s.refresh === "string" ? Number(s.refresh) || undefined : (s.refresh as number | undefined),
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
        } catch {}
        setServerStatus("ready");
        if (force) {
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

  return (
    <>
      <LivingBackground />
      <NavV2 />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
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

        {/* Hero */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Your dashboard
          </p>
          <h1 className="mt-3 text-display-lg-mobile text-on-surface sm:text-display-lg text-balance">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome to QuestCampus."}
            <br />
            <span className="qc-text-gradient">Let's build your shortlist.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-body-lg text-on-surface-variant">
            Your matches are saved here. Everything else is on the way —
            and you'll get 30% off for life as a waitlist member.
          </p>
        </motion.section>

        {/* Recommended next step */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="mt-10"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-secondary-container p-6 qc-hard-shadow sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-on-surface bg-surface text-on-surface qc-hard-shadow-sm">
                  <Compass className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-on-surface/70">
                    Recommended next step · 1 of 3
                  </p>
                  <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
                    Refine your recommendations
                  </h2>
                  <p className="mt-1.5 max-w-xl text-body-md text-on-surface/80">
                    Answer a few more questions about your goals, learning style, and
                    constraints — we'll re-rank your matches with much more precision.
                  </p>
                </div>
              </div>
              <Link
                to={isAuthenticated ? "/onboarding" : "/signin"}
                search={isAuthenticated ? undefined : ({ redirect: "/onboarding" } as never)}
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                Refine now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Matches */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-headline-lg font-bold text-on-surface">
                Your university matches
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {loading
                  ? "Loading your matches…"
                  : saved
                    ? `${saved.matches.length} match${saved.matches.length === 1 ? "" : "es"}`
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
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-lg border-2 border-on-surface/20 bg-surface/60"
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
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
              }}
              className="mt-6 grid gap-5 lg:grid-cols-3"
            >
              {saved.matches.map((m, i) => (
                <MatchCard key={`${saved.at}-${m.name}-${i}`} match={m} celebrate={justRefreshed} />
              ))}
            </motion.div>
          ) : (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
              <p className="text-body-lg text-on-surface-variant">
                No matches yet. Take the 60-second quiz on the landing page to populate this.
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

        {/* Personal statement — live feature, logged-in only */}
        {isAuthenticated && (
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16"
          >
            <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-surface p-6 qc-hard-shadow sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
                    <PenLine className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
                      <Sparkles className="h-3 w-3" /> New · live
                    </span>
                    <h2 className="mt-2 font-display text-headline-lg font-bold text-on-surface">
                      Write your Common App personal statement
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-body-md text-on-surface/80">
                      Grounded in what you told us — zero invented facts. First
                      generation is free; unlock the full essay for $5 (also
                      reveals all your matches).
                    </p>
                  </div>
                </div>
                <Link
                  to="/essay"
                  className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  Start writing
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.section>
        )}

        {/* Coming soon tiles */}
        <section className="mt-16">
          <h2 className="font-display text-headline-lg font-bold text-on-surface">
            What's next for you
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Tap any tool to join the waitlist and lock in 30% off for life.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
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

      <WaitlistPopup
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `${modal.title} — coming soon` : "Coming soon"}
        body="Join the waitlist to be first in line and lock in 30% off for life."
        feature={modal?.title}
      />
    </>
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
      whileHover={{ y: -4 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-on-surface bg-surface-container-lowest p-5 ${style.border} qc-hard-shadow hover:shadow-[6px_6px_0_0_var(--color-primary)] transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-bold ${style.chip}`}>
          <Icon className="h-3.5 w-3.5" />
          {match.bucket}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-headline-lg font-bold text-primary">{match.match}</span>
          <span className="font-[var(--font-label)] text-label-md font-semibold text-primary/80">%</span>
        </div>
      </div>
      <h3 className="mt-4 text-headline-sm text-on-surface">{match.name}</h3>
      {match.location && (
        <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {match.location}
        </p>
      )}
      {match.why && (
        <p className="mt-4 flex-1 text-body-md text-on-surface/80">{match.why}</p>
      )}
      {match.tag && (
        <div className="mt-5 flex items-center gap-2 border-t border-on-surface/10 pt-4">
          <span className="rounded-md bg-secondary-container/40 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-secondary-container">
            {match.tag}
          </span>
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
      whileHover={{ y: -3 }}
      className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/85 p-5 text-left backdrop-blur-md qc-hard-shadow transition-all hover:shadow-[6px_6px_0_0_var(--color-primary)]"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary-container text-on-primary-container">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">{title}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-on-surface text-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold">
            <Lock className="h-3 w-3" /> Coming soon
          </span>
        </div>
        <p className="mt-1.5 text-body-md text-on-surface-variant">{desc}</p>
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
