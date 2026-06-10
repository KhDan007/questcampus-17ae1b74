"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/useAuth";
import { NavBar } from "@/components/landing/NavBar";
import { getSessionId } from "@/lib/onboarding/session";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/success")({
  head: () => ({ meta: [{ title: "QuestCampus — Unlocking your matches" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    checkout_id: typeof s.checkout_id === "string" ? s.checkout_id : undefined,
  }),
  component: UnlockSuccessPage,
});

function UnlockSuccessPage() {
  const navigate = useNavigate();
  const token = auth.getSession()?.token;
  const recommend = useAction(api.rag.recommend.recommend);
  const [primed, setPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const { isAdmin } = useAuth();
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = isAdmin || entitlement?.paid === true;

  useEffect(() => {
    if (!isPaid || primed) return;
    let cancelled = false;
    (async () => {
      try {
        const sessionId = getSessionId();
        if (!sessionId || !token) return;
        await recommend({ sessionId, token, plan: "paid", force: true });
        if (!cancelled) {
          setPrimed(true);
          setTimeout(() => navigate({ to: "/profile" }), 800);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load matches.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaid, primed, recommend, token, navigate]);

  return (
    <>
      <NavBar variant="minimal" />
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="mx-auto max-w-[520px] text-center">
          {!token ? (
            <SignedOutState />
          ) : isPaid ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-3xl text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)]">
                🎉
              </span>
              <h1 className="mt-6 text-display-lg-mobile text-on-background">
                {t("unlockOk.title")}
              </h1>
              <p className="mt-3 text-body-lg text-on-surface-variant">
                {primed ? t("unlockOk.taking") : t("unlockOk.loading")}
              </p>
              {error && <p className="mt-3 text-label-sm text-error">{error}</p>}
              <Link
                to="/profile"
                className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
              >
                {t("unlockOk.go")}
              </Link>
            </motion.div>
          ) : (
            <WaitingState />
          )}
        </div>
      </main>
    </>
  );
}

function WaitingState() {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="mx-auto block h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
      <h1 className="mt-6 text-headline-md text-on-background">{t("unlockOk.waiting")}</h1>
      <p className="mt-3 text-body-md text-on-surface-variant">{t("unlockOk.waitingBody")}</p>
    </motion.div>
  );
}

function SignedOutState() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="text-headline-md text-on-background">{t("unlockOk.signedOutTitle")}</h1>
      <p className="mt-3 text-body-md text-on-surface-variant">{t("unlockOk.signedOutBody")}</p>
      <Link
        to="/signin"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary-container px-6 text-label-md text-on-primary"
      >
        {t("unlockOk.signin")}
      </Link>
    </div>
  );
}
