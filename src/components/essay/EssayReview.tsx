"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { PRICE_MVP } from "@/lib/config";

// -----------------------------------------------------------------------------
// Types from the backend (Essay Feedback handoff)
// -----------------------------------------------------------------------------

type DimensionKey =
  | "hook"
  | "voice"
  | "specificity"
  | "structure"
  | "reflection"
  | "stakes"
  | "ending";

type Dimension = {
  key: DimensionKey;
  label: string;
  score: number; // 1..5
  rationale: string;
};

type Comment = {
  quote: string;
  note: string;
  severity: "praise" | "suggestion" | "issue";
};

type Rewrite = { before: string; after: string; why: string };

type ReviewFree = {
  overall: number; // 0..100
  verdict: string;
  dimensions: Dimension[];
  topTip: string;
};

type ReviewPaid = {
  strengths: string[];
  comments: Comment[];
  rewrites: Rewrite[];
};

type ReviewSuccess = {
  reviewId: string;
  sourceLabel: string;
  wordCount: number;
  free: ReviewFree;
  locked: boolean;
  paid?: ReviewPaid;
};

type ReviewError = {
  error:
    | "not_logged_in"
    | "no_input"
    | "essay_not_found"
    | "too_short"
    | "feedback_failed";
};

type PastReview = {
  reviewId: string;
  sourceLabel: string;
  wordCount: number;
  overall: number;
  verdict: string;
  createdAt: number;
};

type Mode = "paste" | "upload" | "pick";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function tierColor(overall: number): { ring: string; text: string; chip: string; label: string } {
  if (overall >= 85)
    return {
      ring: "#0d9488",
      text: "text-teal-700",
      chip: "bg-teal-100 text-teal-800",
      label: "Outstanding",
    };
  if (overall >= 70)
    return {
      ring: "#16a34a",
      text: "text-green-700",
      chip: "bg-green-100 text-green-800",
      label: "Strong",
    };
  if (overall >= 50)
    return {
      ring: "#d97706",
      text: "text-amber-700",
      chip: "bg-amber-100 text-amber-900",
      label: "Promising — work to do",
    };
  return {
    ring: "#dc2626",
    text: "text-red-700",
    chip: "bg-red-100 text-red-800",
    label: "Needs another pass",
  };
}

function errorMsg(e: ReviewError["error"]): string {
  switch (e) {
    case "too_short":
      return "Paste a bit more of your essay (at least ~120 words) so we can give real feedback.";
    case "no_input":
      return "Paste your essay or pick one from your saved drafts.";
    case "essay_not_found":
      return "We couldn't find that essay. Try picking another draft.";
    case "not_logged_in":
      return "Your session expired. Please sign in again.";
    case "feedback_failed":
      return "That didn't work — try again.";
  }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Locate a verbatim quote inside the essay and split into [before, match, after].
// Falls back to a lightly-normalised search (collapse whitespace).
function locateQuote(text: string, quote: string): [string, string, string] | null {
  if (!quote.trim()) return null;
  const i = text.indexOf(quote);
  if (i >= 0) {
    return [text.slice(0, i), text.slice(i, i + quote.length), text.slice(i + quote.length)];
  }
  // Normalised search: collapse whitespace in both haystack & needle, then map back.
  const norm = quote.trim().replace(/\s+/g, " ");
  const re = new RegExp(escapeReg(norm).replace(/ /g, "\\s+"));
  const m = text.match(re);
  if (m && m.index != null) {
    return [text.slice(0, m.index), text.slice(m.index, m.index + m[0].length), text.slice(m.index + m[0].length)];
  }
  return null;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function EssayReview({
  sessionId,
  token,
  isPaid,
}: {
  sessionId: string;
  token: string | undefined;
  isPaid: boolean;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("paste");
  const [pasted, setPasted] = useState("");
  const [pickedEssayId, setPickedEssayId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);

  const review = useAction(api.essayFeedback.review);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reviewErr, setReviewErr] = useState<ReviewError["error"] | null>(null);
  const [result, setResult] = useState<ReviewSuccess | null>(null);

  // For locating quotes in the essay body — we need the original text.
  // For paste/upload, it's `pasted`. For a picked essay, fetch its body.
  const pickedEssay = useQuery(
    api.essays.getEssay,
    token && pickedEssayId
      ? { token, essayId: pickedEssayId }
      : "skip",
  ) as { fullText?: string; preview?: string } | null | undefined;

  const past = useQuery(
    api.essayFeedback.listReviews,
    token ? { token } : "skip",
  ) as PastReview[] | undefined;

  const generatedEssays = useQuery(
    api.essays.listEssays,
    token ? { token } : "skip",
  ) as { essayId: string; targetName?: string; wordCount: number; preview: string; createdAt: number }[] | undefined;

  // The essay body used to anchor inline comments.
  const essayBody = useMemo(() => {
    if (mode === "pick") return pickedEssay?.fullText ?? pickedEssay?.preview ?? "";
    return pasted;
  }, [mode, pasted, pickedEssay]);

  // Re-fetch a review if the user pays (so paid tier flips on).
  const fetchedReview = useQuery(
    api.essayFeedback.getReview,
    token && result?.reviewId && result.locked
      ? { token, reviewId: result.reviewId }
      : "skip",
  ) as ReviewSuccess | null | undefined;

  useEffect(() => {
    if (!result || !fetchedReview) return;
    if (result.locked && fetchedReview.locked === false) setResult(fetchedReview);
  }, [fetchedReview, result]);

  const canRun = useMemo(() => {
    if (!token) return false;
    if (mode === "pick") return !!pickedEssayId;
    return pasted.trim().length > 0;
  }, [token, mode, pasted, pickedEssayId]);

  const run = useCallback(async () => {
    if (!sessionId || !token) return;
    setStatus("loading");
    setReviewErr(null);
    try {
      const args: Record<string, unknown> = { sessionId, token, lang: "en" };
      if (mode === "pick" && pickedEssayId) args.essayId = pickedEssayId;
      else args.essayText = pasted;
      const res = (await review(args)) as ReviewSuccess | ReviewError;
      if ("error" in res) {
        setReviewErr(res.error);
        setStatus("error");
        return;
      }
      setResult(res);
      setStatus("ready");
    } catch {
      setReviewErr("feedback_failed");
      setStatus("error");
    }
  }, [sessionId, token, review, mode, pasted, pickedEssayId]);

  const openPast = useCallback((reviewId: string) => {
    // Minimal optimistic shell; getReview query (below) will fill it in.
    setStatus("loading");
    setPastTarget(reviewId);
  }, []);

  // Past-review viewer: fetch a specific review on click.
  const [pastTarget, setPastTarget] = useState<string | null>(null);
  const pastFetched = useQuery(
    api.essayFeedback.getReview,
    token && pastTarget ? { token, reviewId: pastTarget } : "skip",
  ) as ReviewSuccess | null | undefined;

  useEffect(() => {
    if (!pastTarget) return;
    if (pastFetched === undefined) return; // still loading
    if (pastFetched === null) {
      setStatus("error");
      setReviewErr("feedback_failed");
      setPastTarget(null);
      return;
    }
    setResult(pastFetched);
    setStatus("ready");
    setPastTarget(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pastFetched, pastTarget]);

  // File upload (text-only; .docx/.pdf get a friendly nudge).
  const onFile = useCallback(async (file: File) => {
    setParseErr(null);
    setFileName(file.name);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (ext === "txt" || file.type.startsWith("text/")) {
      const text = await file.text();
      setPasted(text);
      return;
    }
    setParseErr(
      "We can read .txt files directly. For .docx / .pdf, please paste the text into the box.",
    );
  }, []);

  return (
    <div className="grid gap-8">
      {/* Source switcher */}
      <div className="rounded-2xl border-2 border-on-surface bg-surface/90 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
        <h2 className="font-display text-headline-md font-bold text-on-surface">
          Get feedback on your personal statement
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Honest scoring across seven dimensions, grounded in real essays that won
          places. Free for everyone — unlock inline notes + rewrites for ${PRICE_MVP}.
        </p>

        <div className="mt-6 inline-flex flex-wrap gap-2 rounded-full border-2 border-on-surface/20 bg-surface p-1">
          {([
            { k: "paste", label: "Paste" },
            { k: "upload", label: "Upload" },
            { k: "pick", label: "Pick a draft" },
          ] as { k: Mode; label: string }[]).map((t) => {
            const active = mode === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setMode(t.k)}
                className={`rounded-full px-4 py-1.5 font-[var(--font-label)] text-label-sm font-semibold transition-all ${
                  active
                    ? "bg-primary text-white qc-hard-shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {(mode === "paste" || mode === "upload") && (
          <div className="mt-5">
            {mode === "upload" && (
              <div className="mb-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none">
                  <Upload className="h-4 w-4" /> Choose a file (.txt)
                  <input
                    type="file"
                    accept=".txt,.docx,.pdf,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onFile(f);
                    }}
                  />
                </label>
                {fileName && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                    <FileText className="h-3.5 w-3.5" /> {fileName}
                  </p>
                )}
                {parseErr && (
                  <p className="mt-2 inline-flex items-start gap-1.5 text-label-sm text-on-surface">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-primary" /> {parseErr}
                  </p>
                )}
              </div>
            )}
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={12}
              placeholder="Paste your full personal statement here…"
              className="w-full resize-y rounded-xl border-2 border-on-surface/30 bg-surface px-4 py-3 font-serif text-body-lg leading-relaxed text-on-surface placeholder:font-sans placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
            />
            <p className="mt-1.5 text-label-sm text-on-surface-variant">
              {pasted.trim() ? `${pasted.trim().split(/\s+/).length} words` : "Aim for at least ~120 words for real feedback."}
            </p>
          </div>
        )}

        {mode === "pick" && (
          <div className="mt-5">
            {!generatedEssays && (
              <p className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your drafts…
              </p>
            )}
            {generatedEssays && generatedEssays.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">
                You don't have any generated essays yet. Write one in the{" "}
                <span className="font-semibold text-on-surface">Write</span> tab and come back.
              </p>
            )}
            {generatedEssays && generatedEssays.length > 0 && (
              <ul className="grid gap-3">
                {generatedEssays.map((e) => {
                  const active = pickedEssayId === e.essayId;
                  return (
                    <li key={e.essayId}>
                      <button
                        type="button"
                        onClick={() => setPickedEssayId(e.essayId)}
                        className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left backdrop-blur-sm transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:shadow-none ${
                          active ? "border-on-surface bg-secondary-container" : "border-on-surface/15 bg-surface/80"
                        }`}
                      >
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-label-lg font-bold text-on-surface">
                            {e.targetName ?? "Common App essay"} · {e.wordCount} words
                          </p>
                          <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                            {e.preview}
                          </p>
                        </div>
                        {active && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={!canRun || status === "loading"}
            onClick={run}
            className="group inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reading your essay…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Get feedback
              </>
            )}
          </button>
        </div>

        {status === "error" && reviewErr && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-lg border-2 border-on-surface bg-error-container/40 p-4 text-body-sm text-on-surface">
            <span className="inline-flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMsg(reviewErr)}
            </span>
            {reviewErr === "feedback_failed" && (
              <button
                type="button"
                onClick={run}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        )}

        {status === "loading" && <ThinkingShimmer reduce={!!reduce} />}
      </div>

      {/* Score card + paid section */}
      {status === "ready" && result && (
        <ResultCard
          result={result}
          essayBody={essayBody}
          token={token}
          isPaid={isPaid}
        />
      )}

      {/* Past reviews */}
      {past && past.length > 0 && (
        <section>
          <h3 className="font-display text-headline-sm font-bold text-on-surface">
            Past reviews
          </h3>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Reopen any review — re-runs of the same essay text are instant.
          </p>
          <ul className="mt-4 grid gap-3">
            {past.map((p) => (
              <li key={p.reviewId}>
                <button
                  type="button"
                  onClick={() => openPast(p.reviewId)}
                  className="flex w-full items-start gap-3 rounded-xl border-2 border-on-surface/15 bg-surface/80 p-4 text-left backdrop-blur-sm transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:shadow-none"
                >
                  <ScoreBadge overall={p.overall} small />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-label-lg font-bold text-on-surface">
                      {p.sourceLabel} · {p.wordCount} words
                    </p>
                    <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                      {p.verdict}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Score card + paid section
// -----------------------------------------------------------------------------

function ResultCard({
  result,
  essayBody,
  token,
  isPaid,
}: {
  result: ReviewSuccess;
  essayBody: string;
  token: string | undefined;
  isPaid: boolean;
}) {
  const reduce = useReducedMotion();
  const { free, paid, locked, sourceLabel, wordCount } = result;
  const tier = tierColor(free.overall);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border-2 border-on-surface bg-surface/95 p-6 qc-hard-shadow backdrop-blur-md sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
            Review · {wordCount} words
          </p>
          <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
            {sourceLabel}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 font-[var(--font-label)] text-label-sm font-semibold ${tier.chip}`}>
          {tier.label}
        </span>
      </div>

      {/* Hero score */}
      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <ScoreRing value={free.overall} color={tier.ring} reduce={!!reduce} />
        <div>
          <p className="font-display text-headline-md text-on-surface text-balance">
            {free.verdict}
          </p>
        </div>
      </div>

      {/* Dimensions */}
      <div className="mt-8">
        <h3 className="font-display text-headline-sm font-bold text-on-surface">
          The seven dimensions
        </h3>
        <ul className="mt-4 grid gap-3">
          {free.dimensions.map((d, i) => (
            <motion.li
              key={d.key}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.04 }}
              className="rounded-xl border-2 border-on-surface/15 bg-surface/80 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-label-lg font-bold text-on-surface">
                  {d.label}
                </p>
                <Dots score={d.score} />
              </div>
              <p className="mt-1.5 text-body-sm text-on-surface-variant">{d.rationale}</p>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Top tip */}
      <div className="mt-6 rounded-2xl border-2 border-on-surface bg-secondary-container p-5 qc-hard-shadow-sm">
        <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-on-surface/70">
          Your highest-leverage fix
        </p>
        <p className="mt-2 font-display text-headline-sm text-on-surface text-balance">
          {free.topTip}
        </p>
      </div>

      {/* Paid section */}
      {!locked && paid ? (
        <PaidSection paid={paid} essayBody={essayBody} reduce={!!reduce} />
      ) : (
        <LockedTeaser token={token} isPaid={isPaid} />
      )}
    </motion.div>
  );
}

function ScoreRing({ value, color, reduce }: { value: number; color: string; reduce: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-on-surface/10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-display-md-mobile font-bold text-on-surface leading-none">
            {shown}
          </p>
          <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">/ 100</p>
        </div>
      </div>
    </div>
  );
}

function Dots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-full border-2 ${
            n <= score ? "border-on-surface bg-primary" : "border-on-surface/30 bg-surface"
          }`}
        />
      ))}
    </div>
  );
}

function ScoreBadge({ overall, small }: { overall: number; small?: boolean }) {
  const t = tierColor(overall);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-on-surface font-display font-bold text-white ${
        small ? "h-10 w-10 text-label-md" : "h-14 w-14 text-headline-sm"
      }`}
      style={{ background: t.ring }}
    >
      {overall}
    </span>
  );
}

function ThinkingShimmer({ reduce }: { reduce: boolean }) {
  return (
    <div className="mt-6 grid gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="relative h-4 overflow-hidden rounded-md bg-on-surface/5"
        >
          <motion.div
            className="absolute inset-y-0 w-1/3"
            animate={reduce ? undefined : { x: ["-100%", "300%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(53,37,205,0.18), transparent)",
            }}
          />
        </div>
      ))}
      <p className="mt-1 inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Reading line by line — this takes ~10s.
      </p>
    </div>
  );
}

function LockedTeaser({ token, isPaid }: { token: string | undefined; isPaid: boolean }) {
  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/80">
      <div className="pointer-events-none select-none p-6 blur-[6px]" aria-hidden>
        <div className="mb-4 h-3 w-32 rounded bg-on-surface/30" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-on-surface/20" />
          <div className="h-3 w-11/12 rounded bg-on-surface/20" />
          <div className="h-3 w-10/12 rounded bg-on-surface/20" />
        </div>
        <div className="mt-5 grid gap-3">
          <div className="rounded-xl border-2 border-on-surface/15 bg-surface p-4">
            <div className="h-3 w-2/3 rounded bg-on-surface/20" />
            <div className="mt-2 h-3 w-3/4 rounded bg-on-surface/15" />
          </div>
          <div className="rounded-xl border-2 border-on-surface/15 bg-surface p-4">
            <div className="h-3 w-1/2 rounded bg-on-surface/20" />
            <div className="mt-2 h-3 w-2/3 rounded bg-on-surface/15" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-surface/80 to-surface p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-secondary-container">
          <Lock className="h-5 w-5 text-on-surface" />
        </div>
        <h3 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
          Unlock inline notes & rewrites
        </h3>
        <p className="mt-2 max-w-md text-body-sm text-on-surface-variant">
          Inline comments on your exact lines + before/after rewrites — same ${PRICE_MVP} unlock as your full matches.
        </p>
        <div className="mt-5">
          <UnlockButton
            token={token}
            label={`Unlock for $${PRICE_MVP}`}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-7 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          />
        </div>
        {isPaid && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-label-sm text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming payment — feedback will reveal automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function PaidSection({
  paid,
  essayBody,
  reduce,
}: {
  paid: ReviewPaid;
  essayBody: string;
  reduce: boolean;
}) {
  return (
    <div className="mt-8 grid gap-6">
      {/* Strengths */}
      {paid.strengths.length > 0 && (
        <div className="rounded-2xl border-2 border-on-surface/15 bg-surface/85 p-5">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">
            What's working
          </h3>
          <ul className="mt-3 grid gap-2">
            {paid.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-on-surface">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inline-anchored essay */}
      {essayBody && paid.comments.length > 0 && (
        <AnchoredEssay text={essayBody} comments={paid.comments} reduce={reduce} />
      )}

      {/* Unanchored comments (fallback when essayBody missing) */}
      {(!essayBody || paid.comments.length === 0) && paid.comments.length > 0 && (
        <ul className="grid gap-2">
          {paid.comments.map((c, i) => (
            <CommentCard key={i} c={c} />
          ))}
        </ul>
      )}

      {/* Rewrites */}
      {paid.rewrites.length > 0 && (
        <div>
          <h3 className="font-display text-headline-sm font-bold text-on-surface">
            Suggested rewrites
          </h3>
          <ul className="mt-3 grid gap-3">
            {paid.rewrites.map((r, i) => (
              <li
                key={i}
                className="rounded-2xl border-2 border-on-surface/15 bg-surface/85 p-5"
              >
                <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
                  Before
                </p>
                <p className="mt-1 whitespace-pre-wrap font-serif text-body-md leading-relaxed text-on-surface/80 line-through decoration-on-surface/30">
                  {r.before}
                </p>
                <p className="mt-4 font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-primary">
                  After
                </p>
                <p className="mt-1 whitespace-pre-wrap font-serif text-body-md leading-relaxed text-on-surface">
                  {renderRewriteAfter(r.after)}
                </p>
                <p className="mt-3 inline-flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                  <Wand2 className="mt-0.5 h-3.5 w-3.5 text-primary" /> {r.why}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderRewriteAfter(after: string): React.ReactNode {
  // Replace [ADD: …] with a chip.
  const parts: React.ReactNode[] = [];
  const re = /\[ADD:[^\]]*\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(after)) !== null) {
    if (m.index > last) parts.push(after.slice(last, m.index));
    parts.push(
      <span
        key={`a-${i++}`}
        className="mx-0.5 inline-flex items-center rounded-full border-2 border-dashed border-primary/60 bg-primary/10 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-primary"
      >
        {m[0].replace(/^\[ADD:\s*/, "").replace(/\]$/, "") || "fill this in"}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < after.length) parts.push(after.slice(last));
  return parts;
}

function severityClasses(s: Comment["severity"]): { bg: string; border: string; ring: string } {
  switch (s) {
    case "praise":
      return { bg: "bg-green-200/70", border: "border-green-700", ring: "decoration-green-700" };
    case "issue":
      return { bg: "bg-red-200/70", border: "border-red-700", ring: "decoration-red-700" };
    case "suggestion":
    default:
      return { bg: "bg-amber-200/70", border: "border-amber-700", ring: "decoration-amber-700" };
  }
}

function CommentCard({ c }: { c: Comment }) {
  const sc = severityClasses(c.severity);
  return (
    <div className={`rounded-xl border-2 ${sc.border} bg-surface p-4`}>
      <p className="font-serif text-body-sm italic text-on-surface/80">"{c.quote}"</p>
      <p className="mt-2 text-body-sm text-on-surface">{c.note}</p>
    </div>
  );
}

function AnchoredEssay({
  text,
  comments,
  reduce,
}: {
  text: string;
  comments: Comment[];
  reduce: boolean;
}) {
  // Resolve each quote's char range; fall back to standalone cards for misses.
  type Anchor = { start: number; end: number; comment: Comment; idx: number };
  const { anchors, orphans } = useMemo(() => {
    const found: Anchor[] = [];
    const miss: Comment[] = [];
    comments.forEach((c, idx) => {
      const loc = locateQuote(text, c.quote);
      if (!loc) {
        miss.push(c);
        return;
      }
      const start = loc[0].length;
      const end = start + loc[1].length;
      found.push({ start, end, comment: c, idx });
    });
    // Sort + drop overlaps (keep first, later ones become orphans).
    found.sort((a, b) => a.start - b.start);
    const kept: Anchor[] = [];
    for (const a of found) {
      if (kept.length === 0 || a.start >= kept[kept.length - 1].end) kept.push(a);
      else miss.push(a.comment);
    }
    return { anchors: kept, orphans: miss };
  }, [text, comments]);

  const [active, setActive] = useState<number | null>(null);

  // Build segments
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  anchors.forEach((a, i) => {
    if (a.start > cursor) segments.push(<span key={`t-${i}`}>{text.slice(cursor, a.start)}</span>);
    const sc = severityClasses(a.comment.severity);
    segments.push(
      <button
        key={`m-${i}`}
        type="button"
        onClick={() => setActive((v) => (v === a.idx ? null : a.idx))}
        className={`relative cursor-pointer rounded px-0.5 ${sc.bg} underline decoration-2 underline-offset-2 ${sc.ring} transition-colors`}
      >
        {text.slice(a.start, a.end)}
      </button>,
    );
    cursor = a.end;
  });
  if (cursor < text.length) segments.push(<span key="t-end">{text.slice(cursor)}</span>);

  const activeAnchor = anchors.find((a) => a.idx === active) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border-2 border-on-surface/15 bg-surface/95 p-5">
        <h3 className="font-display text-headline-sm font-bold text-on-surface">
          Inline notes
        </h3>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Tap any highlighted span to see the note.
        </p>
        <div className="mt-4 whitespace-pre-wrap font-serif text-body-lg leading-relaxed text-on-surface">
          {segments}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AnimatePresence mode="wait">
          {activeAnchor ? (
            <motion.div
              key={activeAnchor.idx}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <CommentCard c={activeAnchor.comment} />
            </motion.div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-on-surface/30 bg-surface/60 p-4 text-body-sm text-on-surface-variant">
              Tap a highlighted line to see the note here.
            </div>
          )}
        </AnimatePresence>

        {orphans.length > 0 && (
          <div className="mt-4 grid gap-2">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
              Other notes
            </p>
            {orphans.map((c, i) => (
              <CommentCard key={i} c={c} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
