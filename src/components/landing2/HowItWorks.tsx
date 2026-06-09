"use client";

import { motion } from "framer-motion";
import { ListChecks, Sparkles, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: ListChecks,
    title: "Answer 5 questions",
    body: "A 60-second conversation about you — grades, goals, money, geography. No essays, no account.",
  },
  {
    icon: Sparkles,
    title: "AI matches you",
    body: "We scan 11,000+ universities and rank the ones that actually want a profile like yours.",
  },
  {
    icon: Trophy,
    title: "Unlock your full list",
    body: "Get all 20+ Safety, Target & Reach matches — with scholarships, deadlines, and why each fits.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-20 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-(--container-content)">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-on-surface sm:text-display-lg">
            Three steps. <span className="qc-text-gradient">One honest list.</span>
          </h2>
        </motion.div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          {/* connecting line on desktop */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[8%] right-[8%] top-[58px] hidden h-[3px] bg-gradient-to-r from-primary via-primary-container to-secondary-container md:block"
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="relative z-10 mb-6 inline-flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-on-surface bg-surface-container-lowest qc-hard-shadow">
                <step.icon className="h-6 w-6 text-primary" strokeWidth={2.2} />
                <span className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary font-[var(--font-label)] text-label-sm font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-headline-md text-on-surface">{step.title}</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
