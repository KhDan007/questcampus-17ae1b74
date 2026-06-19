import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowLeft,
  PenLine,
  Sparkles,
  Lock,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  FileText,
  Wand2,
  Save,
  Undo2,
  X,
  Pencil,
  ChevronDown,
  History,
  RotateCcw,
} from "lucide-react";
import { formatVersionTime, type EssayVersion } from "@/lib/essays/history";
import { fillPlaceholdersWithMocks, mockForHint } from "@/lib/essays/mockStories";
import { EssayReview } from "@/components/essay/EssayReview";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { PRICE_MVP } from "@/lib/config";
import type { RecCard } from "@/components/profile/UniversityCard";

export const Route = createFileRoute("/essay")({
  head: () => ({ meta: [{ title: "Personal statement — QuestCampus" }] }),
  component: EssayPage,
});

// -----------------------------------------------------------------------------
// Essay questions — Essay Intake v2 (see ESSAY_INTAKE_V2_FRONTEND.md)
// Principle: specific free-text beats choices. Chips are "primes" that seed
// the textarea; the textarea is the actual saved answer.
// -----------------------------------------------------------------------------

type Prime = { value: string; label: string; seed: string };
type EssayQ = {
  key: string;
  label: string;
  helper?: string;
  required?: boolean;
  optional?: boolean;
  // Choice-to-prime story field: textarea is the payload.
  primes?: Prime[];
  textPlaceholder?: string;
  microcopy?: string;
  // Short text-only field.
  shortText?: boolean;
  // Choice-only field (e.g. voice).
  choices?: { value: string; label: string }[];
  minChars?: number;
};

const QUESTIONS: EssayQ[] = [
  {
    key: "anchorStory",
    label:
      "Tell us about one specific moment — a day, a scene, a thing that happened — that says something true about you. Where were you? What happened?",
    required: true,
    primes: [
      {
        value: "place",
        label: "a place that mattered",
        seed: "The place I keep coming back to is ",
      },
      { value: "wrong", label: "a time I was wrong", seed: "I was completely wrong about " },
      {
        value: "couldnt-fix",
        label: "something I couldn't fix",
        seed: "There was one thing I couldn't fix: ",
      },
      { value: "small-win", label: "a small win nobody saw", seed: "A small win nobody saw — " },
      {
        value: "changed-mind",
        label: "a moment I changed my mind",
        seed: "I changed my mind the day ",
      },
    ],
    textPlaceholder: "The first time I…",
    microcopy:
      "Name the real thing. \u201cMy grandmother\u2019s stuck metronome\u201d beats \u201ca musical experience.\u201d",
    minChars: 50,
  },
  {
    key: "whyField",
    label:
      "When did you first get pulled toward what you want to study? Describe the actual moment, not the subject.",
    optional: true,
    primes: [
      { value: "building", label: "Building / making things", seed: "Building / making things — " },
      { value: "people", label: "Working with people", seed: "Working with people — " },
      { value: "ideas", label: "Big ideas / theory", seed: "Big ideas / theory — " },
      { value: "fixing", label: "Fixing what's broken", seed: "Fixing what\u2019s broken — " },
    ],
    textPlaceholder: "I realized I liked …",
    microcopy:
      "We never invent facts — anything you don\u2019t tell us shows up as a [fill-this-in] marker.",
    minChars: 40,
  },
  {
    key: "turningPoint",
    label:
      "A real difficulty, failure, or change you went through — and what you actually did, step by step.",
    optional: true,
    primes: [
      {
        value: "failure",
        label: "a thing that failed first",
        seed: "My first attempt failed because ",
      },
      { value: "family", label: "a family situation", seed: "At home, " },
      { value: "academic", label: "an academic wall", seed: "I hit a wall in " },
      { value: "belonging", label: "not belonging", seed: "I didn\u2019t belong when " },
      { value: "health", label: "a health setback", seed: "After " },
    ],
    textPlaceholder: "What I actually did, step by step…",
    microcopy: "Concrete actions, not feelings. What did you try first? What changed?",
    minChars: 50,
  },
  {
    key: "signatureThing",
    label:
      "One thing you've made, built, led, fixed, or kept going. What was it, and what was hard about it?",
    optional: true,
    textPlaceholder: "What does it look like up close?",
  },
  {
    key: "sensoryDetail",
    label:
      "Give us one small concrete detail from that moment — a sound, a smell, an object, a thing someone said. The kind of detail only you would know.",
    optional: true,
    shortText: true,
    textPlaceholder: "e.g. the smell of WD-40 and the bell that stuck every winter",
  },
  {
    key: "person",
    label:
      "A person who shaped you — and one specific thing they did or said (not just who they are).",
    optional: true,
    shortText: true,
    textPlaceholder:
      "e.g. my grandmother, who told me to \u201cfinish the row before you stop\u201d",
  },
  {
    key: "voice",
    label: "Pick the tone that feels like you.",
    optional: true,
    choices: [
      { value: "reflective", label: "Reflective" },
      { value: "wry", label: "Wry" },
      { value: "earnest", label: "Earnest" },
      { value: "bold", label: "Bold" },
      { value: "quiet", label: "Quiet" },
    ],
  },
];

type AnswerVal = { choice?: string; text?: string };
type AnswerMap = Record<string, AnswerVal>;

function buildPayload(answers: AnswerMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    const a = answers[q.key];
    if (!a) continue;
    const text = a.text?.trim();
    // Choice-only field (voice): send { choice }.
    if (q.choices && !q.primes && !q.shortText) {
      if (a.choice) out[q.key] = { choice: a.choice };
      continue;
    }
    // Story / short-text fields: send { text } only. Never { choice, text }.
    if (text) out[q.key] = { text };
  }
  return out;
}

function buildLabels(answers: AnswerMap): Record<string, string> {
  // Only label keys we actually sent, so the Fact Pack stays clean.
  const labels: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const a = answers[q.key];
    if (!a) continue;
    if (q.choices && !q.primes && !q.shortText) {
      if (a.choice) labels[q.key] = q.label;
    } else if (a.text?.trim()) {
      labels[q.key] = q.label;
    }
  }
  return labels;
}

// -----------------------------------------------------------------------------
// Essay types
// -----------------------------------------------------------------------------

type EssayResult = {
  essayId: string;
  format: string;
  targetName?: string;
  preview: string;
  wordCount: number;
  placeholders: string[];
  locked: boolean;
  fullText?: string;
  trial?: boolean;
};

type EssayError = { error: "not_logged_in" | "no_profile" | "trial_used" | "generation_failed" };

type FreeRec = { plan: "free"; results: RecCard[] };

// Pull landing-quiz matches stashed in localStorage and shape them as RecCards
// so the target picker has *something* to show even if the backend list is empty.
function readLandingMatchesAsRecCards(): RecCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("qc.landing.matches");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { matches?: { name: string; location?: string }[] };
    const list = parsed?.matches ?? [];
    return list.map((m, i) => {
      const [city, state, country] = (m.location ?? "").split(",").map((s) => s.trim());
      return {
        externalId: `local-${i}-${m.name}`,
        name: m.name,
        city: city || undefined,
        state: state || undefined,
        country: country || state || city || "",
        bucket: "target" as const,
        score: 0.7,
        why: "",
      };
    });
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

function EssayPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const token = auth.getSession()?.token;
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    if (sessionId && !isAuthenticated) {
      navigate({ to: "/signin", search: { mode: "signup" } as Record<string, string> });
    }
  }, [sessionId, isAuthenticated, navigate]);

  // ---- Pull the user's free recommendations to populate the target picker.
  const recommend = useAction(api.rag.recommend.recommend);
  const [matches, setMatches] = useState<RecCard[] | null>(null);
  const [matchesErr, setMatchesErr] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = (await recommend({ sessionId, token, plan: "free" })) as
          | FreeRec
          | { error: string; results?: never[] };
        if (cancelled) return;
        if ("error" in res && res.error) {
          // Fall back to whatever was saved on the landing quiz.
          const fb = readLandingMatchesAsRecCards();
          setMatches(fb);
          if (fb.length === 0) setMatchesErr(true);
          return;
        }
        const list = (res as FreeRec).results ?? [];
        if (list.length === 0) {
          const fb = readLandingMatchesAsRecCards();
          setMatches(fb.length > 0 ? fb : []);
          return;
        }
        setMatches(list);
      } catch {
        if (!cancelled) {
          const fb = readLandingMatchesAsRecCards();
          setMatches(fb);
          if (fb.length === 0) setMatchesErr(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, token, recommend]);

  // ---- Form state
  const [view, setView] = useState<"write" | "review">("write");
  const [step, setStep] = useState<"target" | "questions" | "result">("target");
  const [target, setTarget] = useState<{ externalId?: string; name: string } | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [autoReviewEssayId, setAutoReviewEssayId] = useState<string | null>(null);

  // ---- Draft persistence (Convex; replaces qc.essay.answers localStorage)
  const draftQ = useQuery(api.essays.getDraft, sessionId ? { sessionId, token } : "skip") as
    | { target: { externalId?: string; name: string } | null; answers: AnswerMap }
    | null
    | undefined;
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (draftQ === undefined) return; // still loading
    hydratedRef.current = true;
    let convexUseful = false;
    if (draftQ) {
      if (draftQ.target) {
        setTarget(draftQ.target);
        convexUseful = true;
      }
      if (draftQ.answers && Object.keys(draftQ.answers).length > 0) {
        setAnswers(draftQ.answers);
        convexUseful = true;
      }
    }
    if (convexUseful) return;
    // Convex returned nothing useful — fall back to the local mirror.
    if (typeof window === "undefined") return;
    try {
      const rawAnswers = window.localStorage.getItem("qc.essay.answers");
      const rawTarget = window.localStorage.getItem("qc.essay.target");
      if (rawAnswers) {
        const parsed = JSON.parse(rawAnswers) as AnswerMap;
        if (Object.keys(parsed).length > 0) setAnswers(parsed);
      }
      if (rawTarget) {
        const parsed = JSON.parse(rawTarget) as { externalId?: string; name: string } | null;
        if (parsed) setTarget(parsed);
      }
    } catch {
      /* ignore corrupt localStorage */
    }
  }, [draftQ]);

  const saveDraft = useMutation(api.essays.saveDraft);
  const clearDraft = useMutation(api.essays.clearDraft);

  // Debounced autosave of answers (full map; server replaces wholesale).
  const draftTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!sessionId || !hydratedRef.current) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      void saveDraft({ sessionId, token, answers });
    }, 600);
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
    };
  }, [answers, sessionId, token, saveDraft]);

  // Persist target whenever the user picks one (include full answer map).
  useEffect(() => {
    if (!sessionId || !hydratedRef.current || !target) return;
    void saveDraft({ sessionId, token, target, answers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, sessionId, token]);

  // Offline mirror: synchronously write to localStorage so a draft survives
  // network hiccups. Convex remains the source of truth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("qc.essay.answers", JSON.stringify(answers));
      if (target) {
        window.localStorage.setItem("qc.essay.target", JSON.stringify(target));
      }
    } catch {
      /* ignore quota errors */
    }
  }, [answers, target]);

  // ---- Generation
  const generate = useAction(api.essays.generate);
  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [genError, setGenError] = useState<EssayError["error"] | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);

  // Live entitlement — flips to paid:true after payment webhook lands.
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = isAdmin || entitlement?.paid === true;

  // Re-fetch the full essay once the user pays.
  const essayDoc = useQuery(
    api.essays.getEssay,
    token && result?.essayId ? { token, essayId: result.essayId } : "skip",
  ) as EssayResult | null | undefined;

  useEffect(() => {
    if (!result) return;
    if (!essayDoc) return;
    // Sync server doc when we're still locked OR when we haven't loaded the
    // full text yet (e.g. user just opened a past essay from the history list).
    const needsFullText = !result.fullText && essayDoc.fullText;
    if ((result.locked && essayDoc.locked === false) || needsFullText) {
      setResult(essayDoc);
    }
  }, [essayDoc, result]);

  const runGenerate = useCallback(async () => {
    if (!sessionId || !token) return;
    setGenStatus("loading");
    setGenError(null);
    try {
      const res = (await generate({
        sessionId,
        token,
        essayAnswers: buildPayload(answers),
        questionLabels: buildLabels(answers),
        targetSource: target?.externalId ? "scorecard" : undefined,
        targetExternalId: target?.externalId,
        lang: "en",
      })) as EssayResult | EssayError;
      if ("error" in res) {
        setGenError(res.error);
        setGenStatus("error");
        return;
      }
      setResult(res);
      setGenStatus("ready");
      setStep("result");
      setReviewPromptOpen(true);
      try {
        await clearDraft({ sessionId, token });
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem("qc.essay.answers");
            window.localStorage.removeItem("qc.essay.target");
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* non-fatal */
      }
    } catch {
      setGenStatus("error");
      setGenError("generation_failed");
    }
  }, [sessionId, token, generate, answers, target, clearDraft]);

  const canSubmitQuestions = useMemo(() => {
    // Only the anchor story is required; everything else is optional.
    const anchor = answers["anchorStory"]?.text?.trim() ?? "";
    return anchor.length >= 20;
  }, [answers]);

  // Past essays list (logged-in)
  const past = useQuery(api.essays.listEssays, token ? { token } : "skip") as
    | {
        essayId: string;
        targetName?: string;
        wordCount: number;
        preview: string;
        createdAt: number;
      }[]
    | undefined;

  if (!sessionId) {
    return (
      <>
        <LivingBackground />
        <Splash />
      </>
    );
  }

  return (
    <>
      <LivingBackground />
      <DashboardShell>
        <main
          id="main-content"
          className="relative mx-auto w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-on-surface bg-secondary-container px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
              <PenLine className="h-3.5 w-3.5" /> Personal statement
            </p>
            <h1 className="mt-4 text-display-lg-mobile text-on-surface sm:text-display-lg text-balance">
              Write your <span className="qc-text-gradient">Common App essay</span>
            </h1>
            <p className="mt-4 max-w-2xl text-body-lg text-on-surface-variant">
              Grounded in what you actually told us — never invented. The opening is free. Unlock
              the full essay with the ${PRICE_MVP}/month subscription (also unlocks all your
              university matches).
            </p>
          </motion.div>

          <div className="mt-8">
            <div className="inline-flex flex-wrap gap-1 rounded-full border-2 border-on-surface bg-surface p-1 qc-hard-shadow-sm">
              {(
                [
                  { k: "write", label: "Write" },
                  { k: "review", label: "Review" },
                ] as { k: "write" | "review"; label: string }[]
              ).map((t) => {
                const active = view === t.k;
                return (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setView(t.k)}
                    className={`rounded-full px-5 py-1.5 font-[var(--font-label)] text-label-md font-semibold transition-all ${
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
          </div>

          {view === "write" && (
            <div className="mt-6">
              <Stepper step={step} />
            </div>
          )}

          {view === "review" && (
            <div className="mt-8">
              <EssayReview
                sessionId={sessionId}
                token={token}
                isPaid={isPaid}
                autoEssayId={autoReviewEssayId}
                onAutoEssayConsumed={() => setAutoReviewEssayId(null)}
              />
            </div>
          )}

          {view === "write" && (
            <AnimatePresence mode="wait">
              {step === "target" && (
                <StepWrap key="target">
                  <TargetPicker
                    matches={matches}
                    matchesErr={matchesErr}
                    value={target}
                    onChange={setTarget}
                    onNext={() => setStep("questions")}
                    onSkip={() => {
                      setTarget({ name: "No specific school" });
                      setStep("questions");
                    }}
                  />
                </StepWrap>
              )}

              {step === "questions" && (
                <StepWrap key="questions">
                  <QuestionsForm
                    answers={answers}
                    setAnswers={setAnswers}
                    onBack={() => setStep("target")}
                    onSubmit={runGenerate}
                    canSubmit={canSubmitQuestions && !!token}
                    loading={genStatus === "loading"}
                    error={genError}
                    token={token}
                    sessionId={sessionId}
                  />
                </StepWrap>
              )}

              {step === "result" && result && (
                <StepWrap key="result">
                  <ResultView
                    result={result}
                    setResult={setResult}
                    isPaid={isPaid}
                    token={token}
                    onRegenerate={() => {
                      setResult(null);
                      setGenStatus("idle");
                      setStep("questions");
                    }}
                  />
                </StepWrap>
              )}
            </AnimatePresence>
          )}

          {view === "write" && past && past.length > 0 && (
            <section className="mt-20">
              <h2 className="font-display text-headline-md font-bold text-on-surface">
                My personal statements
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Click any draft to reopen it — every edit you make is saved as a version you can
                roll back to.
              </p>
              <ul className="mt-5 grid gap-3">
                {past.map((p) => {
                  const active = result?.essayId === p.essayId;
                  return (
                    <li key={p.essayId}>
                      <button
                        type="button"
                        onClick={() => {
                          setResult({
                            essayId: p.essayId,
                            format: "common_app",
                            targetName: p.targetName,
                            preview: p.preview,
                            wordCount: p.wordCount,
                            placeholders: [],
                            locked: !isPaid,
                            fullText: undefined,
                          });
                          setStep("result");
                          if (typeof window !== "undefined") {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        className={`group flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left backdrop-blur-sm transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:shadow-none ${
                          active
                            ? "border-on-surface bg-secondary-container"
                            : "border-on-surface/15 bg-surface/80"
                        }`}
                      >
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-label-lg font-bold text-on-surface">
                            {p.targetName ?? "Common App essay"} · {p.wordCount} words
                          </p>
                          <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                            {p.preview}
                          </p>
                          <p className="mt-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                            {formatVersionTime(p.createdAt)}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-on-surface" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </DashboardShell>
      <ReviewSuggestionModal
        open={reviewPromptOpen && step === "result" && !!result}
        targetName={result?.targetName}
        onClose={() => setReviewPromptOpen(false)}
        onConfirm={() => {
          if (result) setAutoReviewEssayId(result.essayId);
          setView("review");
          setReviewPromptOpen(false);
          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}

function ReviewSuggestionModal({
  open,
  targetName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  targetName?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center px-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-suggest-title"
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-3xl border-2 border-on-surface bg-surface p-7 qc-hard-shadow sm:p-9"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-2 border-on-surface/20 bg-surface text-on-surface-variant transition-colors hover:border-on-surface hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-on-surface bg-secondary-container px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Next step
            </div>
            <h2
              id="review-suggest-title"
              className="mt-4 font-display text-headline-lg font-bold text-on-surface text-balance"
            >
              Run the review on your <span className="qc-text-gradient">new essay</span>?
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You'll get a score across 7 dimensions, inline notes on the exact lines that need
              work, and one-click rewrites you can apply with a single tap
              {targetName ? (
                <>
                  {" "}
                  — tailored to <span className="font-semibold text-on-surface">{targetName}</span>
                </>
              ) : null}
              .
            </p>
            <ul className="mt-5 grid gap-2 text-body-sm text-on-surface">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Catch weak hooks and vague claims before submission.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Apply suggested rewrites in one click — undo anytime.
              </li>
            </ul>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md border-2 border-on-surface/30 bg-surface px-5 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface-variant transition-colors hover:border-on-surface hover:text-on-surface"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="group inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <Sparkles className="h-4 w-4" /> Review my essay
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -----------------------------------------------------------------------------
// Stepper
// -----------------------------------------------------------------------------

function Stepper({ step }: { step: "target" | "questions" | "result" }) {
  const items: { key: typeof step; label: string }[] = [
    { key: "target", label: "Pick target" },
    { key: "questions", label: "Your story" },
    { key: "result", label: "Your essay" },
  ];
  const activeIdx = items.findIndex((i) => i.key === step);
  return (
    <ol className="flex items-center gap-3 text-label-sm">
      {items.map((it, i) => {
        const active = i === activeIdx;
        const done = i < activeIdx;
        return (
          <li key={it.key} className="flex items-center gap-3">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full border-2 border-on-surface font-display text-label-sm font-bold ${
                done
                  ? "bg-primary text-white"
                  : active
                    ? "bg-secondary-container text-on-surface qc-hard-shadow-sm"
                    : "bg-surface text-on-surface/50"
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={`font-[var(--font-label)] font-semibold ${
                active ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              {it.label}
            </span>
            {i < items.length - 1 && <span aria-hidden className="h-[2px] w-8 bg-on-surface/20" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepWrap({ children, key: _k }: { children: React.ReactNode; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8"
    >
      {children}
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Step 1: Target picker
// -----------------------------------------------------------------------------

function TargetPicker({
  matches,
  matchesErr,
  value,
  onChange,
  onNext,
  onSkip,
}: {
  matches: RecCard[] | null;
  matchesErr: boolean;
  value: { externalId?: string; name: string } | null;
  onChange: (v: { externalId?: string; name: string } | null) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const loading = matches === null && !matchesErr;
  return (
    <div className="rounded-2xl border-2 border-on-surface bg-surface/90 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
      <h2 className="font-display text-headline-md font-bold text-on-surface">
        Which school is this for?
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Picking a target lets us tune the essay to the school's culture. You can also write a
        generic Common App essay.
      </p>

      {loading && (
        <p className="mt-6 inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your matches…
        </p>
      )}

      {(matches?.length ?? 0) > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {matches!.map((m) => {
            const active = value?.externalId === m.externalId;
            return (
              <button
                key={m.externalId}
                type="button"
                onClick={() => onChange({ externalId: m.externalId, name: m.name })}
                className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
                  active
                    ? "border-on-surface bg-primary text-white"
                    : "border-on-surface bg-surface"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    active ? "border-white bg-white text-primary" : "border-on-surface bg-surface"
                  }`}
                >
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-label-lg font-bold">{m.name}</p>
                  <p
                    className={`mt-0.5 text-label-sm ${
                      active ? "text-white/85" : "text-on-surface-variant"
                    }`}
                  >
                    {[m.city, m.state, m.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange({ name: "No specific school" })}
        className={`mt-4 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-on-surface/40 bg-surface/60 p-4 text-left transition-all hover:border-on-surface ${
          value && !value.externalId ? "border-solid border-on-surface bg-secondary-container" : ""
        }`}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-on-surface-variant" />
        <div>
          <p className="font-display text-label-lg font-bold text-on-surface">
            No specific school yet
          </p>
          <p className="mt-0.5 text-label-sm text-on-surface-variant">
            Generic Common App essay — works for any application.
          </p>
        </div>
      </button>

      {matchesErr && (
        <p className="mt-4 inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
          <AlertCircle className="h-4 w-4" /> Couldn't load your matches — you can still write a
          generic essay.
        </p>
      )}

      {/* Free-text fallback — type any school name. */}
      <div className="mt-4 rounded-xl border-2 border-on-surface/30 bg-surface/80 p-4">
        <label className="block font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          Or type a school name
        </label>
        <p className="mt-0.5 text-label-sm text-on-surface-variant">
          Anything works — we'll tune the essay around it.
        </p>
        <input
          type="text"
          value={
            value?.externalId ? "" : value && value.name !== "No specific school" ? value.name : ""
          }
          onChange={(e) => {
            const name = e.target.value;
            if (!name.trim()) onChange(null);
            else onChange({ name });
          }}
          placeholder="e.g. Northwestern University"
          className="mt-2 w-full rounded-lg border-2 border-on-surface/30 bg-surface px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
        />
      </div>

      <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface/40 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface-variant transition-all hover:border-on-surface hover:text-on-surface"
        >
          Skip — write a generic essay
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={onNext}
          className="group inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--qc-hard-shadow)]"
        >
          Next: your story
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 2: Questions
// -----------------------------------------------------------------------------

function QuestionsForm({
  answers,
  setAnswers,
  onBack,
  onSubmit,
  canSubmit,
  loading,
  error,
  token,
  sessionId,
}: {
  answers: AnswerMap;
  setAnswers: (next: AnswerMap | ((prev: AnswerMap) => AnswerMap)) => void;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  loading: boolean;
  error: EssayError["error"] | null;
  token: string | undefined;
  sessionId: string | null;
}) {
  const setField = (key: string, patch: Partial<AnswerVal>) =>
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const [flashKey, setFlashKey] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border-2 border-on-surface bg-surface/90 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
      <h2 className="font-display text-headline-md font-bold text-on-surface">
        Tell us your story
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Short answers are fine. Free-text specifics are what make the essay non-generic — even one
        concrete detail per question matters.
      </p>

      <div className="mt-8 grid gap-7">
        {QUESTIONS.map((q) => {
          const v = answers[q.key] ?? {};
          const text = v.text ?? "";
          const isStory = !!q.primes;
          const isChoiceOnly = !!q.choices && !q.primes && !q.shortText;
          const charCount = text.trim().length;
          const goodLength = q.minChars ? charCount >= Math.min(120, q.minChars + 40) : false;
          return (
            <div key={q.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <label className="block font-display text-label-lg font-bold text-on-surface">
                    {q.label}
                  </label>
                  {q.required && (
                    <span className="font-[var(--font-label)] text-label-sm font-semibold text-primary">
                      Required
                    </span>
                  )}
                  {q.optional && (
                    <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                      Optional
                    </span>
                  )}
                </div>
                {(isStory || q.shortText) && sessionId && token && (
                  <AssistTrigger
                    sessionId={sessionId}
                    token={token}
                    question={q.label}
                    currentValue={text}
                    hasValue={charCount > 0}
                    onAccept={(t) => {
                      setField(q.key, { text: t });
                      setFlashKey(q.key);
                      window.setTimeout(() => setFlashKey((k) => (k === q.key ? null : k)), 900);
                    }}
                  />
                )}
              </div>

              {/* Choice-only field (voice) */}
              {isChoiceOnly && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.choices!.map((c) => {
                    const active = v.choice === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setField(q.key, { choice: active ? undefined : c.value })}
                        className={`rounded-full border-2 px-3.5 py-1.5 font-[var(--font-label)] text-label-sm font-semibold transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
                          active
                            ? "border-on-surface bg-primary text-white"
                            : "border-on-surface bg-surface text-on-surface"
                        }`}
                      >
                        {active && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Story field: chips seed the textarea, are NOT the saved answer. */}
              {isStory && (
                <>
                  <p className="mt-2 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                    Tap an angle to start — then rewrite in your own words.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.primes!.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          // Seed only if the textarea is empty — never overwrite real writing.
                          if (!text.trim()) setField(q.key, { text: p.seed });
                        }}
                        className="rounded-full border-2 border-on-surface/40 bg-surface/80 px-3 py-1 font-[var(--font-label)] text-label-sm text-on-surface transition-all hover:-translate-y-0.5 hover:border-on-surface hover:bg-secondary-container"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setField(q.key, { text: e.target.value })}
                    rows={4}
                    placeholder={q.textPlaceholder}
                    maxLength={800}
                    className={`mt-3 w-full resize-y rounded-lg border-2 bg-surface px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none transition-colors ${
                      flashKey === q.key
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-on-surface/30"
                    }`}
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <p className="text-label-sm text-on-surface-variant">
                      {goodLength
                        ? "Nice — that\u2019s exactly the kind of detail that works."
                        : (q.microcopy ?? "A sentence or two is plenty.")}
                    </p>
                    <span className="shrink-0 font-[var(--font-label)] text-label-sm text-on-surface/50">
                      {charCount}
                    </span>
                  </div>
                </>
              )}

              {/* Short text (optional) */}
              {q.shortText && (
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setField(q.key, { text: e.target.value })}
                  placeholder={q.textPlaceholder}
                  maxLength={220}
                  className={`mt-3 w-full rounded-lg border-2 bg-surface px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none transition-colors ${
                    flashKey === q.key
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-on-surface/30"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border-2 border-on-surface bg-error-container/40 p-4">
          <div className="flex items-start gap-2 text-body-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-on-surface" />
            <span className="text-on-surface">{errorMessage(error)}</span>
          </div>
          {(error === "no_profile" || error === "trial_used") && (
            <div className="mt-4">
              <UnlockButton
                token={token}
                label={`Unlock for $${PRICE_MVP}/month & generate`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 font-display text-label-md font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-5 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="group inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Writing your essay…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate my essay
            </>
          )}
        </button>
      </div>
      {!canSubmit && (
        <p className="mt-3 text-label-sm text-on-surface-variant">
          Write at least a sentence or two for the anchor story to generate. The rest is optional —
          but more detail makes a better essay.
        </p>
      )}
    </div>
  );
}

function errorMessage(e: EssayError["error"]): string {
  switch (e) {
    case "not_logged_in":
      return "Your session expired. Please sign in again.";
    case "no_profile":
      return `Generating a personal statement is a paid feature ($${PRICE_MVP}/month subscription). Unlock and your essay generates instantly from your answers - no quiz required.`;
    case "trial_used":
      return `You've used your free generation. Unlock for $${PRICE_MVP}/month to generate again. Cancel anytime.`;
    case "generation_failed":
      return "The model hiccuped. Try generating again.";
  }
}

// -----------------------------------------------------------------------------
// Step 3: Result
// -----------------------------------------------------------------------------

type ReviseAction =
  | "stronger_hook"
  | "more_specific"
  | "more_personal"
  | "shorten"
  | "lengthen"
  | "simpler"
  | "punchier_ending"
  | "less_ai";

const REVISE_ACTIONS: { key: ReviseAction; label: string; hint: string }[] = [
  { key: "stronger_hook", label: "Stronger hook", hint: "sharpen the opening" },
  { key: "more_specific", label: "More specific", hint: "swap vague for concrete" },
  { key: "more_personal", label: "More personal", hint: "deeper reflection" },
  { key: "shorten", label: "Tighten", hint: "~15% shorter" },
  { key: "lengthen", label: "Expand", hint: "deepen thin moments" },
  { key: "simpler", label: "Simpler language", hint: "plainer, clearer" },
  { key: "punchier_ending", label: "Punchier ending", hint: "stronger close" },
  { key: "less_ai", label: "Sound more human", hint: "strip AI-tells" },
];

function ResultView({
  result,
  setResult,
  isPaid,
  token,
  onRegenerate,
}: {
  result: EssayResult;
  setResult: (r: EssayResult | null) => void;
  isPaid: boolean;
  token: string | undefined;
  onRegenerate: () => void;
}) {
  const reduce = useReducedMotion();
  const locked = result.locked && !result.fullText;
  const editable = !locked && isPaid && !!result.fullText;

  // Manual editing (paid only)
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result.fullText ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const updateEssay = useAction(api.essays.updateEssay);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!editing) setDraft(result.fullText ?? "");
  }, [result.fullText, editing]);

  const doSave = useCallback(
    async (text: string) => {
      if (!token || !text.trim()) return;
      setSaveState("saving");
      try {
        const res = (await updateEssay({ token, essayId: result.essayId, fullText: text })) as
          | { ok: true; preview: string; wordCount: number; placeholders: string[] }
          | { error: string };
        if ("error" in res) {
          setSaveState("error");
          return;
        }
        setResult({
          ...result,
          fullText: text,
          preview: res.preview,
          wordCount: res.wordCount,
          placeholders: res.placeholders,
        });
        setSaveState("saved");
        window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1600);
      } catch {
        setSaveState("error");
      }
    },
    [token, updateEssay, result, setResult],
  );

  // Debounced autosave on draft change while editing
  useEffect(() => {
    if (!editing) return;
    if (draft === (result.fullText ?? "")) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void doSave(draft);
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, editing, result.fullText, doSave]);

  // Revise sidebar
  const revise = useAction(api.essays.revise);
  const [revising, setRevising] = useState<ReviseAction | null>(null);
  const [reviseErr, setReviseErr] = useState<string | null>(null);
  const [undoBuf, setUndoBuf] = useState<EssayResult | null>(null);
  const [bodyKey, setBodyKey] = useState(0);

  const runRevise = useCallback(
    async (action: ReviseAction) => {
      if (!token) return;
      setRevising(action);
      setReviseErr(null);
      try {
        const res = (await revise({ token, essayId: result.essayId, action })) as
          | {
              ok: true;
              fullText: string;
              preview: string;
              wordCount: number;
              placeholders: string[];
            }
          | { error: string };
        if ("error" in res) {
          setReviseErr(res.error);
          return;
        }
        setUndoBuf(result);
        setResult({
          ...result,
          fullText: res.fullText,
          preview: res.preview,
          wordCount: res.wordCount,
          placeholders: res.placeholders,
        });
        setBodyKey((k) => k + 1);
      } catch {
        setReviseErr("generation_failed");
      } finally {
        setRevising(null);
      }
    },
    [token, revise, result, setResult],
  );

  const onUndo = () => {
    if (!undoBuf) return;
    setResult(undoBuf);
    setUndoBuf(null);
    setBodyKey((k) => k + 1);
  };

  // -------- Version history (server, per essayId) --------
  const versionsQ = useQuery(
    api.essays.listVersions,
    token ? { token, essayId: result.essayId } : "skip",
  ) as EssayVersion[] | undefined;
  const versions = useMemo(() => versionsQ ?? [], [versionsQ]);
  const pushVersionMut = useMutation(api.essays.pushVersion);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastSnapshot = useRef<string>("");

  // Reset snapshot tracking when switching to a different essay.
  useEffect(() => {
    lastSnapshot.current = "";
    setHistoryOpen(false);
  }, [result.essayId]);

  // Snapshot whenever fullText changes (initial load, save, revise, undo).
  useEffect(() => {
    const text = result.fullText ?? "";
    if (!text.trim()) return;
    if (text === lastSnapshot.current) return;
    if (!token) return;
    lastSnapshot.current = text;
    const label = versions.length === 0 ? "Original" : "Edit";
    void pushVersionMut({
      token,
      essayId: result.essayId,
      fullText: text,
      wordCount: result.wordCount,
      label,
    });
  }, [result.fullText, result.wordCount, result.essayId, versions.length, token, pushVersionMut]);

  const restoreVersion = useCallback(
    (v: EssayVersion) => {
      // Optimistic UI first, then persist via the same save path.
      setResult({
        ...result,
        fullText: v.fullText,
        wordCount: v.wordCount,
      });
      setBodyKey((k) => k + 1);
      setHistoryOpen(false);
      if (token && editable) void doSave(v.fullText);
    },
    [result, setResult, token, editable, doSave],
  );

  const bodyText = renderText(result);
  const edited = undoBuf !== null || saveState === "saved";
  const hasPlaceholders = (result.placeholders?.length ?? 0) > 0;

  // Per-placeholder editor popup ([ADD: …] click target).
  const [placeholderEdit, setPlaceholderEdit] = useState<{
    placeholder: string;
    occurrence: number;
    draft: string;
  } | null>(null);

  const replacePlaceholderOccurrence = useCallback(
    (placeholder: string, occurrence: number, replacement: string) => {
      const full = result.fullText ?? "";
      let i = -1;
      let from = 0;
      for (let n = 0; n <= occurrence; n++) {
        i = full.indexOf(placeholder, from);
        if (i < 0) return;
        from = i + placeholder.length;
      }
      const next = full.slice(0, i) + replacement + full.slice(i + placeholder.length);
      void doSave(next);
    },
    [result.fullText, doSave],
  );

  const autofillAllMocks = useCallback(() => {
    const full = result.fullText ?? "";
    const { text, count } = fillPlaceholdersWithMocks(full);
    if (count === 0) return;
    void doSave(text);
  }, [result.fullText, doSave]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border-2 border-on-surface bg-surface/95 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
              Common App essay ·{" "}
              <motion.span
                key={result.wordCount}
                initial={reduce ? false : { scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-block"
              >
                {result.wordCount}
              </motion.span>{" "}
              words
              {edited && (
                <span className="ml-2 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm normal-case tracking-normal text-on-surface">
                  Edited
                </span>
              )}
            </p>
            <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
              {result.targetName ?? "Your personal statement"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit text
              </button>
            )}
            {editing && (
              <>
                <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                  {saveState === "saving" && (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                    </span>
                  )}
                  {saveState === "saved" && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  {saveState === "error" && <span className="text-on-surface">Save failed</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(result.fullText ?? "");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  Done
                </button>
              </>
            )}
            {versions.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  aria-expanded={historyOpen}
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                >
                  <History className="h-3.5 w-3.5" /> Versions
                  <span className="ml-0.5 rounded-full bg-secondary-container px-1.5 text-label-sm">
                    {versions.length}
                  </span>
                </button>
                <AnimatePresence>
                  {historyOpen && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border-2 border-on-surface bg-surface p-2 qc-hard-shadow"
                    >
                      <p className="px-2 pb-1 pt-1 font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-on-surface-variant">
                        Version history
                      </p>
                      <ul className="max-h-80 overflow-y-auto">
                        {versions.map((v, i) => {
                          const isCurrent = v.fullText === (result.fullText ?? "");
                          return (
                            <li key={v.id}>
                              <button
                                type="button"
                                disabled={isCurrent || !editable}
                                onClick={() => restoreVersion(v)}
                                className="group flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary-container/70 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-display text-label-md font-bold text-on-surface">
                                    {i === 0 ? "Current" : (v.label ?? "Edit")}
                                    <span className="ml-2 font-[var(--font-label)] text-label-sm font-normal text-on-surface-variant">
                                      · {v.wordCount} words · {formatVersionTime(v.ts)}
                                    </span>
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">
                                    {v.fullText.slice(0, 140)}
                                  </p>
                                </div>
                                {!isCurrent && editable && (
                                  <RotateCcw className="mt-1 h-3.5 w-3.5 shrink-0 text-on-surface-variant transition-colors group-hover:text-primary" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="border-t border-on-surface/10 px-2 pb-1 pt-2 text-label-sm text-on-surface-variant">
                        Saved locally on this device.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {editable && hasPlaceholders && (
              <button
                type="button"
                onClick={autofillAllMocks}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-secondary-container px-3.5 py-2 font-[var(--font-label)] text-label-sm font-bold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                title="Replace every [ADD: …] placeholder with a plausible mock story you can edit later"
              >
                <Sparkles className="h-3.5 w-3.5" /> Autofill mock stories
              </button>
            )}
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Edit answers
            </button>
          </div>
        </div>

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void doSave(draft)}
            rows={22}
            className="mt-6 w-full resize-y rounded-xl border-2 border-on-surface/30 bg-surface px-4 py-3 font-serif text-body-lg leading-relaxed text-on-surface focus:border-on-surface focus:outline-none"
          />
        ) : (
          <div className={`relative ${revising ? "opacity-70" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={bodyKey}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <EssayBody text={bodyText} />
              </motion.div>
            </AnimatePresence>
            {revising && (
              <div className="pointer-events-none absolute inset-0 -m-2 overflow-hidden rounded-xl ring-2 ring-primary/30">
                <motion.div
                  className="absolute inset-x-0 top-0 h-0.5 bg-primary"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  style={{ width: "33%" }}
                />
              </div>
            )}
          </div>
        )}

        {!isPaid && <FreeTrialScoreBanner essayId={result.essayId} token={token} />}

        {reviseErr && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border-2 border-on-surface bg-error-container/40 p-3 text-body-sm text-on-surface">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Revision didn't go through. Try a different tweak.</span>
          </div>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        {editable && (
          <ReviseSideblock
            actions={REVISE_ACTIONS}
            revising={revising}
            canUndo={!!undoBuf}
            onRevise={runRevise}
            onUndo={onUndo}
          />
        )}

        {result.placeholders && result.placeholders.length > 0 && (
          <div className="rounded-2xl border-2 border-on-surface bg-secondary-container p-5 qc-hard-shadow-sm">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-on-surface/70">
              Make it yours
            </p>
            <h3 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
              Fill these in
            </h3>
            <p className="mt-2 text-body-sm text-on-surface/80">
              We left {result.placeholders.length} blank
              {result.placeholders.length === 1 ? "" : "s"} instead of inventing details. Replace
              each <code>[ADD: …]</code> with your real story.
            </p>
            <ul className="mt-4 space-y-2">
              {result.placeholders.map((p, i) => (
                <li
                  key={`${p}-${i}`}
                  className="rounded-lg border-2 border-on-surface/30 bg-surface px-3 py-2 text-body-sm text-on-surface"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border-2 border-on-surface/15 bg-surface/85 p-5 backdrop-blur-sm">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">
            Backed by your data
          </h3>
          <ul className="mt-3 space-y-2 text-body-sm text-on-surface-variant">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Zero invented facts
              — only what you told us.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Fact-check pass
              strips unsupported specifics.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Common App ready
              (650 words).
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function ReviseSideblock({
  actions,
  revising,
  canUndo,
  onRevise,
  onUndo,
}: {
  actions: { key: ReviseAction; label: string; hint: string }[];
  revising: ReviseAction | null;
  canUndo: boolean;
  onRevise: (a: ReviseAction) => void;
  onUndo: () => void;
}) {
  const [openMobile, setOpenMobile] = useState(false);
  const disabled = !!revising;
  const list = (
    <ul className="mt-4 grid gap-2">
      {actions.map((a) => {
        const isRunning = revising === a.key;
        return (
          <li key={a.key}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRevise(a.key)}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-on-surface/20 bg-surface px-3.5 py-2.5 text-left transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-on-surface hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              <span className="min-w-0">
                <span className="block font-display text-label-md font-bold text-on-surface">
                  {a.label}
                </span>
                <span className="block text-label-sm text-on-surface-variant">{a.hint}</span>
              </span>
              {isRunning ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Wand2 className="h-4 w-4 shrink-0 text-on-surface-variant transition-colors group-hover:text-primary" />
              )}
            </button>
          </li>
        );
      })}
      {canUndo && (
        <li>
          <button
            type="button"
            disabled={disabled}
            onClick={onUndo}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-on-surface/30 bg-surface px-3 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo last revision
          </button>
        </li>
      )}
    </ul>
  );

  return (
    <>
      <div className="hidden rounded-2xl border-2 border-on-surface bg-surface/95 p-5 qc-hard-shadow-sm lg:block">
        <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
          ✨ Improve
        </p>
        <h3 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
          One-tap revisions
        </h3>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Rewrites the whole essay toward one goal. Stays grounded in your facts.
        </p>
        {list}
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border-2 border-on-surface bg-surface/95 px-4 py-3 qc-hard-shadow-sm"
        >
          <span className="font-display text-label-lg font-bold text-on-surface">
            ✨ Improve essay
          </span>
          <ChevronDown
            className={`h-4 w-4 text-on-surface transition-transform ${openMobile ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {openMobile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-1 pb-1">{list}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// AI-assist popup for intake fields
// -----------------------------------------------------------------------------

function AssistTrigger({
  sessionId,
  token,
  question,
  currentValue,
  hasValue,
  onAccept,
}: {
  sessionId: string;
  token: string;
  question: string;
  currentValue: string;
  hasValue: boolean;
  onAccept: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-surface/30 bg-gradient-to-r from-primary/10 via-secondary-container/40 to-primary/10 px-3 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-all hover:-translate-y-0.5 hover:border-on-surface active:scale-[0.97]"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {hasValue ? "Improve" : "Help me write this"}
      </button>
      <AnimatePresence>
        {open && (
          <AssistPopover
            sessionId={sessionId}
            token={token}
            question={question}
            initialNotes={currentValue}
            onClose={() => setOpen(false)}
            onAccept={(t) => {
              onAccept(t);
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssistPopover({
  sessionId,
  token,
  question,
  initialNotes,
  onClose,
  onAccept,
}: {
  sessionId: string;
  token: string;
  question: string;
  initialNotes: string;
  onClose: () => void;
  onAccept: (text: string) => void;
}) {
  const reduce = useReducedMotion();
  const assist = useAction(api.essays.assistAnswer);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [text, setText] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const run = useCallback(async () => {
    setStatus("loading");
    try {
      const res = (await assist({ sessionId, token, question, notes, lang: "en" })) as
        | { ok: true; text: string }
        | { error: string };
      if ("error" in res) {
        setStatus("error");
        return;
      }
      setText(res.text);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [assist, sessionId, token, question, notes]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        ref={ref}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-label-md font-bold text-on-surface">✨ AI assist</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Drop rough notes — we'll turn them into 2–4 honest sentences. We never invent facts.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="rough notes, fragments, anything…"
          className="mt-3 w-full resize-y rounded-lg border-2 border-on-surface/25 bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
        />

        {status === "ready" && text && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22 }}
            className="mt-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-3 text-body-sm text-on-surface"
          >
            {text}
          </motion.div>
        )}
        {status === "loading" && (
          <div className="relative mt-3 h-16 overflow-hidden rounded-lg bg-surface-container">
            <motion.div
              className="absolute inset-y-0 w-1/3"
              animate={reduce ? undefined : { x: ["-100%", "300%"] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(53,37,205,0.18), transparent)",
              }}
            />
          </div>
        )}
        {status === "error" && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border-2 border-on-surface/20 bg-error-container/30 p-2 text-label-sm text-on-surface">
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> That didn't work
            </span>
            <button
              type="button"
              onClick={() => void run()}
              className="rounded-md border-2 border-on-surface px-2 py-0.5 text-label-sm font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {status === "ready" && text ? (
            <>
              <button
                type="button"
                onClick={() => void run()}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/30 bg-surface px-3 py-1.5 text-label-sm font-semibold text-on-surface hover:border-on-surface"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
              <button
                type="button"
                onClick={() => onAccept(text)}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-1.5 font-display text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <Save className="h-3.5 w-3.5" /> Use this
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-label-sm font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={status === "loading"}
                onClick={() => void run()}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-1.5 font-display text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Write it for me
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function renderText(r: EssayResult): string {
  if (r.fullText) return r.fullText;
  return r.preview;
}

// Deterministic pseudo-score so the same essay always shows the same number.
function scoreFor(essayId: string): number {
  let h = 0;
  for (let i = 0; i < essayId.length; i++) h = (h * 31 + essayId.charCodeAt(i)) >>> 0;
  // Land between 62 and 78 — promising but clearly not polished.
  return 62 + (h % 17);
}

const WEAK_AREAS = [
  { key: "hook", label: "Hook", note: "Opening doesn't fully grab the reader yet." },
  {
    key: "specificity",
    label: "Specificity",
    note: "A few generic phrases — needs concrete sensory detail.",
  },
  { key: "ending", label: "Ending", note: "Closes softly; needs an earned, resonant final beat." },
  {
    key: "voice",
    label: "Voice",
    note: "Some passages read flat — your real voice can shine more.",
  },
  {
    key: "reflection",
    label: "Reflection",
    note: "Tell us what this changed in you, not just what happened.",
  },
];

function weakAreasFor(essayId: string) {
  let h = 0;
  for (let i = 0; i < essayId.length; i++) h = (h * 17 + essayId.charCodeAt(i)) >>> 0;
  const shuffled = [...WEAK_AREAS].sort((a, b) => {
    const ha = (h + a.key.charCodeAt(0) * 7) % 100;
    const hb = (h + b.key.charCodeAt(0) * 7) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

function FreeTrialScoreBanner({ essayId, token }: { essayId: string; token: string | undefined }) {
  const reduce = useReducedMotion();
  const score = scoreFor(essayId);
  const areas = weakAreasFor(essayId);
  const ringDeg = Math.round((score / 100) * 360);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-8 overflow-hidden rounded-2xl border-2 border-on-surface bg-gradient-to-br from-secondary-container/80 to-surface p-5 qc-hard-shadow sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Score ring */}
        <div className="flex shrink-0 items-center gap-4">
          <div
            className="relative grid h-24 w-24 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-primary) ${ringDeg}deg, color-mix(in oklab, var(--color-on-surface) 15%, transparent) ${ringDeg}deg)`,
            }}
            aria-label={`Score ${score} of 100`}
          >
            <div className="grid h-[78px] w-[78px] place-items-center rounded-full border-2 border-on-surface bg-surface">
              <div className="text-center leading-none">
                <p className="font-display text-headline-md font-bold text-on-surface">{score}</p>
                <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
                  / 100
                </p>
              </div>
            </div>
          </div>
          <div className="sm:hidden">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-on-surface/10 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
              <Sparkles className="h-3 w-3" /> First draft
            </p>
            <p className="mt-1 font-display text-headline-sm font-bold text-on-surface">
              Promising — not polished yet
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="hidden sm:block">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-on-surface/10 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
              <Sparkles className="h-3 w-3" /> First draft · free
            </p>
            <h3 className="mt-2 font-display text-headline-md font-bold text-on-surface">
              Promising start — not admissions-ready yet
            </h3>
          </div>
          <p className="mt-2 text-body-md text-on-surface/80">
            Your free draft is below. We spotted{" "}
            <span className="font-bold text-on-surface">{areas.length} weak areas</span> holding the
            score down. Polish them and you'll typically land 90+.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {areas.map((a) => (
              <li
                key={a.key}
                className="rounded-lg border-2 border-on-surface/15 bg-surface/80 p-3"
              >
                <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-bold text-on-surface">
                  <Lock className="h-3 w-3 text-primary" /> {a.label}
                </p>
                <p className="mt-1 text-label-sm text-on-surface-variant">{a.note}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <UnlockButton
              token={token}
              label={`Polish weak areas - $${PRICE_MVP}/month`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            />
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              Also unlocks every university match. Billed monthly. Cancel anytime.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EssayBody({
  text,
  onPlaceholderClick,
}: {
  text: string;
  onPlaceholderClick?: (placeholder: string, occurrenceIndex: number) => void;
}) {
  // Highlight [ADD: …] placeholders inline; make them clickable when a
  // handler is provided so the user can fill each moment one at a time.
  const parts = text.split(/(\[ADD:[^\]]+\])/g);
  let occurrence = -1;
  return (
    <article className="mt-6 whitespace-pre-wrap text-body-lg leading-relaxed text-on-surface">
      {parts.map((p, i) => {
        if (!p.startsWith("[ADD:")) return <span key={i}>{p}</span>;
        occurrence += 1;
        const myOcc = occurrence;
        const className =
          "rounded-md bg-secondary-container px-1.5 py-0.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface";
        if (!onPlaceholderClick) {
          return (
            <mark key={i} className={className}>
              {p}
            </mark>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPlaceholderClick(p, myOcc)}
            className={`${className} cursor-pointer border-2 border-on-surface/30 underline decoration-dotted underline-offset-4 transition-colors hover:border-on-surface hover:bg-primary hover:text-white`}
            title="Click to fill this moment in"
          >
            {p}
          </button>
        );
      })}
    </article>
  );
}

const LOCKED_FILLER =
  "The remainder of your essay continues here — a tightly-edited middle that builds on the opening and lands on a clear, earned conclusion the admissions reader will remember. Unlock to read every line, copy the full text, and start filling in your specifics.";

// -----------------------------------------------------------------------------
// Splash
// -----------------------------------------------------------------------------

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center pt-28">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
