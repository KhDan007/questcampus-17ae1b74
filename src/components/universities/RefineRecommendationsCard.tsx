"use client";

import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, ArrowRight, CheckCircle2 } from "lucide-react";

// Shown on the /universities route once the user has already refined their
// recommendations at least once. It moves the "refine" CTA out of the
// dashboard's "next step" slot but keeps it discoverable where the user is
// actively browsing their schools.
export function RefineRecommendationsCard({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-5 sm:mt-8"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm">
              <Compass className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Refined once — re-rank any time
              </p>
              <h2 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
                Refine your recommendations
              </h2>
              <p className="mt-1 max-w-2xl text-body-md text-on-surface/80">
                Update your goals, learning style, or constraints and we'll re-rank these matches
                with the new signal.
              </p>
            </div>
          </div>
          <Link
            to={isAuthenticated ? "/onboarding" : "/signin"}
            search={isAuthenticated ? undefined : ({ redirect: "/onboarding" } as never)}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-display text-label-md font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Refine again
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
