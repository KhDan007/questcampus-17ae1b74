"use client";

import { useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

// Client bindings for the Common App activities coach (backend `activities`
// module — the merged design): RAG-grounded assess/rewrite over the best-written
// exemplars, the deterministic per-activity tier/flags, and gap-filling new-
// activity suggestions. These hooks just carry the auth token.

export const ROLE_MAX = 50;
export const DESC_MAX = 150;

export type CoachInput = {
  category: string;
  role: string;
  description: string;
  // Extra fields power the deterministic diagnostic on the live draft.
  gradeLevels?: string;
  hoursPerWeek?: string;
  weeksPerYear?: string;
};
export type ActivityFlag =
  | "no_leadership"
  | "low_commitment"
  | "not_multiyear"
  | "vague_verb"
  | "impact_not_quantified";
export type AssessDimension = { key: string; label: string; score: number; note: string };
export type Assessment = {
  score: number;
  headline: string;
  dimensions: AssessDimension[];
  strengths: string[];
  fixes: string[];
  // Deterministic diagnostic (from the student's numbers/leadership/grades).
  tier?: "strong" | "developing" | "weak";
  flags?: ActivityFlag[];
};
export type Rewrite = { role: string; description: string; changes: string[] };

type AssessResult = { ok: true; assessment: Assessment } | { ok: false; error: string };
type RewriteResult = { ok: true; rewrite: Rewrite } | { ok: false; error: string };

// A gap-filling new-activity suggestion (candidate always present; the pitch is
// paid-gated + only after refresh).
export type ActivitySuggestion = {
  catalogId: string;
  title: string;
  blurb: string;
  pitch: string | null;
  whyItHelps: string | null;
};

export const ACTIVITY_TIPS: string[] = [
  "Start with a strong action verb: Led, Founded, Built, Coached, Organized, Raised.",
  "Quantify everything you honestly can — people reached, money raised, hours, percentages.",
  "Use the shape: Action + Context + Result (what changed because you were there).",
  "Describe impact, not duties — skip what the role generally does.",
  "Write dense fragments, not sentences. Drop 'the/a', skip periods, save every character.",
];

export function useAssessActivity() {
  const { token } = useAuth();
  const assess = useAction(api.activities.assessActivity);
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
  const rewrite = useAction(api.activities.rewriteActivity);
  return useCallback(
    async (input: CoachInput): Promise<RewriteResult> => {
      if (!token) return { ok: false, error: "Please sign in to use the activities coach." };
      try {
        // Rewrite only needs the three text fields.
        const { category, role, description } = input;
        return (await rewrite({ token, category, role, description })) as RewriteResult;
      } catch {
        return { ok: false, error: "The coach couldn't run just now — try again in a moment." };
      }
    },
    [rewrite, token],
  );
}

// Gap-filling new-activity suggestions. The candidate list is free + live; the
// personalized pitch is paid + populated by refresh.
export function useActivitySuggestions():
  | { candidates: ActivitySuggestion[]; suggestionsStale: boolean }
  | undefined {
  const { token } = useAuth();
  return useQuery(api.activities.getActivitySuggestions, token ? { token } : "skip") as
    | { candidates: ActivitySuggestion[]; suggestionsStale: boolean }
    | undefined;
}

export function useRefreshSuggestions() {
  const { token } = useAuth();
  const refresh = useAction(api.activities.refreshActivitySuggestions);
  return useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    try {
      await refresh({ token });
      return true;
    } catch {
      return false;
    }
  }, [refresh, token]);
}

export const FLAG_LABEL: Record<ActivityFlag, string> = {
  no_leadership: "No leadership",
  low_commitment: "Low commitment",
  not_multiyear: "Not multi-year",
  vague_verb: "Weak verb",
  impact_not_quantified: "No numbers",
};
