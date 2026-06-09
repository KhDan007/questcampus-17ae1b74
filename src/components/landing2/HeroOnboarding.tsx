"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { HeroQuiz, type QuizAnswers } from "./HeroQuiz";
import { ResultsReveal } from "./ResultsReveal";

export function HeroOnboarding() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  function onComplete(_a: QuizAnswers) {
    setDone(true);
    // Smooth scroll to the results section.
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  return (
    <>
      <section className="relative isolate px-5 pb-20 pt-28 sm:px-8 sm:pt-36">
        <div className="mx-auto grid max-w-(--container-content) gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Headline column */}
          <div>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-secondary-container px-3 py-1 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-secondary-container"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              AI-matched in under a minute
            </motion.span>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-display-lg-mobile text-on-surface sm:text-display-lg lg:text-[clamp(3rem,5.5vw,4.75rem)] lg:leading-[1.02]"
            >
              Find the universities <br className="hidden sm:block" />
              that <span className="qc-text-gradient">actually fit you.</span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-6 max-w-xl text-body-lg text-on-surface-variant"
            >
              Not a generic college search. A 60-second conversation that ranks 11,000+
              universities against your real grades, goals, money, and geography —{" "}
              <strong className="text-on-surface">free to start.</strong>
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-6 flex flex-wrap items-center gap-4 font-[var(--font-label)] text-label-md text-on-surface-variant"
            >
              <span className="inline-flex items-center gap-2">
                <Dot /> No signup to start
              </span>
              <span className="inline-flex items-center gap-2">
                <Dot /> 3 free matches
              </span>
              <span className="inline-flex items-center gap-2">
                <Dot /> $5 unlocks all 20+
              </span>
            </motion.div>
          </div>

          {/* Quiz column */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <HeroQuiz onComplete={onComplete} />
          </motion.div>
        </div>
      </section>

      <div id="results" />
      <ResultsReveal visible={done} />
    </>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-primary" />;
}
