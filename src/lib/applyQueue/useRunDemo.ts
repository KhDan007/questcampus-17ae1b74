"use client";

import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApplyActions } from "./client";

export type RunDemoState = {
  /** Launch the live demo: enqueues a fresh demo job and navigates to it. */
  run: () => Promise<void>;
  /** True while a demo is being enqueued / navigated. */
  starting: boolean;
  /** Human-readable error from the last attempt, or null. */
  error: string | null;
};

/**
 * Shared launcher for the live auto-apply demo. Dashboard, apply, and any other
 * entry point call this so the enqueue + navigate logic lives in exactly one
 * place. Enqueues a fresh demo job and routes to its live run page.
 */
export function useRunDemo(): RunDemoState {
  const navigate = useNavigate();
  const { startDemo } = useApplyActions();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (starting) return;
    setError(null);
    setStarting(true);
    try {
      const { jobId } = await startDemo(true);
      await navigate({ to: "/apply/$jobId", params: { jobId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the demo. Try again.");
      setStarting(false);
    }
  }, [starting, startDemo, navigate]);

  return { run, starting, error };
}
