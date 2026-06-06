"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UniversityCard, type RecCard } from "./UniversityCard";
import { WAITLIST_PATH } from "@/lib/routes";
import { WAITLIST_BASE_DISCOUNT, REFERRAL_EXTRA_DISCOUNT } from "@/lib/config";
import { UnlockButton } from "@/components/payments/UnlockButton";

type FreePayload = {
  plan: "free";
  firstName?: string;
  results: RecCard[];
};

type PaidPayload = {
  plan: "paid";
  firstName?: string;
  buckets?: { safety: RecCard[]; target: RecCard[]; reach: RecCard[] };
  results: RecCard[];
};

type PaymentRequired = { error: "payment_required"; results: never[] };

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
  const [free, setFree] = useState<FreePayload | null>(null);
  const [paid, setPaid] = useState<PaidPayload | null>(null);
  const [freeStatus, setFreeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paidStatus, setPaidStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Live entitlement — flips to {paid:true} ~instantly once the webhook lands.
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = entitlement?.paid === true;

  const loadFree = useCallback(
    async (force = false) => {
      setFreeStatus("loading");
      try {
        const res = (await recommend({ sessionId, token, plan: "free", force })) as
          | FreePayload
          | { error: string; results: never[] };
        if ("error" in res && res.error) {
          setFreeStatus("error");
          return;
        }
        setFree(res as FreePayload);
        setFreeStatus("ready");
      } catch {
        setFreeStatus("error");
      }
    },
    [recommend, sessionId, token],
  );

  const loadPaid = useCallback(
    async (force = false) => {
      if (!token) return;
      setPaidStatus("loading");
      try {
        const res = (await recommend({ sessionId, token, plan: "paid", force })) as
          | PaidPayload
          | PaymentRequired;
        if ("error" in res && res.error === "payment_required") {
          setPaid(null);
          setPaidStatus("ready"); // ready, but no entitlement
          return;
        }
        setPaid(res as PaidPayload);
        setPaidStatus("ready");
      } catch {
        setPaidStatus("error");
      }
    },
    [recommend, sessionId, token],
  );

  useEffect(() => {
    void loadFree();
  }, [loadFree]);

  // When entitlement flips to paid, fetch the full list (force=true to bypass cache).
  useEffect(() => {
    if (isPaid && !paid && paidStatus !== "loading") {
      void loadPaid(true);
    }
  }, [isPaid, paid, paidStatus, loadPaid]);

  const paidBuckets = useMemo(() => {
    if (!paid) return null;
    if (paid.buckets) return paid.buckets;
    // Fallback: group flat results by bucket.
    const grouped = { safety: [] as RecCard[], target: [] as RecCard[], reach: [] as RecCard[] };
    for (const r of paid.results ?? []) grouped[r.bucket]?.push(r);
    return grouped;
  }, [paid]);

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
        {freeStatus === "ready" && (
          <button
            type="button"
            onClick={() => {
              void loadFree(true);
              if (isPaid) void loadPaid(true);
            }}
            className="shrink-0 text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {freeStatus === "loading" && <MatchesLoading firstName={firstName} />}
      {freeStatus === "error" && <MatchesError onRetry={() => loadFree(true)} />}

      {freeStatus === "ready" && free && (
        <>
          {/* Free: top 3 full cards (always shown). */}
          <div className="mt-8 grid gap-5">
            {free.results.map((card, i) => (
              <UniversityCard
                key={card.externalId}
                card={card}
                index={i}
                reduce={reduce}
              />
            ))}
          </div>

          {isPaid ? (
            <PaidResults
              buckets={paidBuckets}
              status={paidStatus}
              onRetry={() => loadPaid(true)}
              reduce={reduce}
            />
          ) : (
            <PaidUpsell token={token} reduce={reduce} />
          )}

          {/* Waitlist prompt — shown after free recommendations (MVP_SPEC §5) */}
          <WaitlistPrompt reduce={reduce} />
        </>
      )}
    </section>
  );
}

// ── Paid results (safety / target / reach) ───────────────────────────────────
function PaidResults({
  buckets,
  status,
  onRetry,
  reduce,
}: {
  buckets: { safety: RecCard[]; target: RecCard[]; reach: RecCard[] } | null;
  status: "idle" | "loading" | "ready" | "error";
  onRetry: () => void;
  reduce: boolean;
}) {
  if (status === "loading" || status === "idle") {
    return (
      <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
        <motion.span
          className="mx-auto block h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-body-md text-on-surface-variant">
          Loading your full safety, target & reach list…
        </p>
      </div>
    );
  }
  if (status === "error" || !buckets) {
    return (
      <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
        <p className="text-body-md text-on-surface-variant">
          We couldn&apos;t load your full list right now.
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

  const sections: { key: keyof typeof buckets; title: string; emoji: string }[] = [
    { key: "safety", title: "Safety schools", emoji: "🛟" },
    { key: "target", title: "Target schools", emoji: "🎯" },
    { key: "reach", title: "Reach schools", emoji: "🚀" },
  ];

  return (
    <div className="mt-10 space-y-12">
      {sections.map((s) => {
        const list = buckets[s.key] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={s.key}>
            <h3 className="text-headline-sm text-on-background">
              {s.emoji} {s.title}
              <span className="ml-2 text-label-md font-normal text-on-surface-variant">
                ({list.length})
              </span>
            </h3>
            <div className="mt-5 grid gap-5">
              {list.map((card, i) => (
                <UniversityCard key={card.externalId} card={card} index={i} reduce={reduce} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Waitlist prompt (amber, distinct from the paid CTA) ──────────────────────
function WaitlistPrompt({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-6 rounded-xl border-l-[3px] border-secondary-container p-5 sm:p-6"
      style={{ background: "rgba(254,166,25,0.12)" }}
    >
      <h3 className="text-headline-sm text-on-background">
        Not ready to pay? Join the waitlist 🎓
      </h3>
      <p className="mt-2 max-w-xl text-body-md text-on-surface">
        Lock in{" "}
        <strong className="text-secondary">{WAITLIST_BASE_DISCOUNT}% off</strong> at
        launch — plus an extra{" "}
        <strong className="text-secondary">
          {REFERRAL_EXTRA_DISCOUNT}% off per friend you refer
        </strong>
        . Founding Member badge and early access to every new tool included.
      </p>
      <a
        href={WAITLIST_PATH}
        className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-secondary-container px-7 text-label-md font-semibold text-on-secondary-container shadow-[0_8px_24px_-6px_rgba(254,166,25,0.45)] transition-[filter,transform] hover:scale-[1.03] hover:brightness-95"
      >
        Join the waitlist
        <span aria-hidden>→</span>
      </a>
    </motion.div>
  );
}

// ── Paid upsell (blurred teaser + CTA) ───────────────────────────────────────
function PaidUpsell({ token, reduce }: { token: string | undefined; reduce: boolean }) {
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
        <div className="mt-6">
          <UnlockButton token={token} />
        </div>
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
