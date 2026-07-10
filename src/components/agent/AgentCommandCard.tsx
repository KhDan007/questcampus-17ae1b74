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
        "@container rounded-2xl border border-on-surface/8 bg-surface-container-lowest qc-soft-shadow",
        compact ? "p-4" : "p-4 sm:p-6",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-fixed text-on-primary-fixed-variant">
            {running || busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : roadmap ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
              Autonomous roadmap
            </p>
            <h2 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
              {summary}
            </p>
            {run?.status && (
              <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface/75">
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "Preparing" : running ? "Running" : "Run roadmap"}
          </button>
          <Link
            to="/agent"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5"
          >
            Open agent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
