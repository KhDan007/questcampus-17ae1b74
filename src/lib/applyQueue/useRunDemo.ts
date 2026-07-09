"use client";

import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import { useApplyActions } from "./client";

export type RunDemoState = {
  /**
   * Launch the live demo. If the user hasn't finished detailed onboarding yet,
   * this routes them to /onboarding (with a motivating toast) so the demo can
   * later fill their real answers instead of sample data. Otherwise it enqueues
   * a fresh demo job and navigates to it.
   */
  run: () => Promise<void>;
  /** True while a demo is being enqueued / navigated. */
  starting: boolean;
  /** Human-readable error from the last attempt, or null. */
  error: string | null;
};

/** The onboarding doc shape we care about — just the completion flag. */
type OnboardingActive = { completed?: boolean; completedAt?: number } | null | undefined;

/**
 * Shared launcher for the live auto-apply demo. Dashboard, apply, and any other
 * entry point call this so the enqueue + navigate + onboarding-gate logic lives
 * in exactly one place.
 */
export function useRunDemo(): RunDemoState {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { startDemo } = useApplyActions();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Completeness of detailed onboarding. `undefined` = still loading; we treat a
  // loading/unknown state as "not yet complete" so we never fire a bare demo.
  const active = useQuery(
    api.onboarding.getActive,
    token ? { sessionId: getSessionId(), token } : "skip",
  ) as OnboardingActive;
  const onboardingComplete = active?.completed === true;

  const run = useCallback(async () => {
    if (starting) return;
    setError(null);

    // Gate: the demo is only impressive with the user's real answers. If detailed
    // onboarding isn't done, send them there first and bounce back to the demo.
    if (!onboardingComplete) {
      toast("Answer a few questions first so the demo fills your applications, not sample data.");
      await navigate({ to: "/onboarding", search: { next: "demo" } as never });
      return;
    }

    setStarting(true);
    try {
      const { jobId } = await startDemo(true);
      await navigate({ to: "/apply/$jobId", params: { jobId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the demo. Try again.");
      setStarting(false);
    }
  }, [starting, onboardingComplete, startDemo, navigate]);

  return { run, starting, error };
}
