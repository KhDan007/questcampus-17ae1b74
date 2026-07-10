import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  Send,
  ListChecks,
  Hourglass,
  Info,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LiveCanvas } from "@/components/apply/LiveCanvas";
import { RunStepper } from "@/components/apply/RunStepper";
import { PortalChapterRail } from "@/components/apply/demo/PortalChapterRail";
import { DemoTicker } from "@/components/apply/demo/DemoTicker";
import { DemoSummaryCard } from "@/components/apply/demo/DemoSummaryCard";
import { useAuth } from "@/lib/auth/useAuth";
import { useApplyActions, useApplyJob, type ApplyJobCheckpoint } from "@/lib/applyQueue/client";

export const Route = createFileRoute("/apply/$jobId")({
  head: () => ({
    meta: [{ title: "Live application — QuestCampus" }],
  }),
  component: ApplyRunPage,
});

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  claimed: "Starting browser",
  awaiting_login: "Waiting for you to log in",
  filling: "Filling the application",
  awaiting_submit: "Ready for your review",
  done: "Submitted",
  cancelled: "Cancelled",
  error: "Something went wrong",
};

function didReachReview(checkpoint?: ApplyJobCheckpoint | null): boolean {
  if (checkpoint?.kind !== "submit") return true;
  const payload = checkpoint.payload as { reachedReview?: boolean } | undefined;
  return payload?.reachedReview !== false;
}

function activityText(text: string, awaitingPortalAction: boolean): string {
  if (!awaitingPortalAction) return text;
  if (/\b(submitted|submission|all done|done)\b/i.test(text)) {
    return "Waiting for you to log in or reach the portal review step.";
  }
  return text;
}

function stageGuidance(
  status: string,
  isDemo: boolean,
  checkpoint?: ApplyJobCheckpoint | null,
): string {
  switch (status) {
    case "queued":
      return "Waiting for a worker to pick this up. Nothing for you to do yet.";
    case "claimed":
      return "Opening a live browser…";
    case "awaiting_login":
      return isDemo
        ? "This is a demo — there's no login. Click Continue below to watch it fill."
        : 'Create an account in this university portal, or log in if you already have one, in the live browser. Once you are past the portal login screen, click "I\'m in".';
    case "filling":
      return (
        "We're filling the form in the live browser — just watch. You don't need to do anything; you'll review everything before ANY submit." +
        (isDemo ? " (Demo — nothing is ever submitted.)" : "")
      );
    case "awaiting_submit":
      if (!didReachReview(checkpoint)) {
        return "The portal still needs your action. Use the live browser to create an account or log in, then continue through the university portal until you reach its review/submit step.";
      }
      return isDemo
        ? 'The form is filled. Look it over in the live browser, then click "I\'ve submitted" — this is a demo, so nothing is actually sent.'
        : 'The form is filled. Review it in the live browser, submit it in the portal, then click "I\'ve submitted".';
    case "done":
      return "All done.";
    case "error":
      return 'Something went wrong. Use "Try again" below.';
    case "cancelled":
      return "This run was stopped.";
    default:
      return "";
  }
}

function ApplyRunPage() {
  const { jobId } = Route.useParams();
  const { isAuthenticated, token, isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <DashboardShell>
        <LivingBackground />
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-(--container-content) px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12"
        >
          <div className="inline-flex items-center gap-2 rounded-md border-2 border-on-surface/15 bg-surface/80 px-4 py-2 text-body-sm text-on-surface-variant backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading live application...
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !token)
    return <Navigate to="/signin" search={{ redirect: `/apply/${jobId}` } as never} />;

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:px-12"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Auto-Apply
        </Link>
        <RunBody jobId={jobId} token={token} />
      </main>
    </DashboardShell>
  );
}

function RunBody({ jobId, token }: { jobId: string; token: string }) {
  const job = useApplyJob(jobId);
  const navigate = useNavigate();
  const convex = useConvex();
  const { cancelJob, confirm, startApply } = useApplyActions();
  const [acting, setActing] = useState(false);
  const [liveTicket, setLiveTicket] = useState<{ wsUrl: string; ticket: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [dismissedCheckpointKey, setDismissedCheckpointKey] = useState<string | null>(null);
  const hasUnresolvedCheckpoint = !!job?.checkpoint && !demoCompleted;
  const terminal =
    demoCompleted ||
    (!!job &&
      !hasUnresolvedCheckpoint &&
      (job.status === "done" || job.status === "cancelled" || job.status === "error"));

  const fetchTicket = useCallback(async () => {
    if (!job?.wsEndpoint || terminal) return;
    try {
      const t = (await convex.query(api.applyQueue.liveTicket, { token, jobId })) as
        | { wsUrl: string; ticket: string }
        | null;
      setLiveTicket(t ?? null);
    } catch (e) {
      console.warn("liveTicket fetch failed", e);
    }
  }, [convex, jobId, token, job?.wsEndpoint, terminal]);

  // Fetch ticket once wsEndpoint appears.
  useEffect(() => {
    if (job?.wsEndpoint && !terminal && !liveTicket) void fetchTicket();
  }, [job?.wsEndpoint, terminal, liveTicket, fetchTicket]);

  // Terminal → drop the ticket so the canvas force-disconnects.
  useEffect(() => {
    if (terminal) setLiveTicket(null);
  }, [terminal]);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  const onCanvasClose = useCallback(
    (code: number) => {
      // 1006 = abnormal, 1008 = policy (ticket expired). Re-fetch with backoff.
      if (terminal) return;
      if (code !== 1006 && code !== 1008) return;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      setLiveTicket(null);
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        if (!terminal) void fetchTicket();
      }, 1500);
    },
    [fetchTicket, terminal],
  );

  // Auto-scroll activity feed
  const feedRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [job?.activity?.length]);

  const percent = Math.max(0, Math.min(100, job?.progress?.percent ?? 0));

  if (job === undefined) {
    return (
      <div className="mt-10 flex items-center gap-2 text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading application…
      </div>
    );
  }
  if (job === null) {
    return (
      <div className="mt-10 rounded-2xl border-2 border-on-surface bg-surface p-6 qc-hard-shadow-sm">
        <p className="font-display text-headline-sm font-bold text-on-surface">
          Application not found
        </p>
        <p className="mt-1 text-body-md text-on-surface-variant">
          This job may have been cancelled or expired.
        </p>
      </div>
    );
  }

  // `terminal` is already computed above from the RunBody hook block.
  // Multi-portal cinematic demo: keyed off the new contract (system/demo object).
  const isMultiPortalDemo = job.system === "demo" || !!job.demo;
  const isDemo = job.targetName === "Demo test run" || isMultiPortalDemo;
  const visibleStatus =
    job.checkpoint?.kind === "login"
      ? "awaiting_login"
      : job.checkpoint?.kind === "submit" && job.status === "done"
        ? "awaiting_submit"
        : job.status;
  const checkpointKey = job.checkpoint ? `${jobId}:${job.checkpoint.kind}` : null;
  const checkpointDismissed = !!checkpointKey && dismissedCheckpointKey === checkpointKey;
  const submitNeedsPortalAction = job.checkpoint?.kind === "submit" && !didReachReview(job.checkpoint);
  const statusLabel = submitNeedsPortalAction
    ? "Waiting for portal login/review"
    : STATUS_LABEL[visibleStatus] ?? visibleStatus;

  return (
    <>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Live application
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 font-display text-display-md text-on-surface">
            <span>{job.targetName ?? job.externalId ?? "Application"}</span>
            {job.targetName === "Demo test run" && (
              <span className="rounded-md border-2 border-on-surface bg-surface px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wide text-on-surface">
                Demo — nothing is submitted
              </span>
            )}
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {statusLabel}
            {job.progress?.message ? ` · ${job.progress.message}` : ""}
          </p>
        </div>
        {!terminal && (
          <button
            type="button"
            disabled={acting}
            onClick={async () => {
              if (!window.confirm("Cancel this application?")) return;
              setActing(true);
              try {
                await cancelJob(jobId);
                void navigate({ to: "/apply" });
              } finally {
                setActing(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <XCircle className="h-4 w-4" /> Cancel
          </button>
        )}
      </header>

      {/* Phased stepper */}
      <div className="mt-5">
        <RunStepper status={visibleStatus} />
      </div>

      {/* Stage guidance */}
      <div className="mt-4 rounded-xl border-2 border-on-surface/20 bg-surface p-3 qc-hard-shadow-sm">
        <p className="flex items-start gap-2 text-body-sm text-on-surface">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{stageGuidance(visibleStatus, isDemo, job.checkpoint)}</span>
        </p>
      </div>

      {job.checkpoint && !demoCompleted && checkpointDismissed && (
        <CheckpointNudge
          checkpoint={job.checkpoint}
          onOpen={() => setDismissedCheckpointKey(null)}
          needsPortalAction={submitNeedsPortalAction}
        />
      )}

      {/* Slim percent bar (only when there's real progress) */}
      {percent > 0 && (
        <>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface-container-lowest">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {job.progress?.stage ?? "Working"} · {percent}%
          </p>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
        {/* Live canvas / waiting state */}
        <div className="min-w-0">
          {/* Demo: portal chapter rail above the stage */}
          {isMultiPortalDemo && job.demo?.portals?.length ? (
            <PortalChapterRail portals={job.demo.portals} />
          ) : null}

          {job.wsEndpoint ? (
            <>
              <LiveCanvas
                wsEndpoint={job.wsEndpoint}
                ticket={liveTicket?.ticket}
                interactive={!terminal}
                disconnect={terminal}
                onClose={onCanvasClose}
              />
              {isMultiPortalDemo ? (
                <>
                  <DemoTicker field={job.demo?.currentField} />
                  <p className="mt-2 text-label-sm text-on-surface-variant">
                    Watch your saved answers fill across each portal. Nothing is ever submitted.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-label-sm text-on-surface-variant">
                  This is the agent&apos;s real browser. Click and type here to log in, solve
                  captchas, or take over at any time.
                </p>
              )}
            </>
          ) : (
            <QueuedWaitingCard createdAt={job.createdAt} />
          )}
        </div>

        {/* Activity feed */}
        <aside className="rounded-2xl border-2 border-on-surface bg-surface/90 p-4 backdrop-blur-md qc-hard-shadow-sm">
          <h2 className="flex items-center gap-1.5 font-display text-headline-sm font-bold text-on-surface">
            <ListChecks className="h-4 w-4 text-primary" /> Activity
            {!terminal && (
              <span className="ml-1 inline-flex items-center gap-1 text-label-sm font-normal text-on-surface-variant">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                live
              </span>
            )}
          </h2>
          <ol
            ref={feedRef}
            className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1 text-body-sm"
          >
            {(job.activity ?? []).length === 0 ? (
              <li className="text-on-surface-variant">Waiting for the agent…</li>
            ) : (
              (job.activity ?? []).map((a, i) => (
                <li
                  key={`${a.ts}-${i}`}
                  className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${
                    a.type === "unmatched"
                      ? "bg-tertiary-container/40 text-on-surface"
                      : a.type === "review"
                        ? "font-medium text-on-surface"
                        : "text-on-surface"
                  }`}
                >
                  <span className="mt-0.5 text-label-sm tabular-nums text-on-surface-variant">
                    {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    {activityText(a.text, submitNeedsPortalAction)}
                  </span>
                </li>
              ))
            )}
          </ol>
        </aside>
      </div>

      {/* Terminal banners */}
      {isMultiPortalDemo && job.demo && terminal ? (
        <DemoSummaryCard demo={job.demo} />
      ) : (
        ((job.status === "done" && !job.checkpoint) || demoCompleted) && (
          <Banner
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={demoCompleted ? "Demo complete" : "Application submitted"}
            body={
              demoCompleted
                ? "Nice — that's the full auto-apply flow. Nothing was actually sent."
                : "Nice work. You can close this page."
            }
          />
        )
      )}
      {job.status === "error" && (
        <div className="mt-6 space-y-3">
          <Banner
            tone="error"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="The agent hit a problem"
            body={job.error ?? "Something went wrong. Try again."}
          />
          <button
            type="button"
            disabled={retrying}
            onClick={async () => {
              if (!job.system || !job.externalId) return;
              setRetrying(true);
              try {
                const res = await startApply({
                  system: job.system,
                  externalId: job.externalId,
                  targetName: job.targetName,
                });
                void navigate({
                  to: "/apply/$jobId",
                  params: { jobId: res.jobId },
                  replace: true,
                });
              } catch (e) {
                console.warn("retry failed", e);
              } finally {
                setRetrying(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
          >
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Try again
          </button>
        </div>
      )}
      {job.status === "cancelled" && (
        <Banner
          tone="neutral"
          icon={<XCircle className="h-5 w-5" />}
          title="Cancelled"
          body="This application was stopped."
        />
      )}

      {/* Checkpoint modals */}
      {job.checkpoint && !demoCompleted && !checkpointDismissed && (
        <CheckpointModal
          checkpoint={job.checkpoint}
          onConfirm={async (kind, value) => {
            setActing(true);
            try {
              await confirm(jobId, kind, value);
              // Demo has no real backend worker to advance the job past
              // the submit checkpoint — mark it complete locally so the
              // modal closes and the success banner appears.
              if (isDemo && kind === "submitted") {
                setDemoCompleted(true);
              } else if (checkpointKey) {
                setDismissedCheckpointKey(checkpointKey);
              }
            } catch (e) {
              console.warn("confirm failed", e);
            } finally {
              setActing(false);
            }
          }}
          onClose={() => {
            if (checkpointKey) setDismissedCheckpointKey(checkpointKey);
          }}
          busy={acting}
          isDemo={isDemo}
        />
      )}
    </>
  );
}

function CheckpointNudge({
  checkpoint,
  onOpen,
  needsPortalAction,
}: {
  checkpoint: ApplyJobCheckpoint;
  onOpen: () => void;
  needsPortalAction: boolean;
}) {
  const isLogin = checkpoint.kind === "login";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-on-surface bg-surface p-3 qc-hard-shadow-sm">
      <p className="min-w-0 flex-1 text-body-sm text-on-surface">
        {isLogin || needsPortalAction
          ? "Use the live browser to create an account for this university portal, or log in if you already have one."
          : "Review the filled portal page in the live browser before confirming anything was submitted."}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        <Info className="h-4 w-4" /> Instructions
      </button>
    </div>
  );
}

function QueuedWaitingCard({ createdAt }: { createdAt?: number }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const start = createdAt ?? now;
  const elapsedSec = Math.max(0, Math.floor((now - start) / 1000));
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-on-surface bg-surface qc-hard-shadow">
      <div
        aria-hidden
        className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_20%,rgba(0,0,0,0.04)_50%,transparent_80%)]"
      />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-on-surface bg-surface qc-hard-shadow-sm">
          <Hourglass className="h-5 w-5 animate-pulse text-primary" />
        </span>
        <p className="font-display text-headline-sm font-bold text-on-surface">
          Waiting for a worker to pick this up…
        </p>
        <p className="font-[var(--font-label)] text-label-md tabular-nums text-on-surface-variant">
          Elapsed {mm}:{ss}
        </p>
        <p className="max-w-md text-body-sm text-on-surface-variant">
          Your test form will open here and fill itself — nothing is submitted.
        </p>
      </div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "success" | "error" | "neutral";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const cls =
    tone === "success"
      ? "border-tertiary bg-tertiary-container/40 text-on-surface"
      : tone === "error"
        ? "border-error bg-error-container/40 text-on-error-container"
        : "border-on-surface bg-surface text-on-surface";
  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-2xl border-2 p-4 qc-hard-shadow-sm ${cls}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-display text-label-lg font-bold">{title}</p>
        <p className="text-body-sm">{body}</p>
      </div>
    </div>
  );
}

function CheckpointModal({
  checkpoint,
  onConfirm,
  onClose,
  busy,
  isDemo,
}: {
  checkpoint: ApplyJobCheckpoint;
  onConfirm: (kind: string, value?: unknown) => Promise<void>;
  onClose: () => void;
  busy: boolean;
  isDemo: boolean;
}) {
  if (!checkpoint) return null;

  if (checkpoint.kind === "login") {
    return (
      <Modal
        title={isDemo ? "Demo — no login needed" : "Create an account or log in"}
        icon={<LogIn className="h-5 w-5 text-primary" />}
        onClose={onClose}
      >
        <p className="text-body-md text-on-surface-variant">
          {isDemo
            ? "This is a live demo on a test form, so there's nothing to log into. Click Continue to watch auto-apply fill it in."
            : "Use the university portal in the live browser. If you do not already have an account for this university, choose Sign up or Create account there. If you do, log in there. QuestCampus never sees your password. Once the portal is past login, click below."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("logged_in")}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {isDemo ? "Continue" : "I'm in"}
          </button>
        </div>
      </Modal>
    );
  }

  if (checkpoint.kind === "submit") {
    const payload = checkpoint.payload as
      | {
          filled?: Array<{ field: string; value?: string }>;
          unmatched?: Array<{ field: string; reason?: string }>;
          reachedReview?: boolean;
        }
      | undefined;
    const filled = payload?.filled ?? [];
    const unmatched = payload?.unmatched ?? [];
    const reachedReview = payload?.reachedReview !== false; // default true if omitted
    return (
      <Modal
        title={reachedReview ? "Review and submit" : "Continue in the portal"}
        icon={reachedReview ? <Send className="h-5 w-5 text-primary" /> : <LogIn className="h-5 w-5 text-primary" />}
        onClose={onClose}
      >
        <p className="text-body-md text-on-surface-variant">
          {!reachedReview
            ? "The agent has not reached the portal review screen. Use the live browser to create an account or log in for this university, then continue through the portal steps yourself."
            : isDemo
            ? "This is a demo — clicking below just completes the run; nothing is sent anywhere."
            : "The form is filled. Look it over in the live browser, fix anything you want, then hit the portal's submit button. Tap below once it's sent."}
        </p>

        {!reachedReview && (
          <div className="mt-3 rounded-md border-2 border-error/60 bg-error-container/50 p-3">
            <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-error-container">
              Heads up: the agent couldn&apos;t reach the portal&apos;s review screen.
            </p>
            <p className="mt-0.5 text-body-sm text-on-error-container">
              Create an account or log in in the live browser above, then navigate to the portal&apos;s review/submit step before confirming anything was submitted.
            </p>
          </div>
        )}

        {filled.length > 0 && (
          <div className="mt-4">
            <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Filled ({filled.length})
            </p>
            <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto pr-1 text-body-sm">
              {filled.map((f, i) => (
                <li key={`${f.field}-${i}`} className="flex gap-2">
                  <span className="shrink-0 text-on-surface-variant">{f.field}:</span>
                  <span className="min-w-0 truncate text-on-surface">{f.value ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unmatched.length > 0 && (
          <div className="mt-3 rounded-md border border-tertiary/40 bg-tertiary-container/30 p-3">
            <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
              Needs your attention ({unmatched.length})
            </p>
            <ul className="mt-1.5 space-y-1 text-body-sm text-on-surface">
              {unmatched.map((u, i) => (
                <li key={`${u.field}-${i}`}>
                  <span className="font-semibold">{u.field}</span>
                  {u.reason ? <span className="text-on-surface-variant"> — {u.reason}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {!reachedReview ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              <LogIn className="h-4 w-4" /> Use live browser
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm("submitted")}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              I&apos;ve submitted
            </button>
          )}
        </div>
      </Modal>
    );
  }

  return null;
}

function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow sm:p-6">
        <div className="flex items-start gap-2">
          {icon}
          <h3 className="min-w-0 flex-1 font-display text-headline-sm font-bold text-on-surface">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instructions"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
