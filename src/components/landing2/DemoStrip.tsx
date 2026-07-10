"use client";

import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";

/**
 * Signed-out demo call-to-action. The demo needs an account to run against the
 * visitor's own answers, so this routes into signup → onboarding → demo. It does
 * not attempt to launch the demo for a logged-out visitor.
 */
export function DemoStrip() {
  const reduce = useReducedMotion();
  const { isAuthenticated } = useAuth();
  return (
    <section className="relative px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-(--container-content)">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-5 rounded-xl border-2 border-on-surface bg-tertiary p-6 qc-hard-shadow sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-surface text-tertiary qc-hard-shadow-sm">
              <Play className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-white/80">
                See it work
              </p>
              <h2 className="mt-0.5 font-display text-headline-lg font-bold text-white">
                Watch it apply to 3 universities
              </h2>
              <p className="mt-1 max-w-xl text-body-md text-white/90">
                We open a live browser and fill three real application portals from your answers.
                Nothing is submitted. Free to run on your own profile.
              </p>
            </div>
          </div>
          <Link
            to={isAuthenticated ? "/demo" : "/signin"}
            search={(isAuthenticated ? undefined : { redirect: "/onboarding?next=demo" }) as never}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-on-surface bg-surface px-6 py-3.5 font-display text-headline-sm font-bold text-tertiary qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Watch it apply <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
