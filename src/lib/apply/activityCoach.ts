"use client";

import { useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

// Client bindings for the Common App activities coach. The heavy lifting (RAG
// retrieval of the best-written exemplars + grounded assess/rewrite) is the
// backend `activityCoach` actions; these hooks just carry the auth token.

export const ROLE_MAX = 50;
export const DESC_MAX = 150;

export type CoachInput = { category: string; role: string; description: string };
export type AssessDimension = { key: string; label: string; score: number; note: string };
export type Assessment = {
  score: number;
  headline: string;
  dimensions: AssessDimension[];
  strengths: string[];
  fixes: string[];
};
export type Rewrite = { role: string; description: string; changes: string[] };

type AssessResult = { ok: true; assessment: Assessment } | { ok: false; error: string };
type RewriteResult = { ok: true; rewrite: Rewrite } | { ok: false; error: string };

export const ACTIVITY_TIPS: string[] = [
  "Start with a strong action verb: Led, Founded, Built, Coached, Organized, Raised.",
  "Quantify everything you honestly can — people reached, money raised, hours, percentages.",
  "Use the shape: Action + Context + Result (what changed because you were there).",
  "Describe impact, not duties — skip what the role generally does.",
  "Write dense fragments, not sentences. Drop 'the/a', skip periods, save every character.",
];

export function useAssessActivity() {
  const { token } = useAuth();
  const assess = useAction(api.activityCoach.assessActivity);
  return useCallback(
    async (input: CoachInput): Promise<AssessResult> => {
      if (!token) return { ok: false, error: "Please sign in to use the activities coach." };
      try {
        return (await assess({ token, ...input })) as AssessResult;
      } catch {
        return { ok: false, error: "The coach couldn't run just now — try again in a moment." };
      }
    },
    [assess, token],
  );
}

export function useRewriteActivity() {
  const { token } = useAuth();
  const rewrite = useAction(api.activityCoach.rewriteActivity);
  return useCallback(
    async (input: CoachInput): Promise<RewriteResult> => {
      if (!token) return { ok: false, error: "Please sign in to use the activities coach." };
      try {
        return (await rewrite({ token, ...input })) as RewriteResult;
      } catch {
        return { ok: false, error: "The coach couldn't run just now — try again in a moment." };
      }
    },
    [rewrite, token],
  );
}
