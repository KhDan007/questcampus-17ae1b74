"use client";

import { motion, useReducedMotion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Lock, Sparkles, Award, GraduationCap, AlertCircle } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { QuizAnswers } from "./HeroQuiz";

type Bucket = "Safety" | "Target" | "Reach";

type Match = {
  name: string;
  location: string;
  match: number;
  bucket: Bucket;
  why: string;
  tag: string;
};

type RawResult = {
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  region?: string;
  website?: string;
  acceptanceRate?: number;
  satAvg?: number;
  costAttendance?: number;
  sizeBucket?: string;
  bucket: "safety" | "target" | "reach";
  score: number;
  why: string;
};

const LOCKED_MATCHES: Match[] = [
  {
    name: "Trinity College Dublin",
    location: "Dublin, Ireland",
    match: 86,
    bucket: "Target",
    why: "Strong English-language entry, EU funding pathways, and a course catalog that matches your interest profile.",
    tag: "EU scholarship eligible",
  },
  {
    name: "National University of Singapore",
    location: "Singapore",
    match: 84,
    bucket: "Reach",
    why: "Asia's top-ranked, with international scholarships covering tuition and stipend for high-trajectory applicants.",
    tag: "Full scholarship possible",
  },
];

const BUCKET_STYLES: Record<Bucket, { border: string; chip: string; icon: typeof Award }> = {
  Safety: {
    border: "border-l-[5px] border-l-[#3b6934]",
    chip: "bg-[#bcf0ae] text-[#073707]",
    icon: GraduationCap,
  },
  Target: {
    border: "border-l-[5px] border-l-[#2e4a7a]",
    chip: "bg-[#c7d8f0] text-[#0d2240]",
    icon: Sparkles,
  },
  Reach: {
    border: "border-l-[5px] border-l-[#5e2150]",
    chip: "bg-[#f0c7e6] text-[#3a0e2e]",
    icon: Award,
  },
};

const THINKING_STEPS = [
  "Indexing 11,000+ universities…",
  "Cross-referencing your academic profile…",
  "Filtering by financial fit…",
  "Ranking by your trajectory…",
  "Locking in your top matches…",
];

function capBucket(b: RawResult["bucket"]): Bucket {
  return (b.charAt(0).toUpperCase() + b.slice(1)) as Bucket;
}

function toMatch(r: RawResult): Match {
  const location =
    [r.city, r.state].filter(Boolean).join(", ") || r.country;
  const tag = r.acceptanceRate
    ? `${Math.round(r.acceptanceRate * 100)}% acceptance`
    : r.region || r.country;
  return {
    name: r.name,
    location,
    match: Math.max(0, Math.min(100, Math.round(r.score * 100))),
    bucket: capBucket(r.bucket),
    why: r.why,
    tag,
  };
}

export function ResultsReveal({
  visible,
  answers,
}: {
  visible: boolean;
  answers: QuizAnswers | null;
}) {
  const reduce = useReducedMotion();
  const { lang } = useI18n();
  const quickMatch = useAction(api.rag.recommend.quickMatch);

  const [thinkDone, setThinkDone] = useState(false);
  const [thinkStep, setThinkStep] = useState(0);
  const [results, setResults] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Thinking animation
  useEffect(() => {
    if (!visible) {
      setThinkDone(false);
      setThinkStep(0);
      return;
    }
    if (reduce) {
      setThinkDone(true);
      return;
    }
    setThinkDone(false);
    setThinkStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= THINKING_STEPS.length) {
        clearInterval(interval);
        setThinkDone(true);
      } else {
        setThinkStep(i);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [visible, reduce, attempt]);

  // Fetch matches
  useEffect(() => {
    if (!visible || !answers) return;
    let cancelled = false;
    setResults(null);
    setError(null);
    quickMatch({ quiz: answers, lang })
      .then((res: { results: RawResult[] }) => {
        if (cancelled) return;
        setResults((res.results ?? []).slice(0, 3).map(toMatch));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error("quickMatch failed", e);
        setError("Couldn't load matches — try again");
      });
    return () => {
      cancelled = true;
    };
  }, [visible, answers, lang, quickMatch, attempt]);

  if (!visible) return null;

  const showResults = thinkDone && results !== null;

  return (
    <section className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-(--container-content)">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Your results
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-on-surface sm:text-display-lg">
            We searched the world. <br />
            <span className="qc-text-gradient">Here's where you fit.</span>
          </h2>
        </motion.div>

        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          />
        ) : !showResults ? (
          <ThinkingState step={thinkStep} />
        ) : (
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {results!.map((m, i) => (
              <MatchCard key={`${m.name}-${i}`} match={m} delay={i * 0.12} />
            ))}

            {/* Locked cards spanning lower row */}
            <div className="relative lg:col-span-3">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {LOCKED_MATCHES.map((m, i) => (
                  <div key={m.name} className="relative">
                    <div className="pointer-events-none select-none blur-[6px] saturate-75">
                      <MatchCard match={m} delay={0.2 + i * 0.08} locked />
                    </div>
                  </div>
                ))}
                <div className="relative hidden lg:block">
                  <div className="pointer-events-none h-full select-none blur-[6px] saturate-75">
                    <MatchCard
                      match={{
                        ...LOCKED_MATCHES[0],
                        name: "University of British Columbia",
                        location: "Vancouver, Canada",
                        match: 82,
                        bucket: "Safety",
                      }}
                      delay={0.4}
                      locked
                    />
                  </div>
                </div>
              </div>

              <UnlockOverlay />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-headline-sm text-on-surface">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-2.5 font-display text-label-lg font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        Try again
      </button>
    </div>
  );
}

function ThinkingState({ step }: { step: number }) {
  return (
    <div className="mt-12">
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest p-6"
          >
            <div className="h-5 w-24 overflow-hidden rounded bg-on-surface/10">
              <div className="h-full w-full animate-shimmer-sweep" />
            </div>
            <div className="mt-4 h-7 w-3/4 overflow-hidden rounded bg-on-surface/10">
              <div className="h-full w-full animate-shimmer-sweep" />
            </div>
            <div className="mt-3 h-3 w-1/2 overflow-hidden rounded bg-on-surface/10">
              <div className="h-full w-full animate-shimmer-sweep" />
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full overflow-hidden rounded bg-on-surface/10">
                <div className="h-full w-full animate-shimmer-sweep" />
              </div>
              <div className="h-3 w-5/6 overflow-hidden rounded bg-on-surface/10">
                <div className="h-full w-full animate-shimmer-sweep" />
              </div>
              <div className="h-3 w-4/6 overflow-hidden rounded bg-on-surface/10">
                <div className="h-full w-full animate-shimmer-sweep" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-3 font-[var(--font-label)] text-label-md text-on-surface-variant">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <motion.span
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {THINKING_STEPS[step]}
        </motion.span>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  delay = 0,
  locked = false,
}: {
  match: Match;
  delay?: number;
  locked?: boolean;
}) {
  const style = BUCKET_STYLES[match.bucket];
  const Icon = style.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={locked ? undefined : { y: -4 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-on-surface bg-surface-container-lowest p-5 transition-shadow ${style.border} qc-hard-shadow hover:shadow-[6px_6px_0_0_var(--color-primary)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-bold ${style.chip}`}>
            <Icon className="h-3.5 w-3.5" />
            {match.bucket}
          </span>
        </div>
        <MatchScore value={match.match} delay={delay + 0.15} />
      </div>

      <h3 className="mt-4 text-headline-sm text-on-surface">{match.name}</h3>
      <p className="mt-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        {match.location}
      </p>

      <p className="mt-4 flex-1 text-body-md text-on-surface/80">{match.why}</p>

      <div className="mt-5 flex items-center gap-2 border-t border-on-surface/10 pt-4">
        <span className="rounded-md bg-secondary-container/40 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-secondary-container">
          {match.tag}
        </span>
      </div>
    </motion.article>
  );
}

function MatchScore({ value, delay }: { value: number; delay: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, delay, reduce]);

  return (
    <div className="flex items-baseline gap-0.5">
      <span ref={ref} className="font-display text-headline-lg font-bold text-primary">
        {n}
      </span>
      <span className="font-[var(--font-label)] text-label-md font-semibold text-primary/80">
        %
      </span>
      <span className="ml-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        match
      </span>
    </div>
  );
}

function UnlockOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="absolute inset-0 flex items-center justify-center px-4"
    >
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl border-2 border-on-surface bg-surface/95 p-6 text-center qc-hard-shadow-primary backdrop-blur-xl sm:p-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="text-headline-md text-on-surface">
          Unlock your full ranked list — 20+ matches.
        </h3>
        <p className="mt-2 text-body-md text-on-surface-variant">
          See every Safety, Target & Reach with scholarship paths, deadlines, and
          a personalized "why this fits you" for each.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3 font-[var(--font-label)]">
          <span className="text-headline-md text-on-surface/40 line-through">$9</span>
          <span className="font-display text-display-lg font-bold text-primary">$5</span>
          <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
            one-time
          </span>
        </div>

        <a
          href="/unlock"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3.5 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none animate-pulse-glow"
        >
          Unlock everything — $5
        </a>
        <p className="mt-3 font-[var(--font-label)] text-label-sm text-on-surface-variant">
          Pay once. No subscription. Most students unlock within 60 seconds.
        </p>
      </div>
    </motion.div>
  );
}
