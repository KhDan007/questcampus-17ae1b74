import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getSessionId } from "@/lib/onboarding/session";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { NavBar } from "@/components/landing/NavBar";
import { auth } from "@/lib/auth/client";
import type { Answers } from "@/lib/onboarding/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "QuestCampus — Start your profile" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const token = auth.getSession()?.token;

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const profile = useQuery(
    api.onboarding.getActive,
    sessionId ? { sessionId, token: token ?? undefined } : "skip",
  );

  if (!sessionId || profile === undefined) {
    return (
      <>
        <NavBar variant="minimal" />
        <Splash />
      </>
    );
  }

  const resumeStep = profile?.currentStep ?? 1;
  const inProgress = !!profile && !profile.completed && resumeStep > 1;
  const answers: Answers = inProgress ? ((profile!.answers as Answers) ?? {}) : {};
  const firstName =
    typeof answers.firstName === "string" ? answers.firstName : undefined;

  if (inProgress && !started) {
    return (
      <>
        <NavBar variant="minimal" />
        <WelcomeBack
          name={firstName}
          step={resumeStep}
          onResume={() => setStarted(true)}
          onRestart={() => setStarted(true)}
        />
      </>
    );
  }

  return (
    <>
      <NavBar variant="minimal" />
      <OnboardingFlow
        sessionId={sessionId}
        initialAnswers={answers}
        initialStep={inProgress ? resumeStep : 1}
      />
    </>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <motion.div
        className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function WelcomeBack({
  name,
  step,
  onResume,
}: {
  name?: string;
  step: number;
  onResume: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <span className="inline-block rounded-full bg-primary-fixed px-3 py-1 text-label-sm font-medium uppercase text-primary">
          Welcome back
        </span>
        <h1 className="mt-6 text-display-lg-mobile text-on-background">
          Welcome back{name ? `, ${name}` : ""} 👋
        </h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          Pick up right where you left off — you were on step {step} of 22.
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary-container px-7 text-label-md text-on-primary shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)] transition-colors hover:bg-primary"
        >
          Continue where I left off →
        </button>
      </motion.div>
    </div>
  );
}
