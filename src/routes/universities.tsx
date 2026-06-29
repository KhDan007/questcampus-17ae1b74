import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
import {
  Search,
  MapPin,
  ArrowLeft,
  GraduationCap,
  Bookmark,
  Sparkles,
  Lock,
  Undo2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import { UniversityCard, type RecCard } from "@/components/profile/UniversityCard";
import { EnrichmentDetails } from "@/components/profile/EnrichmentDetails";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { RefineRecommendationsCard } from "@/components/universities/RefineRecommendationsCard";
import { useProgress } from "@/lib/progress";
import { ApplyButton } from "@/components/apply/ApplyButton";

export const Route = createFileRoute("/universities")({
  head: () => ({
    meta: [
      { title: "Universities — QuestCampus" },
      {
        name: "description",
        content: "Your AI matches, university search, and saved shortlist — all in one place.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: UniversitiesPage,
});

export type UniversitySearchResult = {
  id: string;
  source: string;
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  region?: string;
  website?: string;
  fields?: string[];
  globalRank?: number;
  acceptanceRate?: number;
  sizeBucket?: string;
  tuitionOutState?: number;
  costAttendance?: number;
  languageOfInstruction?: string[];
};


type FreePayload = { plan: "free"; firstName?: string; results: RecCard[] };
type PaidPayload = {
  plan: "paid";
  firstName?: string;
  buckets?: { safety: RecCard[]; target: RecCard[]; reach: RecCard[] };
  results: RecCard[];
};
type PaymentRequired = { error: "payment_required"; results: never[] };

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function universityKey(item: { source?: string; externalId: string }) {
  return `${item.source ?? "scorecard"}:${item.externalId}`;
}

function UniversitiesPage() {
  const reduce = useReducedMotion();
  const initial = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user, token, isAdmin, isAuthenticated } = useAuth();
  const progress = useProgress();

  // Entitlement (live)
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = isAdmin || entitlement?.paid === true || user?.paid === true;

  // Search state
  const [query, setQuery] = useState(initial.q);
  const debouncedQuery = useDebounced(query.trim(), 250);
  const canSearch = debouncedQuery.length >= 2;

  useEffect(() => {
    void navigate({
      search: { q: query },
      replace: true,
    });
  }, [query, navigate]);

  const searchArgs = canSearch
    ? {
        query: debouncedQuery,
        limit: 15,
      }
    : null;

  // Matches
  const recommend = useAction(api.rag.recommend.recommend);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [free, setFree] = useState<FreePayload | null>(null);
  const [paid, setPaid] = useState<PaidPayload | null>(null);
  const [freeStatus, setFreeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [paidStatus, setPaidStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "payment_required"
  >("idle");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const loadFree = useCallback(
    async (force = false) => {
      if (!sessionId) return;
      setFreeStatus("loading");
      try {
        const res = (await recommend({
          sessionId,
          token: token ?? undefined,
          plan: "free",
          force,
        })) as FreePayload | { error: string; results: never[] };
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
      if (!sessionId || !token) return;
      setPaidStatus("loading");
      try {
        const res = (await recommend({
          sessionId,
          token,
          plan: "paid",
          force,
        })) as PaidPayload | PaymentRequired;
        if ("error" in res && res.error === "payment_required") {
          setPaid(null);
          setPaidStatus("payment_required");
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

  // Free users load free recommendations; paid users skip free entirely.
  useEffect(() => {
    if (!sessionId) return;
    if (isPaid) return;
    void loadFree();
  }, [sessionId, isPaid, loadFree]);

  // Paid users load cached paid matches (no force — backend serves from cache).
  useEffect(() => {
    if (!isPaid || paid || paidStatus === "loading") return;
    void loadPaid();
  }, [isPaid, paid, paidStatus, loadPaid]);

  // Dismissed matches (per user/session)
  const dismissedKey = useMemo(
    () => `qc:dismissedMatches:${user?.email ?? sessionId ?? "anon"}`,
    [user, sessionId],
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastDismissed, setLastDismissed] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(dismissedKey);
      setDismissed(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setDismissed(new Set());
    }
  }, [dismissedKey]);

  const persistDismissed = useCallback(
    (next: Set<string>) => {
      try {
        window.localStorage.setItem(dismissedKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [dismissedKey],
  );

  const dismissMatch = useCallback(
    (key: string) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(key);
        persistDismissed(next);
        return next;
      });
      setLastDismissed(key);
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setLastDismissed(null), 6000);
    },
    [persistDismissed],
  );

  const undoDismiss = useCallback(() => {
    if (!lastDismissed) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(lastDismissed);
      persistDismissed(next);
      return next;
    });
    setLastDismissed(null);
  }, [lastDismissed, persistDismissed]);

  const restoreAll = useCallback(() => {
    setDismissed(new Set());
    persistDismissed(new Set());
    setLastDismissed(null);
  }, [persistDismissed]);

  // Resolve matches per plan. For paid, prefer buckets and fall back to grouping results.
  const paidBuckets = useMemo(() => {
    if (!isPaid || !paid) return null;
    if (paid.buckets) return paid.buckets;
    const grouped = { safety: [] as RecCard[], target: [] as RecCard[], reach: [] as RecCard[] };
    for (const r of paid.results ?? []) grouped[r.bucket]?.push(r);
    return grouped;
  }, [isPaid, paid]);

  const freeBuckets = useMemo(() => {
    if (isPaid || !free?.results?.length) return null;
    const grouped = { safety: [] as RecCard[], target: [] as RecCard[], reach: [] as RecCard[] };
    for (const r of free.results) grouped[r.bucket]?.push(r);
    return {
      safety: grouped.safety.slice(0, 1),
      target: grouped.target.slice(0, 1),
      reach: grouped.reach.slice(0, 1),
    };
  }, [isPaid, free]);

  const rawMatches: RecCard[] = useMemo(() => {
    if (isPaid && paid) {
      if (paid.results?.length) return paid.results;
      if (paid.buckets) {
        return [...paid.buckets.safety, ...paid.buckets.target, ...paid.buckets.reach];
      }
    }
    return free?.results ?? [];
  }, [isPaid, paid, free]);

  const matchesToRender = isPaid ? rawMatches.slice(0, 20) : rawMatches.slice(0, 3);
  const visibleMatches = matchesToRender.filter((m) => !dismissed.has(universityKey(m)));
  const hiddenCount = matchesToRender.length - visibleMatches.length;

  const visibleBuckets = useMemo(() => {
    const src = paidBuckets ?? freeBuckets;
    if (!src) return null;
    const filter = (list: RecCard[]) => list.filter((m) => !dismissed.has(universityKey(m)));
    return {
      safety: filter(src.safety ?? []),
      target: filter(src.target ?? []),
      reach: filter(src.reach ?? []),
    };
  }, [paidBuckets, freeBuckets, dismissed]);

  const { saved, removeById } = useSavedUniversities();
  const savedCount = saved?.length ?? 0;

  const [tab, setTab] = useState<"matches" | "saved">("matches");

  const matchesLoading =
    (!isPaid && freeStatus === "loading") || (isPaid && paidStatus === "loading" && !paid);

  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.header
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Universities
            </p>
            <h1 className="mt-2 font-display text-display-md text-on-surface">Universities</h1>
            <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
              {isPaid
                ? `${matchesToRender.length} matches. Search and save schools.`
                : "Your top 3 matches, search, and saved list — all in one place."}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border-2 border-on-surface bg-surface p-1 qc-hard-shadow-sm">
            <button
              type="button"
              onClick={() => setTab("matches")}
              className={`rounded-md px-3 py-1.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
                tab === "matches"
                  ? "bg-primary text-white"
                  : "text-on-surface/70 hover:text-on-surface"
              }`}
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              Matches
            </button>
            <button
              type="button"
              onClick={() => setTab("saved")}
              className={`rounded-md px-3 py-1.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
                tab === "saved"
                  ? "bg-primary text-white"
                  : "text-on-surface/70 hover:text-on-surface"
              }`}
            >
              <Bookmark className="mr-1 inline h-3.5 w-3.5" />
              Saved <span className="opacity-75">({savedCount})</span>
            </button>
          </div>
        </motion.header>

        {progress.refined && (
          <RefineRecommendationsCard isAuthenticated={isAuthenticated} />
        )}

        {/* Search box */}
        <section className="mt-8 rounded-2xl border-2 border-on-surface bg-surface/85 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
          <label className="block">
            <span className="font-[var(--font-label)] text-label-sm uppercase tracking-wider text-on-surface-variant">
              Search universities
            </span>
            <div className="mt-2 flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-3 qc-hard-shadow-sm focus-within:-translate-y-0.5 focus-within:translate-x-0.5 focus-within:shadow-none">
              <Search className="h-4 w-4 text-on-surface/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Stanford, ETH, Sciences Po…"
                className="h-12 w-full bg-transparent text-body-lg text-on-surface placeholder:text-on-surface/40 focus:outline-none"
              />
            </div>
          </label>

        </section>

        <div className="mt-10">
          {/* Main column */}
          <div className="min-w-0">
            {/* Search results */}
            {canSearch && (
              <section className="mb-10">
                <h2 className="font-display text-headline-md font-bold text-on-surface">
                  Search results
                </h2>
                <SilentErrorBoundary
                  fallback={
                    <EmptyHint>Search is temporarily unavailable. Try again in a moment.</EmptyHint>
                  }
                >
                  <SearchResults args={searchArgs} reduce={!!reduce} />
                </SilentErrorBoundary>
              </section>
            )}

            {/* Matches tab */}
            {tab === "matches" && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-headline-md font-bold text-on-surface">
                      <Sparkles className="mr-1 inline h-5 w-5 text-primary" />
                      {isPaid ? "Your matches" : "Your matches (free preview)"}
                    </h2>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {matchesLoading
                        ? "Loading your matches…"
                        : isPaid
                          ? `${matchesToRender.length} match${matchesToRender.length === 1 ? "" : "es"}${hiddenCount > 0 ? `, ${hiddenCount} hidden` : ""}`
                          : "Top picks across Safety, Target, and Reach — unlock the full list."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={restoreAll}
                        className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore hidden ({hiddenCount})
                      </button>
                    )}
                    {(freeStatus === "ready" || paidStatus === "ready") && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPaid) void loadPaid(true);
                          else void loadFree(true);
                        }}
                        className="text-label-md text-on-surface-variant hover:text-primary"
                        title={isPaid && paidStatus === "loading" ? "Refreshing matches…" : "Refresh"}
                      >
                        {isPaid && paidStatus === "loading" ? "Refreshing…" : "Refresh"}
                      </button>
                    )}
                  </div>
                </div>

                {matchesLoading ? (
                  <MatchesSkeleton />
                ) : visibleMatches.length === 0 && matchesToRender.length === 0 ? (
                  <EmptyHint>
                    Complete the onboarding quiz on the homepage to generate AI matches.
                  </EmptyHint>
                ) : visibleMatches.length === 0 ? (
                  <EmptyHint>
                    You hid all current matches. Use "Restore hidden" to bring them back.
                  </EmptyHint>
                ) : visibleBuckets ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <MatchColumn
                      title="Safety"
                      subtitle="Likely admits"
                      tone="safety"
                      items={visibleBuckets.safety}
                      reduce={!!reduce}
                      onDismiss={(k) => dismissMatch(k)}
                    />
                    <MatchColumn
                      title="Target"
                      subtitle="Strong fit"
                      tone="target"
                      items={visibleBuckets.target}
                      reduce={!!reduce}
                      onDismiss={(k) => dismissMatch(k)}
                    />
                    <MatchColumn
                      title="Reach"
                      subtitle="Ambitious picks"
                      tone="reach"
                      items={visibleBuckets.reach}
                      reduce={!!reduce}
                      onDismiss={(k) => dismissMatch(k)}
                    />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5">
                    {visibleMatches.map((card, i) => (
                      <UniversityCard
                        key={universityKey(card)}
                        card={card}
                        index={i}
                        reduce={!!reduce}
                        onDismiss={() => dismissMatch(universityKey(card))}
                      />
                    ))}
                  </div>
                )}

                {/* Paywall for free users */}
                {!isPaid && !matchesLoading && (
                  <Paywall token={token ?? undefined} paidStatus={paidStatus} />
                )}
              </section>
            )}

            {/* Saved tab */}
            {tab === "saved" && (
              <SavedTab saved={saved} onRemove={removeById} reduce={!!reduce} />
            )}
          </div>
        </div>

        {/* Undo toast */}
        <AnimatePresence>
          {lastDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border-2 border-on-surface bg-surface px-4 py-2 qc-hard-shadow"
            >
              <span className="font-[var(--font-label)] text-label-md text-on-surface">
                Match hidden
              </span>
              <button
                type="button"
                onClick={undoDismiss}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-white"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

function SearchRow({
  result,
  index,
  reduce,
}: {
  result: UniversitySearchResult;
  index: number;
  reduce: boolean;
}) {
  const { isSaved, isAuthenticated, requireAuth, addFromSearch, removeByUniversity } =
    useSavedUniversities();
  const saved = isSaved(result.source, result.externalId);
  const location = [result.city, result.state, result.country].filter(Boolean).join(", ");

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
      className="flex items-center gap-3 rounded-xl border-2 border-on-surface bg-surface/95 p-4 qc-hard-shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-secondary-container text-on-surface">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {result.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          {result.globalRank ? <span>#{result.globalRank} global</span> : null}
          {result.acceptanceRate != null ? (
            <span>
              {Math.round(
                result.acceptanceRate > 1 ? result.acceptanceRate : result.acceptanceRate * 100,
              )}
              % accept
            </span>
          ) : null}
          {result.sizeBucket ? <span className="capitalize">{result.sizeBucket}</span> : null}
          {result.tuitionOutState ? (
            <span>${Math.round(result.tuitionOutState).toLocaleString()}/yr tuition</span>
          ) : result.costAttendance ? (
            <span>${Math.round(result.costAttendance).toLocaleString()}/yr total</span>
          ) : null}
          {result.languageOfInstruction?.length ? (
            <span>{result.languageOfInstruction.slice(0, 2).join(", ")}</span>
          ) : null}
          {result.fields?.length ? (
            <span className="truncate">{result.fields.slice(0, 2).join(" · ")}</span>
          ) : null}
        </p>
      </div>
      <SaveToggle
        variant="icon"
        saved={saved}
        onAdd={async () => {
          if (!isAuthenticated) {
            requireAuth();
            return;
          }
          await addFromSearch(result.id);
        }}
        onRemove={async () => {
          if (!isAuthenticated) return;
          await removeByUniversity(result.source, result.externalId);
        }}
      />
    </motion.li>
  );
}

function Paywall({
  token,
  paidStatus,
}: {
  token: string | undefined;
  paidStatus: "idle" | "loading" | "ready" | "error" | "payment_required";
}) {
  return (
    <div className="mt-8 rounded-2xl border-2 border-on-surface bg-primary-fixed/40 p-6 qc-hard-shadow-sm sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-primary text-white">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-headline-sm font-bold text-on-surface">
              Unlock your full match list
            </h3>
            <p className="mt-1 max-w-md text-body-md text-on-surface-variant">
              $15/month subscription. Up to 20 universities across Safety, Target, and Reach.
            </p>
            {paidStatus === "payment_required" && (
              <p className="mt-2 text-label-sm text-on-surface-variant">
                Payment required to access the full ranked list.
              </p>
            )}
          </div>
        </div>
        <UnlockButton token={token} label="$15/month subscription" />
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-6 text-center backdrop-blur-sm">
      <p className="text-body-md text-on-surface-variant">{children}</p>
    </div>
  );
}

function LoadingHint() {
  return (
    <div className="mt-4 rounded-2xl border-2 border-on-surface bg-surface/85 p-6 text-center qc-hard-shadow-sm">
      <motion.span
        aria-hidden
        className="mx-auto block h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-2 text-body-sm text-on-surface-variant">Searching…</p>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="mt-6 grid gap-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6"
        >
          <div className="h-5 w-48 rounded-full bg-surface-container-high" />
          <div className="mt-3 h-3 w-28 rounded-full bg-surface-container-high" />
          <div className="mt-5 h-16 rounded-lg bg-surface-container-high/60" />
        </div>
      ))}
    </div>
  );
}

const TONE_BADGE: Record<"safety" | "target" | "reach", string> = {
  safety: "bg-tertiary-container/40 text-tertiary border-tertiary/40",
  target: "bg-primary-fixed text-primary border-primary/40",
  reach: "bg-secondary-container/40 text-secondary border-secondary/40",
};

function MatchColumn({
  title,
  subtitle,
  tone,
  items,
  reduce,
  onDismiss,
}: {
  title: string;
  subtitle: string;
  tone: "safety" | "target" | "reach";
  items: RecCard[];
  reduce: boolean;
  onDismiss?: (key: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border-2 border-on-surface bg-surface/85 p-4 backdrop-blur-md qc-hard-shadow-sm">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h3 className="min-w-0 truncate font-display text-headline-sm font-bold text-on-surface">
          {title}{" "}
          <span className="font-[var(--font-label)] text-label-md font-normal text-on-surface-variant">
            {items.length}
          </span>
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-label-sm font-medium ${TONE_BADGE[tone]}`}
        >
          {subtitle}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-body-sm text-on-surface-variant">No matches in this bucket.</p>
      ) : (
        <ul className="mt-3 grid min-w-0 gap-2.5">
          {items.map((card, i) => (
            <CompactMatchCard
              key={universityKey(card)}
              card={card}
              index={i}
              reduce={reduce}
              onDismiss={onDismiss ? () => onDismiss(universityKey(card)) : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function pctLabel(n?: number): string | null {
  return n == null ? null : `${Math.round(n * 100)}%`;
}
function moneyLabel(n?: number): string | null {
  return n == null ? null : `$${Math.round(n).toLocaleString()}`;
}

function CompactMatchCard({
  card,
  index,
  reduce,
  onDismiss,
}: {
  card: RecCard;
  index: number;
  reduce: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const location = [card.city, card.country].filter(Boolean).join(", ");

  const bullets: string[] = [];
  if (card.acceptanceRate != null) bullets.push(`${pctLabel(card.acceptanceRate)} acceptance rate`);
  if (card.globalRank) bullets.push(`Global rank #${card.globalRank}`);
  if (card.satAvg) bullets.push(`SAT average ${card.satAvg}`);
  if (card.actMidpoint) bullets.push(`ACT midpoint ${card.actMidpoint}`);
  if (card.ieltsOverall) bullets.push(`IELTS ${card.ieltsOverall}+ required`);
  else if (card.toeflIbt) bullets.push(`TOEFL iBT ${card.toeflIbt}+ required`);
  if (card.intlTuition && card.intlTuitionCurrency)
    bullets.push(
      `Intl tuition ~${card.intlTuition.toLocaleString()} ${card.intlTuitionCurrency}/yr`,
    );
  else if (card.tuitionOutState) bullets.push(`Tuition ${moneyLabel(card.tuitionOutState)}/yr`);
  if (card.costAttendance) bullets.push(`Total cost ${moneyLabel(card.costAttendance)}/yr`);
  if (card.sizeBucket)
    bullets.push(`${card.sizeBucket[0].toUpperCase()}${card.sizeBucket.slice(1)} student body`);
  if (card.languageOfInstruction?.length)
    bullets.push(`Taught in ${card.languageOfInstruction.slice(0, 3).join(", ")}`);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.03 }}
      className="min-w-0 overflow-hidden rounded-lg border border-on-surface/15 bg-surface-container-lowest p-3"
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-label-lg font-bold text-on-surface">
            {card.name}
          </p>
          {location && <p className="truncate text-label-sm text-on-surface-variant">{location}</p>}
          {card.why && !open && (
            <p className="mt-1.5 line-clamp-2 break-words text-body-sm text-on-surface">
              {card.why}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RecommendationSaveIcon
            source={card.source ?? "scorecard"}
            externalId={card.externalId}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md border border-on-surface/20 px-2 py-1 text-label-sm text-on-surface hover:bg-surface-container"
        >
          {open ? "Hide details" : "Details"}
        </button>
        {card.website && (
          <a
            href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-on-surface/20 px-2 py-1 text-label-sm text-on-surface hover:bg-surface-container"
          >
            Visit ↗
          </a>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto rounded-md px-2 py-1 text-label-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
          >
            Hide
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-on-surface/10 pt-3">
          {card.why && (
            <p className="break-words text-body-sm leading-relaxed text-on-surface">
              <span className="mr-1.5" aria-hidden>✨</span>
              {card.why}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-1.5 text-body-sm text-on-surface">
              {bullets.map((b) => (
                <li key={b} className="flex min-w-0 items-start gap-2 break-words">
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span className="min-w-0 flex-1 break-words">{b}</span>
                </li>
              ))}
            </ul>
          )}
          <EnrichmentDetails externalId={card.externalId} website={card.website} />
        </div>
      )}
    </motion.li>
  );
}

function RecommendationSaveIcon({ source, externalId }: { source: string; externalId: string }) {
  const { isSaved, isAuthenticated, requireAuth, addFromRecommendation, removeByUniversity } =
    useSavedUniversities();
  const saved = isSaved(source, externalId);
  return (
    <SaveToggle
      variant="icon"
      saved={saved}
      onAdd={async () => {
        if (!isAuthenticated) {
          requireAuth();
          return;
        }
        await addFromRecommendation(source, externalId);
      }}
      onRemove={async () => {
        if (!isAuthenticated) return;
        await removeByUniversity(source, externalId);
      }}
    />
  );
}


function SavedTab({
  saved,
  onRemove,
  reduce,
}: {
  saved: ReturnType<typeof useSavedUniversities>["saved"];
  onRemove: (id: string) => Promise<void> | void;
  reduce: boolean;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-md font-bold text-on-surface">
            <Bookmark className="mr-1 inline h-5 w-5 text-primary" />
            Saved universities
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {saved?.length ?? 0} saved · stays here as you research.
          </p>
        </div>
      </div>
      {saved === undefined ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border-2 border-on-surface bg-surface/85 p-4 qc-hard-shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-on-surface/60" />
          <span className="text-body-sm text-on-surface-variant">Loading your saved list…</span>
        </div>
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-8 text-center backdrop-blur-sm">
          <Bookmark className="mx-auto h-6 w-6 text-on-surface/40" />
          <p className="mt-3 text-body-md text-on-surface-variant">
            Search for universities you already know, or save schools from your matches using the
            bookmark icon.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((u, i) => {
            const card: RecCard = {
              externalId: u.externalId,
              source: u.source,
              name: u.name,
              city: u.city,
              state: u.state,
              country: u.country,
              region: u.region,
              website: u.website,
              fields: u.fields,
              bucket: "target",
              score: 0,
              why: "",
            };
            return (
              <CompactMatchCard
                key={u.id}
                card={card}
                index={i}
                reduce={reduce}
                onDismiss={() => void onRemove(u.id)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}


function SearchResults({
  args,
  reduce,
}: {
  args: {
    query: string;
    limit: number;
  } | null;
  reduce: boolean;
}) {
  const results = useQuery(api.universitySearch.search, args ?? "skip") as
    | UniversitySearchResult[]
    | undefined;
  if (!args) return null;
  if (results === undefined) return <LoadingHint />;
  if (results.length === 0)
    return <EmptyHint>No matching universities found. Try a shorter name.</EmptyHint>;
  return (
    <ul className="mt-4 grid gap-3">
      {results.map((r, i) => (
        <SearchRow key={r.id} result={r} index={i} reduce={reduce} />
      ))}
    </ul>
  );
}
