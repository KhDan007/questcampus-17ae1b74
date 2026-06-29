import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Send, ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DocumentManager } from "@/components/apply/DocumentManager";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { ApplyButton } from "@/components/apply/ApplyButton";
import type { ApplyJob } from "@/lib/applyQueue/client";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Auto-Apply — QuestCampus" },
      {
        name: "description",
        content:
          "Upload your documents once and let the QuestCampus agent fill applications in a live browser.",
      },
    ],
  }),
  component: ApplyHubPage,
});

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  claimed: "Starting",
  awaiting_login: "Needs login",
  filling: "Filling",
  awaiting_submit: "Ready to submit",
  done: "Done",
  cancelled: "Cancelled",
  error: "Error",
};

function ApplyHubPage() {
  const { isAuthenticated, token } = useAuth();
  if (!isAuthenticated) return <Navigate to="/signin" search={{ redirect: "/apply" } as never} />;

  return (
    <DashboardShell>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="mt-4">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Auto-Apply
          </p>
          <h1 className="mt-2 font-display text-display-md text-on-surface">
            <Send className="mr-2 inline h-7 w-7 text-primary" />
            Apply with one click
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Upload your documents, then start an application. The agent opens a live browser, you
            sign in to the portal, and we fill the form for you. You stay in control — review and
            hit submit when it&apos;s ready.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {token && <ActiveJobsList token={token} />}
          <DocumentManager />
          <SavedReady />
        </div>
      </main>
    </DashboardShell>
  );
}

function ActiveJobsList({ token }: { token: string }) {
  const job = useQuery(api.applyQueue.myActiveJob, { token }) as ApplyJob | null | undefined;
  if (!job) return null;
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
      <h2 className="font-display text-headline-sm font-bold text-on-surface">In progress</h2>
      <Link
        to="/apply/$jobId"
        params={{ jobId: job.jobId }}
        className="mt-3 flex items-center gap-3 rounded-xl border-2 border-on-surface bg-surface-container-lowest px-4 py-3 transition-transform hover:-translate-y-0.5 hover:translate-x-0.5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary-fixed text-primary">
          <GraduationCap className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-label-lg font-bold text-on-surface">
            {job.targetName ?? job.externalId ?? "Application"}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {STATUS_LABEL[job.status] ?? job.status}
            {job.progress?.message ? ` · ${job.progress.message}` : ""}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-on-surface/60" />
      </Link>
    </section>
  );
}

function SavedReady() {
  const { saved } = useSavedUniversities();
  if (!saved || saved.length === 0) {
    return (
      <section className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-6 text-center backdrop-blur-sm">
        <p className="text-body-md text-on-surface-variant">
          Save universities first — applications launch from your saved list.
        </p>
        <Link
          to="/universities"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          Browse universities <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
      <h2 className="font-display text-headline-sm font-bold text-on-surface">
        Start an application
      </h2>
      <p className="mt-1 text-body-md text-on-surface-variant">
        Pick a saved university to kick off the agent.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {saved.map((u) => {
          const location = [u.city, u.country].filter(Boolean).join(", ");
          return (
            <li
              key={u.id}
              className="flex flex-col rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-3"
            >
              <p className="truncate font-display text-label-lg font-bold text-on-surface">
                {u.name}
              </p>
              {location && (
                <p className="truncate text-label-sm text-on-surface-variant">{location}</p>
              )}
              <div className="mt-3">
                <ApplyButton
                  source={u.source}
                  externalId={u.externalId}
                  targetName={u.name}
                  size="md"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
