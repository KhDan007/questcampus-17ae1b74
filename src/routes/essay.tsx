import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
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
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { NavV2 } from "@/components/landing2/NavV2";
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
      { value: "place", label: "a place that mattered", seed: "The place I keep coming back to is " },
      { value: "wrong", label: "a time I was wrong", seed: "I was completely wrong about " },
      { value: "couldnt-fix", label: "something I couldn't fix", seed: "There was one thing I couldn't fix: " },
      { value: "small-win", label: "a small win nobody saw", seed: "A small win nobody saw — " },
      { value: "changed-mind", label: "a moment I changed my mind", seed: "I changed my mind the day " },
    ],
    textPlaceholder: "The first time I…",
    microcopy:
      "Name the real thing. \u201cMy grandmother\u2019s stuck metronome\u201d beats \u201ca musical experience.\u201d",
    minChars: 80,
  },
  {
    key: "whyField",
    label:
      "When did you first get pulled toward what you want to study? Describe the actual moment, not the subject.",
    required: true,
    primes: [
      { value: "building", label: "Building / making things", seed: "Building / making things — " },
      { value: "people", label: "Working with people", seed: "Working with people — " },
      { value: "ideas", label: "Big ideas / theory", seed: "Big ideas / theory — " },
      { value: "fixing", label: "Fixing what's broken", seed: "Fixing what\u2019s broken — " },
    ],
    textPlaceholder: "I realized I liked …",
    microcopy:
      "We never invent facts — anything you don\u2019t tell us shows up as a [fill-this-in] marker.",
    minChars: 60,
  },
  {
    key: "turningPoint",
    label:
      "A real difficulty, failure, or change you went through — and what you actually did, step by step.",
    required: true,
    primes: [
      { value: "failure", label: "a thing that failed first", seed: "My first attempt failed because " },
      { value: "family", label: "a family situation", seed: "At home, " },
      { value: "academic", label: "an academic wall", seed: "I hit a wall in " },
      { value: "belonging", label: "not belonging", seed: "I didn\u2019t belong when " },
      { value: "health", label: "a health setback", seed: "After " },
    ],
    textPlaceholder: "What I actually did, step by step…",
    microcopy: "Concrete actions, not feelings. What did you try first? What changed?",
    minChars: 80,
  },
  {
    key: "signatureThing",
    label: "One thing you've made, built, led, fixed, or kept going. What was it, and what was hard about it?",
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
    label: "A person who shaped you — and one specific thing they did or said (not just who they are).",
    optional: true,
    shortText: true,
    textPlaceholder: "e.g. my grandmother, who told me to \u201cfinish the row before you stop\u201d",
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

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

function EssayPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
          setMatchesErr(true);
          return;
        }
        setMatches((res as FreeRec).results ?? []);
      } catch {
        if (!cancelled) setMatchesErr(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, token, recommend]);

  // ---- Form state
  const [step, setStep] = useState<"target" | "questions" | "result">("target");
  const [target, setTarget] = useState<{ externalId?: string; name: string } | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});

  // ---- Generation
  const generate = useAction(api.essays.generate);
  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [genError, setGenError] = useState<EssayError["error"] | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);

  // Live entitlement — flips to paid:true after Stripe webhook lands.
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = entitlement?.paid === true;

  // Re-fetch the full essay once the user pays.
  const essayDoc = useQuery(
    api.essays.getEssay,
    token && result?.essayId ? { token, essayId: result.essayId } : "skip",
  ) as EssayResult | null | undefined;

  useEffect(() => {
    if (!result || result.locked === false) return;
    if (essayDoc && essayDoc.locked === false && essayDoc.fullText) {
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
    } catch {
      setGenStatus("error");
      setGenError("generation_failed");
    }
  }, [sessionId, token, generate, answers, target]);

  const canSubmitQuestions = useMemo(() => {
    // Require all ⭐ story questions to have meaningful free-text.
    for (const q of QUESTIONS) {
      if (!q.required) continue;
      const t = answers[q.key]?.text?.trim() ?? "";
      if (t.length < 20) return false;
    }
    return true;
  }, [answers]);

  // Past essays list (logged-in)
  const past = useQuery(api.essays.listEssays, token ? { token } : "skip") as
    | { essayId: string; targetName?: string; wordCount: number; preview: string; createdAt: number }[]
    | undefined;

  if (!sessionId) {
    return (
      <>
        <LivingBackground />
        <NavV2 />
        <Splash />
      </>
    );
  }

  return (
    <>
      <LivingBackground />
      <NavV2 />
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
            Grounded in what you actually told us — never invented. The opening is
            free. Unlock the full essay for ${PRICE_MVP} (one time, also unlocks all
            your university matches).
          </p>
        </motion.div>

        <div className="mt-10">
          <Stepper step={step} />
        </div>

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
              />
            </StepWrap>
          )}

          {step === "result" && result && (
            <StepWrap key="result">
              <ResultView
                result={result}
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

        {past && past.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-headline-md font-bold text-on-surface">
              My personal statements
            </h2>
            <ul className="mt-5 grid gap-3">
              {past.map((p) => (
                <li
                  key={p.essayId}
                  className="flex items-start gap-3 rounded-xl border-2 border-on-surface/15 bg-surface/80 p-4 backdrop-blur-sm"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="font-display text-label-lg font-bold text-on-surface">
                      {p.targetName ?? "Common App essay"} · {p.wordCount} words
                    </p>
                    <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                      {p.preview}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
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
            {i < items.length - 1 && (
              <span aria-hidden className="h-[2px] w-8 bg-on-surface/20" />
            )}
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
        Picking a target lets us tune the essay to the school's culture. You can
        also write a generic Common App essay.
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
          <AlertCircle className="h-4 w-4" /> Couldn't load your matches — you can
          still write a generic essay.
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!value}
          onClick={onNext}
          className="group inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--qc-hard-shadow)]"
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
}: {
  answers: AnswerMap;
  setAnswers: (next: AnswerMap | ((prev: AnswerMap) => AnswerMap)) => void;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  loading: boolean;
  error: EssayError["error"] | null;
  token: string | undefined;
}) {
  const setField = (key: string, patch: Partial<AnswerVal>) =>
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  return (
    <div className="rounded-2xl border-2 border-on-surface bg-surface/90 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
      <h2 className="font-display text-headline-md font-bold text-on-surface">
        Tell us your story
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Short answers are fine. Free-text specifics are what make the essay
        non-generic — even one concrete detail per question matters.
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

              {/* Choice-only field (voice) */}
              {isChoiceOnly && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.choices!.map((c) => {
                    const active = v.choice === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setField(q.key, { choice: active ? undefined : c.value })
                        }
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
                    className="mt-3 w-full resize-y rounded-lg border-2 border-on-surface/30 bg-surface px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
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
                  className="mt-3 w-full rounded-lg border-2 border-on-surface/30 bg-surface px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
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
                label={`Unlock for $${PRICE_MVP} & generate`}
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
          Fill in the three required story questions (a sentence or two each) to generate.
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
      return `Generating a personal statement is a paid feature ($${PRICE_MVP} one-time). Unlock once and your essay generates instantly from your answers — no quiz required.`;
    case "trial_used":
      return `You've used your free generation. Unlock the full essay for $${PRICE_MVP} to generate again.`;
    case "generation_failed":
      return "The model hiccuped. Try generating again.";
  }
}

// -----------------------------------------------------------------------------
// Step 3: Result
// -----------------------------------------------------------------------------

function ResultView({
  result,
  isPaid,
  token,
  onRegenerate,
}: {
  result: EssayResult;
  isPaid: boolean;
  token: string | undefined;
  onRegenerate: () => void;
}) {
  const locked = result.locked && !result.fullText;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border-2 border-on-surface bg-surface/95 p-6 qc-hard-shadow backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
              Common App essay · {result.wordCount} words
            </p>
            <h2 className="mt-1 font-display text-headline-md font-bold text-on-surface">
              {result.targetName ?? "Your personal statement"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Edit answers
          </button>
        </div>

        <EssayBody text={renderText(result)} />

        {locked && (
          <div className="relative mt-2">
            <div className="pointer-events-none select-none text-body-md leading-relaxed text-on-surface/70 blur-[5px]">
              {LOCKED_FILLER}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-surface/80 to-surface p-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-secondary-container">
                <Lock className="h-5 w-5 text-on-surface" />
              </div>
              <h3 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
                Reveal the full essay
              </h3>
              <p className="mt-2 max-w-md text-body-sm text-on-surface-variant">
                One ${PRICE_MVP} unlock reveals this essay in full AND every
                university match — forever. No subscription.
              </p>
              <div className="mt-5">
                <UnlockButton
                  token={token}
                  label={`Reveal full essay – $${PRICE_MVP}`}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-7 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                />
              </div>
              {isPaid && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-label-sm text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming
                  payment — your essay will reveal automatically.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-5">
        {result.placeholders && result.placeholders.length > 0 && (
          <div className="rounded-2xl border-2 border-on-surface bg-secondary-container p-5 qc-hard-shadow-sm">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-on-surface/70">
              Make it yours
            </p>
            <h3 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
              Fill these in
            </h3>
            <p className="mt-2 text-body-sm text-on-surface/80">
              We left {result.placeholders.length} blank{result.placeholders.length === 1 ? "" : "s"}{" "}
              instead of inventing details. Replace each <code>[ADD: …]</code> with
              your real story.
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
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Zero invented facts — only what you told us.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Fact-check pass strips unsupported specifics.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Common App ready (650 words).</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function renderText(r: EssayResult): string {
  if (r.fullText && !r.locked) return r.fullText;
  return r.preview;
}

function EssayBody({ text }: { text: string }) {
  // Highlight [ADD: …] placeholders inline.
  const parts = text.split(/(\[ADD:[^\]]+\])/g);
  return (
    <article className="mt-6 whitespace-pre-wrap text-body-lg leading-relaxed text-on-surface">
      {parts.map((p, i) =>
        p.startsWith("[ADD:") ? (
          <mark
            key={i}
            className="rounded-md bg-secondary-container px-1.5 py-0.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
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
