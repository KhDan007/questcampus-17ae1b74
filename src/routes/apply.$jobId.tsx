import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  Send,
  ListChecks,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LiveCanvas } from "@/components/apply/LiveCanvas";
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

function ApplyRunPage() {
  const { jobId } = Route.useParams();
  const { isAuthenticated, token } = useAuth();
  if (!isAuthenticated)
    return <Navigate to="/signin" search={{ redirect: `/apply/${jobId}` } as never} />;

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Auto-Apply
        </Link>
        <RunBody jobId={jobId} token={token!} />
      </main>
    </DashboardShell>
  );
}

function RunBody({ jobId, token }: { jobId: string; token: string }) {
  const job = useApplyJob(jobId);
  const navigate = useNavigate();
  const { cancelJob, confirm } = useApplyActions();
  const [acting, setActing] = useState(false);

  // Reactive WS ticket — only fetched once wsEndpoint is published.
  const liveTicket = useQuery(
    api.applyQueue.liveTicket,
    job?.wsEndpoint ? { token, jobId } : "skip",
  ) as { wsUrl: string; ticket: string } | undefined;

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

  const terminal = job.status === "done" || job.status === "cancelled" || job.status === "error";

  return (
    <>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Live application
          </p>
          <h1 className="mt-2 font-display text-display-md text-on-surface">
            {job.targetName ?? job.externalId ?? "Application"}
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {STATUS_LABEL[job.status] ?? job.status}
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

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface-container-lowest">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-label-sm text-on-surface-variant">
        {job.progress?.stage ?? "Working"} · {percent}%
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Live canvas */}
        <div className="min-w-0">
          <LiveCanvas
            wsEndpoint={job.wsEndpoint}
            ticket={liveTicket?.ticket}
            interactive={!terminal}
          />
          <p className="mt-2 text-label-sm text-on-surface-variant">
            This is the agent&apos;s real browser. Click and type here to log in, solve captchas,
            or take over at any time.
          </p>
        </div>

        {/* Activity feed */}
        <aside className="rounded-2xl border-2 border-on-surface bg-surface/90 p-4 backdrop-blur-md qc-hard-shadow-sm">
          <h2 className="flex items-center gap-1.5 font-display text-headline-sm font-bold text-on-surface">
            <ListChecks className="h-4 w-4 text-primary" /> Activity
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
                    a.level === "error"
                      ? "bg-error-container/40 text-on-error-container"
                      : a.level === "warn"
                        ? "bg-tertiary-container/40 text-on-surface"
                        : "text-on-surface"
                  }`}
                >
                  <span className="mt-0.5 text-label-sm tabular-nums text-on-surface-variant">
                    {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{a.message}</span>
                </li>
              ))
            )}
          </ol>
        </aside>
      </div>

      {/* Terminal banners */}
      {job.status === "done" && (
        <Banner
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Application submitted"
          body="Nice work. You can close this page."
        />
      )}
      {job.status === "error" && (
        <Banner
          tone="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          title="The agent hit a problem"
          body={job.error ?? "Try again, or finish in the live browser above."}
        />
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
      {job.checkpoint && (
        <CheckpointModal
          checkpoint={job.checkpoint}
          onConfirm={async (kind, value) => {
            setActing(true);
            try {
              await confirm(jobId, kind, value);
            } finally {
              setActing(false);
            }
          }}
          busy={acting}
        />
      )}
    </>
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
  busy,
}: {
  checkpoint: NonNullable<ReturnType<typeof useApplyJob> extends infer J
    ? J extends { checkpoint?: infer C }
      ? C
      : never
    : never>;
  onConfirm: (kind: string, value?: unknown) => Promise<void>;
  busy: boolean;
}) {
  if (!checkpoint) return null;

  if (checkpoint.kind === "login") {
    return (
      <Modal title="Log in to the portal" icon={<LogIn className="h-5 w-5 text-primary" />}>
        <p className="text-body-md text-on-surface-variant">
          Sign in using the live browser above. Use your real credentials — we never see them. Once
          you&apos;re past the login screen, hit Continue and the agent takes over.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("logged_in")}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            I&apos;m logged in
          </button>
        </div>
      </Modal>
    );
  }

  if (checkpoint.kind === "submit") {
    const filled =
      (checkpoint.payload as { filled?: Array<{ field: string; value?: string }> } | undefined)
        ?.filled ?? [];
    const unmatched =
      (checkpoint.payload as { unmatched?: Array<{ field: string; reason?: string }> } | undefined)
        ?.unmatched ?? [];
    return (
      <Modal title="Review and submit" icon={<Send className="h-5 w-5 text-primary" />}>
        <p className="text-body-md text-on-surface-variant">
          The form is filled. Look it over in the live browser, fix anything you want, then hit the
          portal&apos;s submit button. Tap below once it&apos;s sent.
        </p>

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
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("submitted")}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            I&apos;ve submitted
          </button>
        </div>
      </Modal>
    );
  }

  return null;
}

function Modal({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow sm:p-6">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display text-headline-sm font-bold text-on-surface">{title}</h3>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
