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
  RotateCcw,
  Sparkles,
  Undo2,
  Upload,
  Wand2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { PRICE_MVP } from "@/lib/config";

// -----------------------------------------------------------------------------
// Types
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
  score: number;
  rationale: string;
};

type Comment = {
  quote: string;
  note: string;
  severity: "praise" | "suggestion" | "issue";
};

type Rewrite = { before: string; after: string; why: string };

type ReviewFree = {
  overall: number;
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
  error: "not_logged_in" | "no_input" | "essay_not_found" | "too_short" | "feedback_failed";
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

function locateQuote(text: string, quote: string): [string, string, string] | null {
  if (!quote.trim()) return null;
  const i = text.indexOf(quote);
  if (i >= 0) {
    return [text.slice(0, i), text.slice(i, i + quote.length), text.slice(i + quote.length)];
  }
  const norm = quote.trim().replace(/\s+/g, " ");
  const re = new RegExp(escapeReg(norm).replace(/ /g, "\\s+"));
  const m = text.match(re);
  if (m && m.index != null) {
    return [
      text.slice(0, m.index),
      text.slice(m.index, m.index + m[0].length),
      text.slice(m.index + m[0].length),
    ];
  }
  return null;
}

function applyRewriteToText(text: string, before: string, after: string): string | null {
  if (!before.trim()) return null;
  const i = text.indexOf(before);
  if (i >= 0) return text.slice(0, i) + after + text.slice(i + before.length);
  const norm = before.trim().replace(/\s+/g, " ");
  const re = new RegExp(escapeReg(norm).replace(/ /g, "\\s+"));
  const m = text.match(re);
  if (m && m.index != null) {
    return text.slice(0, m.index) + after + text.slice(m.index + m[0].length);
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
  autoEssayId,
  onAutoEssayConsumed,
}: {
  sessionId: string;
  token: string | undefined;
  isPaid: boolean;
  autoEssayId?: string | null;
  onAutoEssayConsumed?: () => void;
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

  const pickedEssay = useQuery(
    api.essays.getEssay,
    token && pickedEssayId ? { token, essayId: pickedEssayId } : "skip",
  ) as { fullText?: string; preview?: string } | null | undefined;

  const past = useQuery(api.essayFeedback.listReviews, token ? { token } : "skip") as
    | PastReview[]
    | undefined;

  const generatedEssays = useQuery(api.essays.listEssays, token ? { token } : "skip") as
    | {
        essayId: string;
        targetName?: string;
        wordCount: number;
        preview: string;
        createdAt: number;
      }[]
    | undefined;

  const originalBody = useMemo(() => {
    if (mode === "pick") return pickedEssay?.fullText ?? pickedEssay?.preview ?? "";
    return pasted;
  }, [mode, pasted, pickedEssay]);

  const fetchedReview = useQuery(
    api.essayFeedback.getReview,
    token && result?.reviewId && result.locked ? { token, reviewId: result.reviewId } : "skip",
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

  // Auto-run when an essay was just generated and the user accepted the popup.
  const autoRanRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoEssayId || !token) return;
    if (autoRanRef.current === autoEssayId) return;
    autoRanRef.current = autoEssayId;
    setMode("pick");
    setPickedEssayId(autoEssayId);
  }, [autoEssayId, token]);

  useEffect(() => {
    if (!autoEssayId) return;
    if (mode !== "pick" || pickedEssayId !== autoEssayId) return;
    if (status === "loading") return;
    // Wait until we have the essay body cached before running, so anchors resolve cleanly.
    if (!pickedEssay) return;
    void run();
    onAutoEssayConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEssayId, mode, pickedEssayId, pickedEssay]);

  const openPast = useCallback((reviewId: string) => {
    setStatus("loading");
    setPastTarget(reviewId);
  }, []);

  const [pastTarget, setPastTarget] = useState<string | null>(null);
  const pastFetched = useQuery(
    api.essayFeedback.getReview,
    token && pastTarget ? { token, reviewId: pastTarget } : "skip",
  ) as ReviewSuccess | null | undefined;

  useEffect(() => {
    if (!pastTarget) return;
    if (pastFetched === undefined) return;
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
          Honest scoring across seven dimensions, grounded in real essays that won places. Free for
          everyone — unlock inline notes + rewrites for ${PRICE_MVP}/month.
        </p>

        <div className="mt-6 inline-flex flex-wrap gap-2 rounded-full border-2 border-on-surface/20 bg-surface p-1">
          {(
            [
              { k: "paste", label: "Paste" },
              { k: "upload", label: "Upload" },
              { k: "pick", label: "Pick a draft" },
            ] as { k: Mode; label: string }[]
          ).map((t) => {
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
              {pasted.trim()
                ? `${pasted.trim().split(/\s+/).length} words`
                : "Aim for at least ~120 words for real feedback."}
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
                          active
                            ? "border-on-surface bg-secondary-container"
                            : "border-on-surface/15 bg-surface/80"
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
                        {active && (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        )}
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

      {status === "ready" && result && (
        <ResultCard
          result={result}
          originalBody={originalBody}
          token={token}
          isPaid={isPaid}
          essayId={mode === "pick" ? pickedEssayId : null}
        />
      )}

      {past && past.length > 0 && (
        <section>
          <h3 className="font-display text-headline-sm font-bold text-on-surface">Past reviews</h3>
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
// Result card — compact header + sticky two-pane workspace
// -----------------------------------------------------------------------------

type TabKey = "notes" | "rewrites" | "strengths" | "dimensions";

function ResultCard({
  result,
  originalBody,
  token,
  isPaid,
  essayId,
}: {
  result: ReviewSuccess;
  originalBody: string;
  token: string | undefined;
  isPaid: boolean;
  essayId: string | null;
}) {
  const reduce = useReducedMotion();
  const { free, paid, locked, sourceLabel, wordCount } = result;
  const tier = tierColor(free.overall);

  // Working text — what's actually shown / edited. Diverges from originalBody
  // when the user applies rewrites.
  const [workingText, setWorkingText] = useState<string>(originalBody);
  const [undoStack, setUndoStack] = useState<Array<{ text: string; label: string }>>([]);
  const [appliedIdx, setAppliedIdx] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [persistState, setPersistState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [missMsg, setMissMsg] = useState<string | null>(null);
  const updateEssay = useAction(api.essays.updateEssay);
  const persistTimer = useRef<number | null>(null);

  // Reset working state when originalBody (source) changes.
  useEffect(() => {
    setWorkingText(originalBody);
    setUndoStack([]);
    setAppliedIdx(new Set());
    setMissMsg(null);
  }, [originalBody, result.reviewId]);

  // Persist applied edits to the saved essay (if it's a picked draft).
  useEffect(() => {
    if (!token || !essayId) return;
    if (workingText === originalBody) return;
    if (!workingText.trim()) return;
    setPersistState("saving");
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(async () => {
      try {
        const res = (await updateEssay({ token, essayId, fullText: workingText })) as
          | { ok: true }
          | { error: string };
        if ("error" in res) setPersistState("error");
        else {
          setPersistState("saved");
          window.setTimeout(() => setPersistState((s) => (s === "saved" ? "idle" : s)), 1500);
        }
      } catch {
        setPersistState("error");
      }
    }, 700);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [workingText, originalBody, essayId, token, updateEssay]);

  const applyRewrite = (idx: number, r: Rewrite) => {
    const next = applyRewriteToText(workingText, r.before, r.after);
    if (next === null) {
      setMissMsg(
        "Couldn't find that exact passage anymore — the text may have shifted from prior edits.",
      );
      window.setTimeout(() => setMissMsg(null), 4000);
      return;
    }
    setUndoStack((s) => [...s, { text: workingText, label: `Apply rewrite ${idx + 1}` }]);
    setWorkingText(next);
    setAppliedIdx((s) => new Set(s).add(idx));
  };

  const undo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const last = s[s.length - 1];
      setWorkingText(last.text);
      // Clear the most recently applied flag (heuristic: pop highest idx that's applied).
      setAppliedIdx((prev) => {
        const arr = [...prev];
        if (arr.length === 0) return prev;
        const max = Math.max(...arr);
        const next = new Set(arr);
        next.delete(max);
        return next;
      });
      return s.slice(0, -1);
    });
  };

  const resetAll = () => {
    if (workingText === originalBody) return;
    setUndoStack((s) => [...s, { text: workingText, label: "Reset to original" }]);
    setWorkingText(originalBody);
    setAppliedIdx(new Set());
  };

  const applyAll = () => {
    if (!paid) return;
    let text = workingText;
    const newlyApplied = new Set(appliedIdx);
    const snap = workingText;
    paid.rewrites.forEach((r, idx) => {
      if (newlyApplied.has(idx)) return;
      const next = applyRewriteToText(text, r.before, r.after);
      if (next !== null) {
        text = next;
        newlyApplied.add(idx);
      }
    });
    if (text === snap) {
      setMissMsg("Nothing new to apply — passages may have shifted.");
      window.setTimeout(() => setMissMsg(null), 3500);
      return;
    }
    setUndoStack((s) => [...s, { text: snap, label: "Apply all rewrites" }]);
    setWorkingText(text);
    setAppliedIdx(newlyApplied);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border-2 border-on-surface bg-surface/95 p-5 qc-hard-shadow backdrop-blur-md sm:p-6"
    >
      {/* Compact hero: score + verdict + top tip, all in one row on desktop */}
      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-4">
          <ScoreRing value={free.overall} color={tier.ring} reduce={!!reduce} compact />
          <div>
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-primary">
              Review · {wordCount} words
            </p>
            <h2 className="mt-0.5 font-display text-headline-sm font-bold text-on-surface">
              {sourceLabel}
            </h2>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold ${tier.chip}`}
            >
              {tier.label}
            </span>
          </div>
        </div>
        <p className="font-display text-headline-sm text-on-surface text-balance sm:border-l-2 sm:border-on-surface/10 sm:pl-5">
          {free.verdict}
        </p>
        {paid && !locked && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={applyAll}
              disabled={paid.rewrites.length === 0 || appliedIdx.size === paid.rewrites.length}
              className="group inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3.5 py-2 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              title="Apply every suggested rewrite at once"
            >
              <Wand2 className="h-3.5 w-3.5" /> Apply all
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
            <button
              type="button"
              onClick={resetAll}
              disabled={workingText === originalBody}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/30 bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant transition-colors hover:border-on-surface hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            {essayId && persistState !== "idle" && (
              <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                {persistState === "saving" && (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </span>
                )}
                {persistState === "saved" && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                {persistState === "error" && <span className="text-on-surface">Save failed</span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top tip — slim banner */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border-2 border-on-surface bg-secondary-container px-4 py-3 qc-hard-shadow-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.14em] text-on-surface/70">
            Highest-leverage fix
          </p>
          <p className="mt-0.5 font-display text-label-lg font-bold text-on-surface text-balance">
            {free.topTip}
          </p>
        </div>
      </div>

      {missMsg && (
        <p className="mt-3 inline-flex items-start gap-2 rounded-lg border-2 border-on-surface/30 bg-surface px-3 py-2 text-label-sm text-on-surface">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-primary" /> {missMsg}
        </p>
      )}

      {/* Workspace */}
      {!locked && paid ? (
        <Workspace
          paid={paid}
          dimensions={free.dimensions}
          workingText={workingText}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          appliedIdx={appliedIdx}
          onApply={applyRewrite}
          reduce={!!reduce}
        />
      ) : (
        <LockedTeaser
          token={token}
          isPaid={isPaid}
          dimensions={free.dimensions}
          reduce={!!reduce}
        />
      )}
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Two-pane workspace (sticky essay left, tabbed sidebar right)
// -----------------------------------------------------------------------------

function Workspace({
  paid,
  dimensions,
  workingText,
  activeTab,
  setActiveTab,
  appliedIdx,
  onApply,
  reduce,
}: {
  paid: ReviewPaid;
  dimensions: Dimension[];
  workingText: string;
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  appliedIdx: Set<number>;
  onApply: (idx: number, r: Rewrite) => void;
  reduce: boolean;
}) {
  const [activeAnchorIdx, setActiveAnchorIdx] = useState<number | null>(null);
  const noteRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Resolve anchors against workingText (so edits stay highlighted).
  type Anchor = { start: number; end: number; comment: Comment; idx: number };
  const { anchors, orphans } = useMemo(() => {
    const found: Anchor[] = [];
    const miss: { c: Comment; idx: number }[] = [];
    paid.comments.forEach((c, idx) => {
      const loc = locateQuote(workingText, c.quote);
      if (!loc) {
        miss.push({ c, idx });
        return;
      }
      const start = loc[0].length;
      const end = start + loc[1].length;
      found.push({ start, end, comment: c, idx });
    });
    found.sort((a, b) => a.start - b.start);
    const kept: Anchor[] = [];
    for (const a of found) {
      if (kept.length === 0 || a.start >= kept[kept.length - 1].end) kept.push(a);
      else miss.push({ c: a.comment, idx: a.idx });
    }
    return { anchors: kept, orphans: miss };
  }, [paid.comments, workingText]);

  const onAnchorClick = (idx: number) => {
    setActiveTab("notes");
    setActiveAnchorIdx(idx);
    const el = noteRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  anchors.forEach((a, i) => {
    if (a.start > cursor)
      segments.push(<span key={`t-${i}`}>{workingText.slice(cursor, a.start)}</span>);
    const sc = severityClasses(a.comment.severity);
    const isActive = activeAnchorIdx === a.idx;
    segments.push(
      <button
        key={`m-${i}`}
        type="button"
        onClick={() => onAnchorClick(a.idx)}
        className={`relative cursor-pointer rounded px-0.5 ${sc.bg} underline decoration-2 underline-offset-2 ${sc.ring} transition-all ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`}
      >
        {workingText.slice(a.start, a.end)}
      </button>,
    );
    cursor = a.end;
  });
  if (cursor < workingText.length || workingText.length === 0) {
    segments.push(<span key="t-end">{workingText.slice(cursor)}</span>);
  }

  const tabs: { k: TabKey; label: string; count?: number }[] = [
    { k: "notes", label: "Inline notes", count: paid.comments.length },
    { k: "rewrites", label: "Rewrites", count: paid.rewrites.length },
    { k: "strengths", label: "Strengths", count: paid.strengths.length },
    { k: "dimensions", label: "Dimensions", count: dimensions.length },
  ];

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* Essay column — sticky on desktop so the user never scrolls away from text */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border-2 border-on-surface/15 bg-surface/95 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-headline-sm font-bold text-on-surface">Your essay</h3>
            <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              {workingText.trim() ? `${workingText.trim().split(/\s+/).length} words` : ""}
            </p>
          </div>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Tap any highlight to jump to its note.
          </p>
          <div className="mt-3 max-h-[calc(100vh-260px)] overflow-y-auto whitespace-pre-wrap rounded-xl border-2 border-on-surface/10 bg-surface px-4 py-4 font-serif text-body-md leading-relaxed text-on-surface">
            {segments}
          </div>
        </div>
      </div>

      {/* Sidebar with tabs */}
      <div>
        <div className="sticky top-24 z-10 -mx-1 mb-3 flex flex-wrap gap-1 rounded-full border-2 border-on-surface/20 bg-surface/95 p-1 backdrop-blur-md">
          {tabs.map((t) => {
            const active = activeTab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setActiveTab(t.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold transition-all ${
                  active
                    ? "bg-primary text-white qc-hard-shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 text-label-sm ${active ? "bg-white/20" : "bg-on-surface/10"}`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="grid gap-2"
            >
              {paid.comments.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
                  No inline notes for this draft.
                </p>
              )}
              {paid.comments.map((c, idx) => {
                const isOrphan = orphans.some((o) => o.idx === idx);
                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      noteRefs.current[idx] = el;
                    }}
                  >
                    <CommentCard
                      c={c}
                      highlighted={activeAnchorIdx === idx}
                      orphan={isOrphan}
                      onFocus={() => setActiveAnchorIdx(idx)}
                    />
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "rewrites" && (
            <motion.div
              key="rewrites"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="grid gap-3"
            >
              {paid.rewrites.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-on-surface/20 bg-surface/70 p-4 text-body-sm text-on-surface-variant">
                  No rewrites suggested.
                </p>
              )}
              {paid.rewrites.map((r, idx) => {
                const applied = appliedIdx.has(idx);
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border-2 p-4 transition-colors ${
                      applied
                        ? "border-primary/60 bg-primary/5"
                        : "border-on-surface/15 bg-surface/90"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
                        Rewrite {idx + 1}
                      </p>
                      {applied ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-white">
                          <CheckCircle2 className="h-3 w-3" /> Applied
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApply(idx, r)}
                          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Apply
                        </button>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-serif text-body-sm leading-relaxed text-on-surface/75 line-through decoration-on-surface/30">
                      {r.before}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-serif text-body-md leading-relaxed text-on-surface">
                      {renderRewriteAfter(r.after)}
                    </p>
                    <p className="mt-2 inline-flex items-start gap-1.5 text-label-sm text-on-surface-variant">
                      <Wand2 className="mt-0.5 h-3 w-3 text-primary" /> {r.why}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "strengths" && (
            <motion.div
              key="strengths"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border-2 border-on-surface/15 bg-surface/90 p-4"
            >
              {paid.strengths.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  No standout strengths flagged.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {paid.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-on-surface">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {activeTab === "dimensions" && (
            <motion.div
              key="dimensions"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="grid gap-2"
            >
              {dimensions.map((d) => (
                <div
                  key={d.key}
                  className="rounded-xl border-2 border-on-surface/15 bg-surface/90 p-3.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-label-lg font-bold text-on-surface">
                      {d.label}
                    </p>
                    <Dots score={d.score} />
                  </div>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{d.rationale}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Score ring, dots, badge, shimmer
// -----------------------------------------------------------------------------

function ScoreRing({
  value,
  color,
  reduce,
  compact,
}: {
  value: number;
  color: string;
  reduce: boolean;
  compact?: boolean;
}) {
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
  const dim = compact ? "h-24 w-24" : "h-32 w-32";
  return (
    <div className={`relative ${dim}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-on-surface/10"
        />
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
          <p
            className={`font-display font-bold text-on-surface leading-none ${compact ? "text-headline-lg" : "text-display-md-mobile"}`}
          >
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
        <div key={i} className="relative h-4 overflow-hidden rounded-md bg-on-surface/5">
          <motion.div
            className="absolute inset-y-0 w-1/3"
            animate={reduce ? undefined : { x: ["-100%", "300%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(53,37,205,0.18), transparent)",
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

function LockedTeaser({
  token,
  isPaid,
  dimensions,
  reduce,
}: {
  token: string | undefined;
  isPaid: boolean;
  dimensions: Dimension[];
  reduce: boolean;
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
      <ul className="grid gap-2">
        {dimensions.map((d, i) => (
          <motion.li
            key={d.key}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: i * 0.04 }}
            className="rounded-xl border-2 border-on-surface/15 bg-surface/80 p-3.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-label-lg font-bold text-on-surface">{d.label}</p>
              <Dots score={d.score} />
            </div>
            <p className="mt-1 text-body-sm text-on-surface-variant">{d.rationale}</p>
          </motion.li>
        ))}
      </ul>
      <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-surface/80 p-5 text-center lg:max-w-sm">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-secondary-container">
          <Lock className="h-5 w-5 text-on-surface" />
        </div>
        <h3 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
          Unlock inline notes & one-click rewrites
        </h3>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Inline comments on your exact lines + before/after rewrites with one-tap apply — included
          in the same ${PRICE_MVP}/month subscription as your full matches.
        </p>
        <div className="mt-5">
          <UnlockButton
            token={token}
            label={`Unlock for $${PRICE_MVP}/month`}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          />
        </div>
        {isPaid && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-label-sm text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming payment — feedback will
            reveal automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function renderRewriteAfter(after: string): React.ReactNode {
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

function CommentCard({
  c,
  highlighted,
  orphan,
  onFocus,
}: {
  c: Comment;
  highlighted?: boolean;
  orphan?: boolean;
  onFocus?: () => void;
}) {
  const sc = severityClasses(c.severity);
  return (
    <button
      type="button"
      onClick={onFocus}
      className={`block w-full rounded-xl border-2 ${sc.border} bg-surface p-3.5 text-left transition-all ${
        highlighted ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold capitalize ${sc.bg}`}
        >
          {c.severity}
        </span>
        {orphan && (
          <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
            general
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-body-sm italic text-on-surface/80">"{c.quote}"</p>
      <p className="mt-1.5 text-body-sm text-on-surface">{c.note}</p>
    </button>
  );
}
