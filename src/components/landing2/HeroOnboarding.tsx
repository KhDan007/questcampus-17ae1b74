"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowRight, Search, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HeroQuiz, type QuizAnswers } from "./HeroQuiz";
import { ResultsReveal } from "./ResultsReveal";
import { useAuth } from "@/lib/auth/useAuth";

export function HeroOnboarding() {
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<QuizAnswers | null>(null);
  const { isAuthenticated } = useAuth();
  const [warnOpen, setWarnOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  function onComplete(a: QuizAnswers) {
    setAnswers(a);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  function gate(e: React.SyntheticEvent) {
    if (!isAuthenticated || ack) return;
    e.preventDefault();
    e.stopPropagation();
    setWarnOpen(true);
  }

  return (
    <>
      <section id="onboarding" className="relative isolate px-4 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-36">
        <div className="mx-auto grid max-w-(--container-content) gap-8 sm:gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-display-lg-mobile text-on-surface sm:text-display-lg lg:text-[clamp(3rem,5.5vw,4.75rem)] lg:leading-[1.02]"
            >
              Your entire admissions journey, <br className="hidden sm:block" />
              <span className="qc-text-gradient">in one place.</span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-6 max-w-xl text-body-lg text-on-surface-variant"
            >
              Search 11,000+ universities, get an AI-matched shortlist, and build every
              application from one workspace — purpose-built for international and domestic
              applicants. <strong className="text-on-surface">Free to start.</strong>
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-6 flex flex-wrap items-center gap-4 font-[var(--font-label)] text-label-md text-on-surface-variant"
            >
              <span className="inline-flex items-center gap-2">
                <Dot /> Search & shortlist
              </span>
              <span className="inline-flex items-center gap-2">
                <Dot /> AI-matched fit
              </span>
              <span className="inline-flex items-center gap-2">
                <Dot /> Application builder
              </span>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.34 }}
              className="mt-6"
            >
              <Link
                to="/universities"
                search={{ q: "" }}
                className="group inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <Search className="h-4 w-4" />
                Search universities
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                Browse the full catalog or jump straight to schools you already know.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <div
              ref={wrapRef}
              onPointerDownCapture={gate}
              onKeyDownCapture={gate}
              className="w-full max-w-[640px]"
            >
              <HeroQuiz onComplete={onComplete} />
            </div>
          </motion.div>
        </div>
      </section>

      <div id="results" />
      <ResultsReveal visible={!!answers} answers={answers} />

      <WarnModal
        open={warnOpen}
        reduce={!!reduce}
        onClose={() => setWarnOpen(false)}
        onAck={() => {
          setAck(true);
          setWarnOpen(false);
        }}
      />
    </>
  );
}

function WarnModal({
  open,
  reduce,
  onClose,
  onAck,
}: {
  open: boolean;
  reduce: boolean;
  onClose: () => void;
  onAck: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-on-surface bg-surface qc-hard-shadow"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 sm:p-7">
              <div className="inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-secondary-container px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-secondary-container">
                <AlertTriangle className="h-3.5 w-3.5" />
                Heads up
              </div>
              <h3 className="mt-4 font-display text-headline-md font-bold text-on-surface">
                This will erase your current matches
              </h3>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Re-taking the quick quiz overwrites the recommendations saved to your account. For
                sharper results, complete the detailed onboarding instead — it asks a few more
                questions and tunes your matches much better.
              </p>

              <a
                href="/dashboard"
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-5 py-3.5 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                Refine with detailed onboarding
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <button
                type="button"
                onClick={onAck}
                className="mt-3 w-full rounded-md border-2 border-on-surface/15 bg-surface-container-low px-5 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:border-on-surface"
              >
                Continue and overwrite my matches
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-primary" />;
}
