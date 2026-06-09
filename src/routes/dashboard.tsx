import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Award,
  GraduationCap,
  ArrowRight,
  X,
  PenLine,
  CalendarClock,
  Send,
  TrendingUp,
  Mail,
  Lock,
  Compass,
} from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { NavV2 } from "@/components/landing2/NavV2";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — QuestCampus" }] }),
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
};
type SavedPayload = { matches: SavedMatch[]; at: number };

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

function DashboardPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [saved, setSaved] = useState<SavedPayload | null>(null);
  const [modal, setModal] = useState<null | { title: string }>(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    return n ? n.split(/\s+/)[0] : null;
  }, [user]);

  return (
    <>
      <LivingBackground />
      <NavV2 />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
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
            Your matches from the quiz are saved here. Everything else is on the way —
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
              <button
                type="button"
                onClick={() => setModal({ title: "Detailed onboarding" })}
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                Refine now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
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
                {saved
                  ? `Saved from your quiz · ${saved.matches.length} match${saved.matches.length === 1 ? "" : "es"}`
                  : "We'll save your quiz matches here automatically."}
              </p>
            </div>
            {!saved && (
              <Link
                to="/"
                className="hidden shrink-0 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:inline-flex"
              >
                Take the quiz
              </Link>
            )}
          </div>

          {saved && saved.matches.length > 0 ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {saved.matches.map((m, i) => (
                <MatchCard key={`${m.name}-${i}`} match={m} delay={i * 0.08} />
              ))}
            </div>
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

function MatchCard({ match, delay = 0 }: { match: SavedMatch; delay?: number }) {
  const style = BUCKET_STYLES[match.bucket] ?? BUCKET_STYLES.Target;
  const Icon = style.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
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
      <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        {match.location}
      </p>
      <p className="mt-4 flex-1 text-body-md text-on-surface/80">{match.why}</p>
      <div className="mt-5 flex items-center gap-2 border-t border-on-surface/10 pt-4">
        <span className="rounded-md bg-secondary-container/40 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-secondary-container">
          {match.tag}
        </span>
      </div>
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

function ComingSoonModal({
  title,
  onClose,
  onJoin,
}: {
  title: string;
  onClose: () => void;
  onJoin: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cs-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[380px] rounded-2xl border-2 border-on-surface bg-surface p-6 qc-hard-shadow"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/10 hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white">
          <Mail className="h-5 w-5" />
        </div>
        <h3 id="cs-title" className="mt-4 font-display text-headline-sm font-bold text-on-surface">
          {title} — coming soon
        </h3>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Join the waitlist to be first in line and lock in 30% off for life.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border-2 border-on-surface bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onJoin}
            className="flex-1 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-display text-label-md font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Join waitlist
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Silence unused export warnings.
