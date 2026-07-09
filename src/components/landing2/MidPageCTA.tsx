"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";

export function MidPageCTA() {
  const reduce = useReducedMotion();

  function scrollToOnboarding() {
    document.getElementById("onboarding")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="relative px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-(--container-content)">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-xl border-2 border-on-surface bg-surface-container-lowest p-8 sm:p-14 qc-hard-shadow-primary"
        >
          {/* Aurora background */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
            <div
              className="animate-aurora-1 absolute -left-16 -top-16 h-[50vh] w-[50vh] rounded-full blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(255,95,93,0.30), transparent 65%)",
              }}
            />
            <div
              className="animate-aurora-2 absolute -right-16 -bottom-16 h-[50vh] w-[50vh] rounded-full blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(254,183,0,0.25), transparent 65%)",
              }}
            />
          </div>

          <div className="relative flex flex-col items-center text-center">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-md border-2 border-on-surface bg-secondary-container px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-secondary-container"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start your shortlist today
            </motion.div>

            <h2 className="mt-5 max-w-2xl text-display-lg-mobile text-on-surface sm:text-display-lg">
              Know where you stand in{" "}
              <span className="text-primary">under 60 seconds.</span>
            </h2>

            <p className="mt-4 max-w-xl text-body-lg text-on-surface-variant">
              Answer a few quick questions and get a personalized university shortlist matched to your
              profile, goals, and budget — no account required to preview.
            </p>

            <motion.button
              type="button"
              onClick={scrollToOnboarding}
              whileHover={reduce ? undefined : { scale: 1.05 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="animate-pulse-glow group mt-8 inline-flex items-center gap-3 rounded-md border-2 border-on-surface bg-primary px-8 py-4 font-display text-headline-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(179,39,44,0.45)] transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              <ArrowUp className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              Try it now
            </motion.button>

            <p className="mt-3 text-body-sm text-on-surface-variant">
              Free preview. Account only needed to save matches.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
