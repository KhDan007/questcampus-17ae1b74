"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
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
      <main className="flex min-h-screen items-center justify-center bg-cream px-6" style={{ paddingTop: 64 }}>
        <div className="mx-auto max-w-[520px] text-center">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="#111111" strokeWidth="3" className="mx-auto" aria-hidden>
            <circle cx="60" cy="60" r="48" />
            <polygon points="60,22 70,60 60,98 50,60" fill="#111111" />
          </svg>
          <h1 className="mt-6 font-display text-ink" style={{ fontWeight: 700, fontSize: 36, lineHeight: 1.1 }}>
            {t("unlockX.title")}
          </h1>
          <p className="mt-3 font-body text-ink-muted" style={{ fontSize: 16 }}>
            {t("unlockX.body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/profile" className="bc-btn bc-btn-outline">← {t("unlockX.back")}</Link>
            <Link to="/unlock" className="bc-btn">{t("unlockX.tryAgain")} →</Link>
          </div>
        </div>
      </main>
    </>
  );
}
