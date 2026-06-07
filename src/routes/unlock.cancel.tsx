"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { NavBar } from "@/components/landing/NavBar";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/cancel")({
  head: () => ({ meta: [{ title: "QuestCampus — Checkout cancelled" }] }),
  component: UnlockCancelPage,
});

function UnlockCancelPage() {
  const { t } = useI18n();
  return (
    <>
      <NavBar variant="minimal" />
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-[480px] text-center"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-2xl">
            🙃
          </span>
          <h1 className="mt-6 text-display-lg-mobile text-on-background">
            {t("unlockX.title")}
          </h1>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            {t("unlockX.body")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/unlock"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
            >
              {t("unlockX.tryAgain")}
            </Link>
            <Link
              to="/profile"
              className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              {t("unlockX.back")}
            </Link>
          </div>
        </motion.div>
      </main>
    </>
  );
}
