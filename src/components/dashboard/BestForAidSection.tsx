"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Coins, PiggyBank, Sparkles } from "lucide-react";
import { useAidRecommendations, type AidRecommendation } from "@/lib/aid";
import { useSavedUniversities } from "@/lib/universities/savedClient";

function formatUsdPerYear(n: number): string {
  const rounded = Math.round(n / 100) * 100;
  return `$${rounded.toLocaleString("en-US")}/yr`;
}

export function BestForAidSection({ limit = 12 }: { limit?: number }) {
  const recs = useAidRecommendations(limit);
  const { saved } = useSavedUniversities();
  const savedCount = saved?.length ?? 0;

  return (
    <section
      className="mt-5 overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/95 qc-hard-shadow sm:mt-8"
      aria-labelledby="best-for-aid-heading"
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b-2 border-on-surface/10 bg-gradient-to-br from-tertiary/15 via-secondary/10 to-primary/10 p-4 sm:p-6">
        <div className="min-w-0">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Money-smart picks
          </p>
          <h2
            id="best-for-aid-heading"
            className="mt-1 font-display text-headline-md font-bold text-on-surface sm:text-headline-lg"
          >
            Best for scholarships &amp; aid
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Ranked by affordability + need-based aid, from your saved schools.
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-on-surface px-2.5 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-surface qc-hard-shadow-sm sm:inline-flex">
          <PiggyBank className="h-3.5 w-3.5" /> Aid-ranked
        </span>
      </header>

      <div className="p-4 sm:p-6">
        {recs === undefined ? (
          <SkeletonList />
        ) : recs.length === 0 ? (
          <EmptyState hasSaved={savedCount > 0} />
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2">
            {recs.map((r, i) => (
              <li key={`${r.source}::${r.externalId}`}>
                <AidCard rec={r} rank={i + 1} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function AidCard({ rec, rank }: { rec: AidRecommendation; rank: number }) {
  const scorePct = Math.max(0, Math.min(100, Math.round(rec.aidScore * 100)));
  const scoreTone =
    scorePct >= 75
      ? "bg-tertiary text-on-tertiary"
      : scorePct >= 50
        ? "bg-primary text-white"
        : "bg-surface text-on-surface";
  const isLowConf = rec.confidence === "low";
  const reasons = rec.aidReasons.slice(0, 2);
  const location = [rec.city, rec.country].filter(Boolean).join(", ");

  return (
    <Link
      to="/application/$system/$externalId"
      params={{ system: rec.source, externalId: rec.externalId }}
      className={`group flex h-full flex-col gap-3 rounded-xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
        isLowConf ? "opacity-90" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-primary/10 font-[var(--font-label)] text-label-md font-bold tabular-nums text-primary">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-headline-sm font-bold text-on-surface">
            {rec.name}
          </h3>
          {location && (
            <p className="truncate text-label-sm text-on-surface-variant">{location}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-on-surface px-2 py-1 font-[var(--font-label)] text-label-sm font-bold tabular-nums qc-hard-shadow-sm ${scoreTone}`}
          title="Aid score (0–100)"
          aria-label={`Aid score ${scorePct} out of 100`}
        >
          <Sparkles className="h-3 w-3" /> {scorePct}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {rec.netCost !== null && (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-on-surface/20 bg-surface-container-lowest px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
            <Coins className="h-3 w-3 text-primary" />
            Net {formatUsdPerYear(rec.netCost)}
          </span>
        )}
        {isLowConf && (
          <span className="inline-flex items-center rounded-md border-2 border-dashed border-on-surface/25 bg-surface px-2 py-1 text-label-sm text-on-surface-variant">
            limited data
          </span>
        )}
      </div>

      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="rounded-md border-2 border-on-surface/15 bg-tertiary/10 px-2 py-1 text-label-sm text-on-surface"
            >
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-end gap-1 font-[var(--font-label)] text-label-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open application <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-xl border-2 border-on-surface/15 bg-surface/70"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasSaved }: { hasSaved: boolean }) {
  if (!hasSaved) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-tertiary text-on-tertiary qc-hard-shadow-sm">
          <PiggyBank className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-headline-sm font-bold text-on-surface">
            Save some universities
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            We'll rank them by aid friendliness and net cost.
          </p>
        </div>
        <Link
          to="/universities"
          search={{ q: "" }}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          Find universities <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return (
    <p className="rounded-xl border-2 border-dashed border-on-surface/20 bg-surface/60 p-4 text-body-sm text-on-surface-variant">
      No aid data yet for your saved schools — we'll fill this in as their records come through.
    </p>
  );
}
