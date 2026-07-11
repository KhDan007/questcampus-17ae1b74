import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  PenLine,
  Mail,
  LogOut,
  UserCircle2,
  Compass,
  Gift,
  Copy,
  Check,
  GraduationCap,
  Bookmark,
  Pencil,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { WaitlistPopup } from "@/components/landing2/WaitlistPopup";
import { MyUniversitiesSection } from "@/components/profile/MyUniversitiesSection";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  Tabs,
  IconTile,
  Chip,
  PrimaryButton,
  EmptyState,
  cx,
} from "@/components/ui/calm";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";
import {
  readChatPageContextEnabled,
  writeChatPageContextEnabled,
} from "@/lib/chat/pageContext";
import { getSessionId } from "@/lib/onboarding/session";
import { useProgress, nextStep } from "@/lib/progress";
import { useSavedUniversities } from "@/lib/universities/savedClient";
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

const BUCKET_CHIP: Record<NonNullable<RecRow["bucket"]>, { label: string; tone: "green" | "amber" | "coral" }> = {
  safety: { label: "Safety", tone: "green" },
  target: { label: "Target", tone: "amber" },
  reach: { label: "Reach", tone: "coral" },
};

type TabKey = "matches" | "universities" | "invite" | "settings";

function ProfilePage() {
  const { user, isAuthenticated, token } = useAuth();
  const { lang } = useI18n();
  const progress = useProgress();
  const { saved } = useSavedUniversities();
  const savedCount = saved?.length ?? 0;

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recs, setRecs] = useState<RecRow[] | null>(null);
  const [pageContextEnabled, setPageContextEnabled] = useState(false);
  const [recStatus, setRecStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tab, setTab] = useState<TabKey>("matches");

  useEffect(() => {
    setSessionId(getSessionId());
    setPageContextEnabled(readChatPageContextEnabled());
  }, []);

  const referrals = useQuery(api.referrals.summary, token ? { token } : "skip");

  const recommend = useAction(api.rag.recommend.recommend);
  const loadRecs = useCallback(async () => {
    if (!sessionId) return;
    setRecStatus("loading");
    try {
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

  function setAssistantPageContext(enabled: boolean) {
    setPageContextEnabled(enabled);
    writeChatPageContextEnabled(enabled);
    toast.message(enabled ? "Assistant page context on" : "Assistant page context off");
  }

  // Activation checklist — every item is derivable from state we already have.
  const step = nextStep(progress);
  const refined = step !== "refine";
  const drafted = step === "review" || step === "done";
  const invited = (referrals?.counts?.total ?? 0) > 0;
  const hasMatches = (recs?.length ?? 0) > 0;

  const completion = [
    { key: "account", label: "Create your account", done: isAuthenticated, weight: 10, to: "/signin" },
    { key: "quiz", label: "Complete the matching quiz", done: hasMatches, weight: 20, to: "/onboarding" },
    { key: "refine", label: "Refine your recommendations", done: refined, weight: 20, to: "/onboarding" },
    { key: "save", label: "Save 3+ universities", done: savedCount >= 3, weight: 15, to: "/universities" },
    { key: "essay", label: "Draft a personal statement", done: drafted, weight: 20, to: "/essay" },
    { key: "invite", label: "Invite a friend", done: invited, weight: 15, to: "/profile" },
  ];
  const percent = completion.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
  const nextIncomplete = completion.find((c) => !c.done);

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "matches", label: "Matches", count: recs?.length ?? 0 },
    { key: "universities", label: "My universities", count: savedCount },
    ...(token ? [{ key: "invite" as const, label: "Invite" }] : []),
    { key: "settings", label: "Settings" },
  ];

  return (
    <>
      <DashboardShell>
        <main
          id="main-content"
          className="mx-auto w-full max-w-(--container-content) px-4 pb-16 pt-20 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Identity + tabs */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              <Card className="px-4 py-8 sm:px-8">
                <div className="flex flex-col items-center text-center">
                  <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : initials ? (
                      <span className="font-display text-headline-lg font-bold leading-none">{initials}</span>
                    ) : (
                      <UserCircle2 className="h-10 w-10" />
                    )}
                  </span>
                  <h1 className="mt-4 font-display text-headline-lg font-bold text-on-surface">
                    {user?.name || (firstName ? firstName : "Welcome to QuestCampus")}
                  </h1>
                  {user?.email && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="max-w-full truncate">{user.email}</span>
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Chip tone={user?.paid ? "amber" : "muted"}>
                      {user?.paid ? "Full access" : "Free plan"}
                    </Chip>
                    <Chip tone="coral">
                      <GraduationCap className="h-3.5 w-3.5" /> {recs?.length ?? 0} matches
                    </Chip>
                    <Chip tone="green">
                      <Bookmark className="h-3.5 w-3.5" /> {savedCount} saved
                    </Chip>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <Link
                      to="/onboarding"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                    >
                      <Pencil className="h-4 w-4" /> Edit profile
                    </Link>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    )}
                  </div>
                </div>

                <Tabs
                  className="mt-8"
                  tabs={tabs}
                  value={tab}
                  onChange={(k) => setTab(k)}
                />

                <div className="mt-6">
                  {tab === "matches" && (
                    <MatchesTab recStatus={recStatus} recs={recs} />
                  )}
                  {tab === "universities" && (
                    <SilentErrorBoundary>
                      <MyUniversitiesSection />
                    </SilentErrorBoundary>
                  )}
                  {tab === "invite" && token && referrals && referrals.referralCode && (
                    <SilentErrorBoundary>
                      <ReferralPanel referrals={referrals} />
                    </SilentErrorBoundary>
                  )}
                  {tab === "invite" && token && !(referrals && referrals.referralCode) && (
                    <p className="text-body-sm text-on-surface-variant">Loading your invite link…</p>
                  )}
                  {tab === "settings" && (
                    <AssistantSettingsPanel
                      pageContextEnabled={pageContextEnabled}
                      onPageContextChange={setAssistantPageContext}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* Completion + quick actions */}
            <aside className="flex flex-col gap-6 lg:col-span-4">
              <CompletionCard
                percent={percent}
                items={completion}
                nextLabel={nextIncomplete?.label}
                nextTo={nextIncomplete?.to}
              />

              <Card className="p-4 sm:p-5">
                <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
                  Quick actions
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <QuickAction to="/dashboard" icon={Compass} tone="coral" title="Open dashboard" desc="Your next steps in one place." />
                  <QuickAction to="/essay" icon={PenLine} tone="amber" title="Write your essay" desc="First draft is free." />
                  <QuickAction to="/universities" icon={GraduationCap} tone="green" title="Browse universities" desc="Search 11,000+ schools." />
                </div>
              </Card>

              {!isAuthenticated && (
                <Card className="p-4 sm:p-5">
                  <h2 className="font-display text-headline-sm font-bold text-on-surface">Save your work</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Create a free account to keep this synced across devices.
                  </p>
                  <Link
                    to="/signin"
                    search={{ mode: "signup" } as never}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
                  >
                    Create account <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              )}
            </aside>
          </div>
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

function MatchesTab({
  recStatus,
  recs,
}: {
  recStatus: "idle" | "loading" | "ready" | "error";
  recs: RecRow[] | null;
}) {
  if (recStatus === "loading") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl border border-on-surface/8 bg-surface-container" />
        ))}
      </div>
    );
  }
  if (recStatus === "error" || !recs || recs.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={recStatus === "error" ? "Couldn't load your matches" : "No matches yet"}
        body="Run the 60-second quiz to generate your university matches."
        action={
          <Link
            to="/universities"
            search={{ q: "" }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
          >
            Open universities <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    );
  }
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-body-sm text-on-surface-variant">{recs.length} matches</p>
        <Link
          to="/universities"
          search={{ q: "" }}
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
        >
          See full list <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {recs.map((r, i) => {
          const loc = [r.city, r.state, r.country].filter(Boolean).join(", ");
          const bucket = r.bucket ? BUCKET_CHIP[r.bucket] : null;
          return (
            <li
              key={r.externalId}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-3 py-2.5 qc-soft-shadow"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary-fixed font-[var(--font-label)] text-label-sm font-bold tabular-nums text-on-primary-fixed-variant">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  {r.name}
                </p>
                {loc && <p className="truncate text-label-sm text-on-surface-variant">{loc}</p>}
              </div>
              {bucket && <Chip tone={bucket.tone}>{bucket.label}</Chip>}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function CompletionCard({
  percent,
  items,
  nextLabel,
  nextTo,
}: {
  percent: number;
  items: Array<{ key: string; label: string; done: boolean; to: string }>;
  nextLabel?: string;
  nextTo?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 border-b border-on-surface/8 bg-primary-fixed/40 p-4 sm:p-5">
        <CompletionRing percent={percent} />
        <div className="min-w-0">
          <p className="font-display text-headline-md font-bold text-on-surface tabular-nums">{percent}%</p>
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            Profile complete
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.key}>
              <Link
                to={c.to as never}
                className={cx(
                  "group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors",
                  c.done ? "" : "hover:bg-on-surface/[0.03]",
                )}
              >
                {c.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-on-surface/30" />
                )}
                <span
                  className={cx(
                    "text-body-sm",
                    c.done ? "text-on-surface-variant/60 line-through" : "text-on-surface",
                  )}
                >
                  {c.label}
                </span>
                {!c.done && (
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-on-surface/20 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </Link>
            </li>
          ))}
        </ul>
        {nextLabel && nextTo && (
          <Link
            to={nextTo as never}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
          >
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </Card>
  );
}

function CompletionRing({ percent }: { percent: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-on-surface)" strokeOpacity="0.1" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

function QuickAction({
  to,
  icon,
  tone,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "coral" | "amber" | "green";
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to as never}
      className="group -mx-1.5 flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-on-surface/[0.03]"
    >
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">{title}</p>
        <p className="truncate text-label-sm text-on-surface-variant">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/30 transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
    </Link>
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

function AssistantSettingsPanel({
  pageContextEnabled,
  onPageContextChange,
}: {
  pageContextEnabled: boolean;
  onPageContextChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-on-surface/8 bg-surface-container/50 p-4">
        <h3 className="inline-flex items-center gap-2 font-display text-headline-sm font-bold text-on-surface">
          <Sparkles className="h-4 w-4 text-primary" /> Assistant
        </h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Current-page context is off by default. When off, the assistant only sees the page you're
          on if your message points at something on screen.
        </p>
        <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-on-surface/10 bg-surface-container-lowest px-3 py-2.5">
          <span className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
            Always send page context
          </span>
          <Switch
            checked={pageContextEnabled}
            onCheckedChange={onPageContextChange}
            aria-label="Always send current page context to the assistant"
          />
        </label>
      </div>
    </div>
  );
}

function ReferralPanel({ referrals }: { referrals: ReferralSummary }) {
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="inline-flex items-center gap-2 font-display text-headline-sm font-bold text-on-surface">
            <Gift className="h-4 w-4 text-primary" /> Invite friends
          </h3>
          <p className="mt-1 max-w-xl text-body-sm text-on-surface-variant">
            They get {referrals.perReferralPercent}% off when they join with your link. You get +
            {referrals.perReferralPercent}% off for every friend who finishes onboarding, up to{" "}
            {referrals.maxPercent}%.
          </p>
        </div>
        <Chip tone="amber">{pct}% / {referrals.maxPercent}%</Chip>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-on-surface/10 bg-surface-container/50 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface" title={link}>
            {link}
          </span>
          <span className="shrink-0 rounded-full bg-on-surface/8 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">
            {referrals.referralCode}
          </span>
        </div>
        <PrimaryButton onClick={copyLink} className="shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </PrimaryButton>
      </div>

      {(qualified > 0 || pending > 0) && (
        <p className="text-label-sm text-on-surface-variant">
          {qualified > 0 && `${qualified} friend${qualified === 1 ? "" : "s"} joined and qualified.`}
          {qualified > 0 && pending > 0 && " "}
          {pending > 0 && `${pending} more signed up, waiting on onboarding to qualify.`}
        </p>
      )}
    </div>
  );
}
