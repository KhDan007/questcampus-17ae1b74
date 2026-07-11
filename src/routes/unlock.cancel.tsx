"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CircleSlash } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/cancel")({
  head: () => ({ meta: [{ title: "Checkout cancelled — QuestCampus" }] }),
  component: UnlockCancelPage,
});

function UnlockCancelPage() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  return (
    <>
      <main className="relative flex min-h-screen items-center justify-center bg-surface px-4 pt-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[520px] rounded-3xl border border-on-surface/8 bg-surface-container-lowest p-8 text-center qc-soft-shadow sm:p-10"
        >
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-surface-container text-on-surface-variant">
            <CircleSlash className="h-6 w-6" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
            {t("unlockX.title")}
          </h1>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            {t("unlockX.body")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/unlock"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 font-[var(--font-label)] text-label-lg font-bold text-white transition-colors hover:bg-primary/90"
            >
              {t("unlockX.tryAgain")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("unlockX.back")}
            </Link>
          </div>
        </motion.div>
      </main>
    </>
  );
}
