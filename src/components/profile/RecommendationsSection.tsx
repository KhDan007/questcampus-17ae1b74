"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UniversityCard, type RecCard } from "./UniversityCard";

type FreePayload = {
  plan: "free";
  firstName?: string;
  results: RecCard[];
};

// Locked teaser cards behind the paywall — synthetic, blurred. We don't expose
// real paid results client-side until purchase.
const TEASER: Pick<RecCard, "bucket" | "name">[] = [
  { bucket: "safety", name: "Safety school match" },
  { bucket: "target", name: "Target school match" },
  { bucket: "reach", name: "Reach school match" },
];

export function RecommendationsSection({
  sessionId,
  token,
  reduce,
  firstName,
}: {
  sessionId: string;
  token?: string;
  reduce: boolean;
  firstName?: string;
}) {
  const recommend = useAction(api.rag.recommend.recommend);
  const [data, setData] = useState<FreePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(
    async (force = false) => {
      setStatus("loading");
      try {
        const res = (await recommend({ sessionId, token, plan: "free", force })) as
          | FreePayload
          | { error: string; results: never[] };
        if ("error" in res && res.error) {
          setStatus("error");
          return;
        }
        setData(res as FreePayload);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [recommend, sessionId, token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-md text-on-background">
            Your university matches 🎯
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Ranked by scholarship fit, then how well each school matches your
            profile.
          </p>
        </div>
        {status === "ready" && (
          <button
            type="button"
            onClick={() => load(true)}
            className="shrink-0 text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {status === "loading" && <MatchesLoading firstName={firstName} />}
      {status === "error" && <MatchesError onRetry={() => load(true)} />}

      {status === "ready" && data && (
        <>
          {/* Free: top 3 full cards */}
          <div className="mt-8 grid gap-5">
            {data.results.map((card, i) => (
              <UniversityCard
                key={card.externalId}
                card={card}
                index={i}
                reduce={reduce}
              />
            ))}
          </div>

          {/* Paid upsell — locked buckets */}
          <PaidUpsell reduce={reduce} />
        </>
      )}
    </section>
  );
}

// ── Paid upsell (blurred teaser + CTA) ───────────────────────────────────────
function PaidUpsell({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      className="relative mt-8 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-6 sm:p-8"
    >
      {/* Blurred teaser cards behind overlay */}
      <div
        aria-hidden
        className="pointer-events-none grid select-none gap-4 opacity-50 blur-[6px] sm:grid-cols-3"
      >
        {TEASER.map((t, i) => (
          <div
            key={i}
            className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"
          >
            <div className="h-3 w-16 rounded-full bg-surface-container-high" />
            <div className="mt-3 h-5 w-32 rounded-full bg-surface-container-high" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded-full bg-surface-container-high" />
              <div className="h-3 w-4/5 rounded-full bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-xl text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)]">
          🔓
        </span>
        <h3 className="mt-4 text-headline-sm text-on-background">
          See your full list — safety, target & reach
        </h3>
        <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
          Unlock every match sorted into safety, target, and reach schools, with
          full requirements, deadlines, and filters.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
        >
          Unlock full list — $5
          <span aria-hidden>→</span>
        </button>
        <p className="mt-3 text-label-sm text-on-surface-variant">
          One-time payment · 30% off for waitlist members
        </p>
      </div>
    </motion.div>
  );
}

// ── Loading / error states ───────────────────────────────────────────────────
function MatchesLoading({ firstName }: { firstName?: string }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
        <motion.span
          className="inline-block h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        {firstName
          ? `Matching ${firstName}'s profile against thousands of universities…`
          : "Matching your profile against thousands of universities…"}
      </div>
      <div className="mt-6 grid gap-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6"
          >
            <div className="h-5 w-48 rounded-full bg-surface-container-high" />
            <div className="mt-3 h-3 w-28 rounded-full bg-surface-container-high" />
            <div className="mt-5 h-16 rounded-lg bg-surface-container-high/60" />
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-9 rounded bg-surface-container-high/70" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
      <p className="text-body-md text-on-surface-variant">
        We couldn&apos;t load your matches just now.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-primary-container px-6 text-label-md text-on-primary"
      >
        Try again
      </button>
    </div>
  );
}
