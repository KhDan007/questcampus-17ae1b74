"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { NavBar } from "@/components/landing/NavBar";
import { getSessionId } from "@/lib/onboarding/session";

export const Route = createFileRoute("/unlock/success")({
  head: () => ({ meta: [{ title: "QuestCampus — Unlocking your matches" }] }),
  // `session_id` is informational only — never grants access. The webhook
  // is the only path that flips entitlement on the backend.
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: UnlockSuccessPage,
});

function UnlockSuccessPage() {
  const navigate = useNavigate();
  const token = auth.getSession()?.token;
  const recommend = useAction(api.rag.recommend.recommend);
  const [primed, setPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live, reactive — flips to {paid:true} as soon as the Stripe webhook lands.
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const isPaid = entitlement?.paid === true;

  // Once entitlement flips, force-refresh the paid recommendation cache so
  // /profile renders the full list immediately when the user lands there.
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
          // Brief moment so the user sees the success state, then redirect.
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
                You&apos;re unlocked!
              </h1>
              <p className="mt-3 text-body-lg text-on-surface-variant">
                {primed
                  ? "Taking you to your full match list…"
                  : "Loading your full safety, target & reach list…"}
              </p>
              {error && (
                <p className="mt-3 text-label-sm text-error">{error}</p>
              )}
              <Link
                to="/profile"
                className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
              >
                Go to my matches →
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
      <h1 className="mt-6 text-headline-md text-on-background">
        Finalizing your payment…
      </h1>
      <p className="mt-3 text-body-md text-on-surface-variant">
        This usually takes just a couple of seconds. Stripe confirms your
        payment, then your full list unlocks automatically — no refresh needed.
      </p>
    </motion.div>
  );
}

function SignedOutState() {
  return (
    <div>
      <h1 className="text-headline-md text-on-background">Sign in to continue</h1>
      <p className="mt-3 text-body-md text-on-surface-variant">
        Sign in with the same account you used at checkout and your full list
        will unlock automatically.
      </p>
      <Link
        to="/signin"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary-container px-6 text-label-md text-on-primary"
      >
        Sign in →
      </Link>
    </div>
  );
}
