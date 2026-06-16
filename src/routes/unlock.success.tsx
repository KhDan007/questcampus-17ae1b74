"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useAction, useConvex } from "convex/react";
import { ArrowRight, PartyPopper, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/success")({
  head: () => ({ meta: [{ title: "Unlocking your matches — QuestCampus" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    checkout_id: typeof s.checkout_id === "string" ? s.checkout_id : undefined,
  }),
  component: UnlockSuccessPage,
});

function UnlockSuccessPage() {
  const navigate = useNavigate();
  const token = auth.getSession()?.token;
  const recommend = useAction(api.rag.recommend.recommend);
  const convex = useConvex();
  const [primed, setPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const slowTimer = useRef<number | null>(null);
  const { t } = useI18n();
  const reduce = useReducedMotion();

  const { isAdmin } = useAuth();
  const entitlement = useQuery(
    api.payments.entitlement,
    token ? { token } : "skip",
  ) as { paid: boolean } | undefined;
  const isPaid = isAdmin || entitlement?.paid === true;

  // Show "still finalizing" after ~15s without paid:true
  useEffect(() => {
    if (isPaid) {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      setSlow(false);
      return;
    }
    if (slowTimer.current) window.clearTimeout(slowTimer.current);
    slowTimer.current = window.setTimeout(() => setSlow(true), 15000);
    return () => {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    };
  }, [isPaid, retryTick]);

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
          setTimeout(() => navigate({ to: "/universities" }), 800);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load matches.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaid, primed, recommend, token, navigate]);

  const onRetry = () => {
    setSlow(false);
    setRetryTick((n) => n + 1);
    // Touch convex client to ensure reactive refresh
    void convex;
  };

  return (
    <>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-0 right-[-10%] h-[420px] w-[420px] rounded-full bg-secondary-container/60 blur-3xl" />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[560px] rounded-3xl border-2 border-on-surface bg-surface p-8 text-center qc-hard-shadow sm:p-10"
        >
          {!token ? (
            <SignedOutState />
          ) : isPaid ? (
            <>
              <motion.span
                initial={reduce ? false : { scale: 0.6, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
                className="inline-grid h-16 w-16 place-items-center rounded-2xl border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm"
              >
                <PartyPopper className="h-7 w-7" />
              </motion.span>
              <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
                {t("unlockOk.title")}
              </h1>
              <p className="mt-3 text-body-lg text-on-surface-variant">
                {primed ? t("unlockOk.taking") : t("unlockOk.loading")}
              </p>
              {error && <p className="mt-3 text-label-sm text-error">{error}</p>}
              <Link
                to="/universities"
                className="group mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-on-surface bg-primary px-7 font-[var(--font-label)] text-label-lg font-bold text-white transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none"
              >
                {t("unlockOk.go")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          ) : (
            <WaitingState slow={slow} onRetry={onRetry} />
          )}
        </motion.div>
      </main>
    </>
  );
}

function WaitingState({ slow, onRetry }: { slow: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div>
      <span className="inline-grid h-14 w-14 place-items-center rounded-2xl border-2 border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
        {slow ? "Still finalizing payment" : t("unlockOk.waiting")}
      </h1>
      <p className="mt-3 text-body-md text-on-surface-variant">
        {slow
          ? "This usually takes a few seconds. If it's stuck, try again."
          : t("unlockOk.waitingBody")}
      </p>
      {slow && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border-2 border-on-surface bg-primary px-5 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

function SignedOutState() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="font-display text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
        {t("unlockOk.signedOutTitle")}
      </h1>
      <p className="mt-3 text-body-md text-on-surface-variant">
        {t("unlockOk.signedOutBody")}
      </p>
      <Link
        to="/signin"
        className="group mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-on-surface bg-primary px-6 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        {t("unlockOk.signin")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
