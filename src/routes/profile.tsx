import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Award,
  ArrowRight,
  PenLine,
  Mail,
  LogOut,
  UserCircle2,
  Compass,
  Bookmark,
  Gift,
  Copy,
  Check,
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { MyUniversitiesSection } from "@/components/profile/MyUniversitiesSection";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";
import { WAITLIST_BASE_DISCOUNT } from "@/lib/config";
import { shareLinkFor } from "@/lib/referral/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile — QuestCampus" }] }),
  component: ProfilePage,
});

type RecRow = {
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  bucket?: "safety" | "target" | "reach";
};
type FreePayload = { plan: "free"; results: RecRow[] };
type PaidPayload = {
  plan: "paid";
  buckets?: { safety: RecRow[]; target: RecRow[]; reach: RecRow[] };
  results: RecRow[];
};

const BUCKET_LABEL: Record<NonNullable<RecRow["bucket"]>, { label: string; chip: string }> = {
  safety: { label: "Safety", chip: "bg-[#bcf0ae] text-[#073707]" },
  target: { label: "Target", chip: "bg-[#c7d8f0] text-[#0d2240]" },
  reach: { label: "Reach", chip: "bg-[#f0c7e6] text-[#3a0e2e]" },
};

function ProfilePage() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated, isAdmin, token } = useAuth();
  const { lang } = useI18n();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recs, setRecs] = useState<RecRow[] | null>(null);
  const [recStatus, setRecStatus] = useState<"idle" | "loading" | "ready" | "error" | "locked">(
    "idle",
  );

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const referrals = useQuery(api.referrals.summary, token ? { token } : "skip");

  const recommend = useAction(api.rag.recommend.recommend);
  const loadRecs = useCallback(async () => {
    if (!sessionId) return;
    setRecStatus("loading");
    try {
      // Try paid first if signed in; fall back to free.
      if (token) {
        const paid = (await recommend({ sessionId, token, plan: "paid", force: false, lang })) as
          | PaidPayload
          | { error: string; results: never[] };
        if (!("error" in paid)) {
          const all = paid.buckets
            ? [...paid.buckets.safety, ...paid.buckets.target, ...paid.buckets.reach]
            : paid.results;
          setRecs(all.slice(0, 20));
          setRecStatus("ready");
          return;
        }
      }
      const free = (await recommend({
        sessionId,
        token: token ?? undefined,
        plan: "free",
        force: false,
        lang,
      })) as FreePayload | { error: string; results: never[] };
      if ("error" in free) {
        setRecStatus("error");
        return;
      }
      setRecs(free.results.slice(0, 20));
      setRecStatus("ready");
    } catch {
      setRecStatus("error");
    }
  }, [recommend, sessionId, token, lang]);

  useEffect(() => {
    void loadRecs();
  }, [loadRecs]);
  void isAdmin;

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
      <DashboardShell>
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:px-12"
      >
        {/* Hero card */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/85 p-4 backdrop-blur-md qc-hard-shadow sm:p-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
              <div
                className="animate-aurora-1 absolute -left-20 -top-20 h-[40vh] w-[40vh] rounded-full blur-[110px]"
                style={{
                  background: "radial-gradient(circle, rgba(179,39,44,0.28), transparent 65%)",
                }}
              />
              <div
                className="animate-aurora-2 absolute -right-20 -bottom-20 h-[40vh] w-[40vh] rounded-full blur-[110px]"
                style={{
                  background: "radial-gradient(circle, rgba(254,183,0,0.22), transparent 65%)",
                }}
              />
            </div>

            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
                <span className="font-display text-display-md font-bold leading-none">
                  {initials || <UserCircle2 className="h-10 w-10" />}
                </span>
              </div>

              <div className="w-full min-w-0 flex-1">
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                  Your profile
                </p>
                <h1 className="mt-1.5 text-display-md text-on-surface text-balance">
                  {firstName ? `${firstName}'s QuestCampus` : "Welcome to QuestCampus"}
                </h1>
                {user?.email && (
                  <p className="mt-1.5 flex min-w-0 items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface-variant">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{user.email}</span>
                  </p>
                )}
                <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
                  Everything you've matched and built lives here. We'll keep adding tools as they
                  ship — waitlist members get {WAITLIST_BASE_DISCOUNT}% off monthly access.
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
            <div className="mt-5 sm:mt-8 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Your matches"
                value={String(recs?.length ?? 0)}
                tone="primary"
              />
              <Stat label="Account" value={isAuthenticated ? "Active" : "Guest"} tone="neutral" />
              <Stat
                label="Your discount"
                value={
                  token
                    ? referrals
                      ? `${referrals.discountPercent}% off`
                      : "…"
                    : `${WAITLIST_BASE_DISCOUNT}% off`
                }
                tone="accent"
              />
            </div>
          </div>
        </motion.section>

        {token && referrals && referrals.referralCode && (
          <SilentErrorBoundary>
            <ReferralCard referrals={referrals} />
          </SilentErrorBoundary>
        )}

        {/* Quick actions */}
        <section className="mt-8 sm:mt-12 grid gap-4 sm:gap-5 lg:grid-cols-2">
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

        {/* Your matches — names-only list */}
        <section className="mt-10 sm:mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-headline-lg font-bold text-on-surface">
                Your university matches
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {recs && recs.length > 0
                  ? `${recs.length} matches · open the full list for details`
                  : "Run the quiz to generate your matches."}
              </p>
            </div>
            <Link
              to="/universities"
              search={{ q: "" }}
              className="hidden shrink-0 items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none sm:inline-flex"
            >
              See full list <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recStatus === "loading" && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg border-2 border-on-surface/10 bg-surface/60"
                />
              ))}
            </div>
          )}

          {recStatus === "ready" && recs && recs.length > 0 && (
            <ol className="mt-6 grid gap-2 sm:grid-cols-2">
              {recs.map((r, i) => {
                const loc = [r.city, r.state, r.country].filter(Boolean).join(", ");
                const bucket = r.bucket ? BUCKET_LABEL[r.bucket] : null;
                return (
                  <li
                    key={r.externalId}
                    className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border-2 border-on-surface bg-surface/85 px-3 py-2.5 qc-hard-shadow-sm"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 font-[var(--font-label)] text-label-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-label-lg font-semibold text-on-surface">
                        {r.name}
                      </p>
                      {loc && (
                        <p className="truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
                          {loc}
                        </p>
                      )}
                    </div>
                    {bucket && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 font-[var(--font-label)] text-label-sm font-bold ${bucket.chip}`}
                      >
                        {bucket.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {(recStatus === "error" || (recStatus === "ready" && (!recs || recs.length === 0))) && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
              <p className="text-body-lg text-on-surface-variant">
                {recStatus === "error"
                  ? "Couldn't load your matches — try again."
                  : "No matches yet."}
              </p>
              <Link
                to="/universities"
                search={{ q: "" }}
                className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-2.5 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                Open universities <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <SilentErrorBoundary>
          <MyUniversitiesSection />
        </SilentErrorBoundary>

        {/* Upcoming */}
        <section className="mt-10 sm:mt-16">
          <h2 className="font-display text-headline-lg font-bold text-on-surface">
            Coming soon to your account
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Join the waitlist to lock in {WAITLIST_BASE_DISCOUNT}% off monthly access.
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
                  <h3 className="font-display text-headline-sm font-bold">
                    Refined recommendations
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-primary">
                    Live
                  </span>
                </div>
                <p className="mt-1 text-body-md text-white/85">
                  Answer a few more questions and we'll re-rank your matches with much more
                  precision.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {!isAuthenticated && (
          <p className="mt-6 sm:mt-10 text-center text-body-sm text-on-surface-variant">
            You're browsing as a guest.{" "}
            <a href="/signin?mode=signup" className="text-primary hover:underline">
              Create a free account
            </a>{" "}
            to keep this synced across devices.
          </p>
        )}
      </main>
      </DashboardShell>

      <WaitlistPopup
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        title="Coming soon"
        body={`Join the waitlist and we'll email you the moment this is ready — ${WAITLIST_BASE_DISCOUNT}% off monthly access locked in.`}
      />
    </>
  );
}

type ReferralSummary = {
  referralCode: string | null;
  referredBy: boolean;
  counts: { total: number; qualified: number; pending: number };
  discountPercent: number;
  perReferralPercent: number;
  maxPercent: number;
};

function ReferralCard({ referrals }: { referrals: ReferralSummary }) {
  const [copied, setCopied] = useState(false);
  const link = shareLinkFor(referrals.referralCode);
  const pct = Math.min(referrals.discountPercent, referrals.maxPercent);
  const { qualified, pending } = referrals.counts;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 font-display text-headline-sm font-bold text-on-surface">
            <Gift className="h-4 w-4 text-primary" /> Invite friends
          </h2>
          <p className="mt-1 max-w-xl text-body-sm text-on-surface-variant">
            They get {referrals.perReferralPercent}% off when they join with your link. You get
            +{referrals.perReferralPercent}% off for every friend who finishes onboarding, up to{" "}
            {referrals.maxPercent}%.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-on-surface/25 bg-secondary-container px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
          {pct}% / {referrals.maxPercent}%
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border-2 border-on-surface/20 bg-surface-container-lowest px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface" title={link}>
            {link}
          </span>
          <span className="shrink-0 rounded-full bg-on-surface/10 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
            {referrals.referralCode}
          </span>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      {(qualified > 0 || pending > 0) && (
        <p className="mt-3 text-label-sm text-on-surface-variant">
          {qualified > 0 &&
            `${qualified} friend${qualified === 1 ? "" : "s"} joined and qualified.`}
          {qualified > 0 && pending > 0 && " "}
          {pending > 0 &&
            `${pending} more signed up, waiting on onboarding to qualify.`}
        </p>
      )}
    </section>
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
