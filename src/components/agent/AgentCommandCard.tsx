"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, Play, Sparkles } from "lucide-react";
import { usePortfolioAgent } from "@/lib/agent/portfolio";

type Props = {
  title?: string;
  body?: string;
  compact?: boolean;
  className?: string;
};

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function AgentCommandCard({
  title = "Deep agent connected",
  body = "Run one roadmap across profile, saved schools, recommendations, scholarships, requirements, documents, browser extension state, and application tracker.",
  compact = false,
  className,
}: Props) {
  const { roadmap, run, startRoadmap, startError } = usePortfolioAgent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = run?.status === "queued" || run?.status === "running";
  const summary = run?.progress?.message ?? roadmap?.summary ?? body;

  async function start() {
    if (busy || running) return;
    setBusy(true);
    setError(null);
    try {
      await startRoadmap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start deep agent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={[
        // @container so the row layout keys off the CARD's width, not the
        // viewport — this card renders in narrow grid columns where a
        // viewport sm: breakpoint row-ified it and crushed the text.
        "@container rounded-2xl border-2 border-on-surface bg-surface/95 qc-hard-shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-secondary-container text-primary">
            {running || busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : roadmap ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
              Autonomous roadmap
            </p>
            <h2 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
              {summary}
            </p>
            {run?.status && (
              <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-on-surface/15 bg-surface-container px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface/75">
                {running && <Loader2 className="h-3 w-3 animate-spin" />}
                {humanize(run.status)}
              </p>
            )}
            {(error || startError) && (
              <p role="alert" className="mt-2 text-label-sm font-semibold text-error">
                {error ?? startError}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 @xl:justify-end">
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy || running}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "Preparing" : running ? "Running" : "Run roadmap"}
          </button>
          <Link
            to="/agent"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Open agent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
