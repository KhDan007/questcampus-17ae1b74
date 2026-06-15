import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Award,
  GraduationCap,
  ArrowRight,
  PenLine,
  Mail,
  LogOut,
  UserCircle2,
  Compass,
  Bookmark,
} from "lucide-react";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { MyUniversitiesSection } from "@/components/profile/MyUniversitiesSection";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile — QuestCampus" }] }),
  component: ProfilePage,
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

const BUCKET_STYLES: Record<Bucket, { chip: string; icon: typeof Award }> = {
  Safety: { chip: "bg-[#bcf0ae] text-[#073707]", icon: GraduationCap },
  Target: { chip: "bg-[#c7d8f0] text-[#0d2240]", icon: Sparkles },
  Reach: { chip: "bg-[#f0c7e6] text-[#3a0e2e]", icon: Award },
};

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

function ProfilePage() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated } = useAuth();
  const [saved, setSaved] = useState<SavedPayload | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    return n ? n.split(/\s+/)[0] : null;
  }, [user]);

  const initials = useMemo(() => {
    const n = user?.name?.trim();
    if (n) {
      return n
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("");
    }
    const e = user?.email;
    return e ? e[0]?.toUpperCase() : "?";
  }, [user]);

  async function handleSignOut() {
    try {
      await auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        {/* Hero card */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/85 p-6 backdrop-blur-md qc-hard-shadow sm:p-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
              <div
                className="animate-aurora-1 absolute -left-20 -top-20 h-[40vh] w-[40vh] rounded-full blur-[110px]"
                style={{ background: "radial-gradient(circle, rgba(79,70,229,0.28), transparent 65%)" }}
              />
              <div
                className="animate-aurora-2 absolute -right-20 -bottom-20 h-[40vh] w-[40vh] rounded-full blur-[110px]"
                style={{ background: "radial-gradient(circle, rgba(254,183,0,0.22), transparent 65%)" }}
              />
            </div>

            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
                <span className="font-display text-display-md font-bold leading-none">
                  {initials || <UserCircle2 className="h-10 w-10" />}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                  Your profile
                </p>
                <h1 className="mt-1.5 text-display-md text-on-surface text-balance">
                  {firstName ? `${firstName}'s QuestCampus` : "Welcome to QuestCampus"}
                </h1>
                {user?.email && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface-variant">
                    <Mail className="h-3.5 w-3.5" /> {user.email}
                  </p>
                )}
                <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
                  Everything you've matched and built lives here. We'll keep adding tools as
                  they ship — waitlist members get 30% off for life.
                </p>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              )}
            </div>

            {/* Quick stats */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Saved matches"
                value={String(saved?.matches.length ?? 0)}
                tone="primary"
              />
              <Stat
                label="Account"
                value={isAuthenticated ? "Active" : "Guest"}
                tone="neutral"
              />
              <Stat label="Waitlist discount" value="30% off" tone="accent" />
            </div>
          </div>
        </motion.section>

        {/* Quick actions */}
        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <ActionCard
            to="/dashboard"
            Icon={Compass}
            title="Open dashboard"
            body="See your matched universities and explore the next steps in one place."
            cta="Go to dashboard"
          />
          <ActionCard
            to="/essay"
            Icon={PenLine}
            title="Write your personal statement"
            body="Generate a Common App essay grounded in what you've told us. First draft is free."
            cta="Start writing"
            accent
          />
        </section>

        {/* Saved matches */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-headline-lg font-bold text-on-surface">
                Saved university matches
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {saved
                  ? `From your quiz · ${saved.matches.length} match${saved.matches.length === 1 ? "" : "es"}`
                  : "Take the 60-second quiz to fill this in."}
              </p>
            </div>
            <Link
              to="/"
              className="hidden shrink-0 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:inline-flex"
            >
              {saved ? "Retake quiz" : "Take quiz"}
            </Link>
          </div>

          {saved && saved.matches.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.matches.map((m, i) => (
                <SavedMatchCard key={`${m.name}-${i}`} match={m} delay={i * 0.06} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
              <p className="text-body-lg text-on-surface-variant">
                No saved matches yet.
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

        <MyUniversitiesSection />


        {/* Upcoming */}
        <section className="mt-16">
          <h2 className="font-display text-headline-lg font-bold text-on-surface">
            Coming soon to your account
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Join the waitlist to lock in 30% off for life.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <UpcomingTile
              Icon={Bookmark}
              title="Bookmark & compare"
              body="Save your favourite schools side-by-side with deadlines and costs."
              onClick={() => setWaitlistOpen(true)}
            />
            <Link
              to={isAuthenticated ? "/onboarding" : "/signin"}
              search={isAuthenticated ? undefined : ({ redirect: "/onboarding" } as never)}
              className="group flex w-full items-start gap-4 rounded-2xl border-2 border-on-surface bg-primary p-5 text-left text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[5px_5px_0_0_var(--color-on-surface)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-white text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-headline-sm font-bold">Refined recommendations</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-primary">
                    Live
                  </span>
                </div>
                <p className="mt-1 text-body-md text-white/85">
                  Answer a few more questions and we'll re-rank your matches with much more precision.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {!isAuthenticated && (
          <p className="mt-10 text-center text-body-sm text-on-surface-variant">
            You're browsing as a guest.{" "}
            <a href="/signin?mode=signup" className="text-primary hover:underline">
              Create a free account
            </a>{" "}
            to keep this synced across devices.
          </p>
        )}
      </main>

      <WaitlistPopup
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        title="Coming soon"
        body="Join the waitlist and we'll email you the moment this is ready — 30% off for life locked in."
      />
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "neutral" | "accent";
}) {
  const bg =
    tone === "primary"
      ? "bg-primary text-white"
      : tone === "accent"
        ? "bg-secondary-container text-on-surface"
        : "bg-surface text-on-surface";
  return (
    <div className={`rounded-xl border-2 border-on-surface p-4 qc-hard-shadow-sm ${bg}`}>
      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-display text-headline-md font-bold">{value}</p>
    </div>
  );
}

function ActionCard({
  to,
  Icon,
  title,
  body,
  cta,
  accent,
}: {
  to: string;
  Icon: typeof Award;
  title: string;
  body: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group relative flex items-start gap-4 overflow-hidden rounded-2xl border-2 border-on-surface p-5 qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[3px_3px_0_0_var(--color-on-surface)] ${
        accent ? "bg-primary text-white" : "bg-surface text-on-surface"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-on-surface ${
          accent ? "bg-white text-primary" : "bg-secondary-container text-on-surface"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-headline-sm font-bold">{title}</h3>
        <p className={`mt-1 text-body-md ${accent ? "text-white/85" : "text-on-surface-variant"}`}>
          {body}
        </p>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md font-semibold ${
            accent ? "text-white" : "text-primary"
          }`}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function SavedMatchCard({ match, delay = 0 }: { match: SavedMatch; delay?: number }) {
  const style = BUCKET_STYLES[match.bucket] ?? BUCKET_STYLES.Target;
  const Icon = style.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow transition-shadow hover:shadow-[6px_6px_0_0_var(--color-primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-bold ${style.chip}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {match.bucket}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-headline-md font-bold text-primary">
            {match.match}
          </span>
          <span className="font-[var(--font-label)] text-label-md font-semibold text-primary/80">
            %
          </span>
        </div>
      </div>
      <h3 className="mt-3 font-display text-headline-sm font-bold text-on-surface">
        {match.name}
      </h3>
      <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        {match.location}
      </p>
      <p className="mt-3 flex-1 text-body-md text-on-surface/80">{match.why}</p>
    </motion.article>
  );
}

function UpcomingTile({
  Icon,
  title,
  body,
  onClick,
}: {
  Icon: typeof Award;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border-2 border-on-surface bg-surface/85 p-5 text-left backdrop-blur-md qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[5px_5px_0_0_var(--color-primary)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-secondary-container text-on-surface">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">{title}</h3>
          <span className="rounded-full bg-on-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-surface">
            Coming soon
          </span>
        </div>
        <p className="mt-1 text-body-md text-on-surface-variant">{body}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-on-surface/40 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
    </button>
  );
}
