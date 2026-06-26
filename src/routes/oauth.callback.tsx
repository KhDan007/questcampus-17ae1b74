import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/oauth/callback")({
  head: () => ({
    meta: [
      { title: "Sign-in complete — QuestCampus" },
      {
        name: "description",
        content:
          "Google sign-in finished. You can close this tab — we'll open the QuestCampus Agent for you.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: OAuthCallbackPage,
});

const AGENT_DEEP_LINK_PREFIX = "questcampus://oauth/google/callback";
const REDIRECT_DELAY_MS = 2000;

function OAuthCallbackPage() {
  const reduce = useReducedMotion();
  const { code, state, error } = Route.useSearch();
  const redirectTimer = useRef<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const hasParams = Boolean(code && state);
  const hasError = Boolean(error);
  const deepLink =
    hasParams && code && state
      ? `${AGENT_DEEP_LINK_PREFIX}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
      : null;

  useEffect(() => {
    if (!deepLink) return;
    setRedirecting(true);
    redirectTimer.current = window.setTimeout(() => {
      window.location.href = deepLink;
    }, REDIRECT_DELAY_MS);
    return () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    };
  }, [deepLink]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-[420px] w-[420px] rounded-full bg-secondary-container/60 blur-3xl" />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-[520px] rounded-3xl border-2 border-on-surface bg-surface p-8 text-center qc-hard-shadow sm:p-10"
      >
        {hasError ? (
          <ErrorState message={error ?? "Unknown error"} />
        ) : !hasParams ? (
          <ErrorState message="Missing authorization code. Please try again." />
        ) : (
          <SuccessState deepLink={deepLink!} redirecting={redirecting} />
        )}
      </motion.div>
    </main>
  );
}

function SuccessState({ deepLink, redirecting }: { deepLink: string; redirecting: boolean }) {
  return (
    <>
      <motion.span
        initial={false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
        className="inline-grid h-16 w-16 place-items-center rounded-2xl border-2 border-on-surface bg-tertiary-container text-on-tertiary-container qc-hard-shadow-sm"
      >
        <CheckCircle2 className="h-7 w-7" />
      </motion.span>
      <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
        Sign-in complete!
      </h1>
      <p className="mt-3 text-body-lg text-on-surface-variant">You can close this window.</p>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Opening QuestCampus Agent
        {redirecting ? "…" : "."}
      </p>

      <a
        href={deepLink}
        className="group mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-on-surface bg-primary px-7 font-[var(--font-label)] text-label-lg font-bold text-white transition-all hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none"
      >
        Open QuestCampus Agent
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>

      <p className="mt-5 inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
        <Loader2 className={`h-3.5 w-3.5 ${redirecting ? "animate-spin" : "opacity-0"}`} />
        {redirecting ? "Redirecting automatically" : "Ready to open"}
      </p>
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <>
      <span className="inline-grid h-14 w-14 place-items-center rounded-2xl border-2 border-on-surface bg-error-container text-on-error-container qc-hard-shadow-sm">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
        We couldn&apos;t finish signing you in
      </h1>
      <p className="mt-3 text-body-md text-on-surface-variant">{message}</p>
      <a
        href="/signin"
        className="group mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-on-surface bg-primary px-6 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        Back to sign in
        <ArrowRight className="h-4 w-4" />
      </a>
    </>
  );
}
