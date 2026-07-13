"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
  X,
  PenLine,
  FileText,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { useIntakePlan, type BackendTarget } from "@/lib/apply/intake";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  open: boolean;
  targets: BackendTarget[];
  onClose: () => void;
};

const SIDE_ACTIONS = [
  {
    icon: ClipboardList,
    title: "Finish your profile",
    body: "Answer once — auto-fills every application.",
    cta: "Continue",
    to: "/dashboard",
  },
  {
    icon: PenLine,
    title: "Draft your personal statement",
    body: "Our essay assistant grounds every line in your story.",
    cta: "Open essay",
    to: "/essay",
  },
  {
    icon: FileText,
    title: "Upload your transcript",
    body: "We reuse it across every portal.",
    cta: "Add documents",
    to: "/apply",
  },
] as const;

export function ResearchProgressModal({ open, targets, onClose }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const plan = useIntakePlan(open ? targets : []);

  const rows = useMemo(() => {
    const planned = plan?.targets ?? [];
    return targets.map((t) => {
      const found = planned.find(
        (p) => p.system === t.system && p.externalId === t.externalId,
      );
      return {
        key: `${t.system}::${t.externalId}`,
        name: t.name ?? "University",
        found: found?.found ?? false,
      };
    });
  }, [targets, plan]);

  const doneCount = rows.filter((r) => r.found).length;
  const total = rows.length || 1;
  const percent = Math.round((doneCount / total) * 100);
  const allDone = doneCount === rows.length && rows.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // When every target is ready, auto-advance the user to the prep stage.
  useEffect(() => {
    if (!open || !allDone) return;
    const t = setTimeout(() => {
      onClose();
      void navigate({ to: "/dashboard" });
    }, 1200);
    return () => clearTimeout(t);
  }, [open, allDone, onClose, navigate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 backdrop-blur-sm p-4 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-on-surface/8 bg-surface-container-lowest qc-soft-shadow"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-on-surface/8 bg-primary-fixed/30 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-fixed text-on-primary-fixed-variant">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
                    Deep research
                  </p>
                  <h2 className="font-display text-headline-md font-bold text-on-surface">
                    {allDone
                      ? "Ready for the next step."
                      : t(rows.length === 1 ? "audit.researchProgress.title.one" : "audit.researchProgress.title.many", { count: rows.length })}
                  </h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {allDone
                      ? "Every requirement is in. Head to your dashboard to prep."
                      : "We're pulling every requirement and deadline. This runs in the background — you can keep working."}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                {doneCount} of {rows.length} ready · {percent}%
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
              <section>
                <h3 className="font-display text-label-lg font-bold text-on-surface">
                  Live progress
                </h3>
                <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {rows.map((r) => (
                    <li
                      key={r.key}
                      className="flex items-center gap-3 rounded-xl border border-on-surface/8 bg-surface-container/50 px-3 py-2.5"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary-fixed text-on-secondary-fixed-variant">
                        <GraduationCap className="h-4 w-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate font-display text-label-md font-bold text-on-surface">
                        {r.name}
                      </p>
                      {r.found ? (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-tertiary"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Ready
                        </motion.span>
                      ) : (
                        <span className="flex items-center gap-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Researching
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-display text-label-lg font-bold text-on-surface">
                  While you wait
                </h3>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Make the most of these minutes.
                </p>
                <ul className="mt-3 space-y-2">
                  {SIDE_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li key={a.title}>
                        <Link
                          to={a.to}
                          onClick={onClose}
                          className="group flex items-center gap-3 rounded-xl border border-on-surface/8 bg-surface-container/50 px-3 py-2.5 transition-colors hover:bg-on-surface/5"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-fixed text-on-primary-fixed-variant">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-label-md font-bold text-on-surface">
                              {a.title}
                            </p>
                            <p className="truncate text-label-sm text-on-surface-variant">
                              {a.body}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-on-surface/60 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            <div className="flex flex-col items-stretch gap-2 border-t border-on-surface/8 bg-surface-container/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-label-sm text-on-surface-variant">
                {allDone
                  ? "All set — taking you to the prep stage."
                  : "Research keeps running if you close this — track it on your dashboard."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void navigate({ to: "/dashboard" });
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
              >
                Continue to prep <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
