"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type StrengthCriterionKey = "academics" | "ecs" | "honors" | "essays";

export type StrengthCriterion = {
  key: StrengthCriterionKey;
  score: number;
  gapLine: string;
  suggestedEdits:
    | {
        criterion: StrengthCriterionKey;
        conceptKey: string;
        field: string;
        currentValue: string;
        proposedValue: string;
        whyItHelps: string;
      }[]
    | null;
};

export type ApplicationStrength = {
  overall: number;
  band: "needs_work" | "competitive" | "strong" | "exceptional";
  bandLabel: string;
  criteria: StrengthCriterion[];
  adviceStale: boolean;
};

export const STRENGTH_CRITERIA: Record<
  StrengthCriterionKey,
  { label: string; shortLabel: string; fillHint: string }
> = {
  academics: {
    label: "Academic rigor",
    shortLabel: "Academics",
    fillHint: "Add GPA, courses, test scores, and academic context in Applications.",
  },
  ecs: {
    label: "Extracurricular depth",
    shortLabel: "Activities",
    fillHint: "Add leadership, impact, hours, and responsibilities in Applications.",
  },
  honors: {
    label: "Honors and awards",
    shortLabel: "Honors",
    fillHint: "Add awards, competitions, rankings, and recognition in Applications.",
  },
  essays: {
    label: "Essay readiness",
    shortLabel: "Essays",
    fillHint: "Draft or paste essays in Applications, then review them.",
  },
};

export function useApplicationStrength() {
  const { token } = useAuth();
  const args = token ? { token } : "skip";
  return useQuery(api.applicationStrength.getApplicationStrength, args as never) as
    | ApplicationStrength
    | undefined;
}

export function criterionTone(score: number): string {
  if (score >= 80) return "bg-tertiary/20 border-tertiary text-on-surface";
  if (score >= 60) return "bg-secondary/20 border-secondary text-on-surface";
  return "bg-primary/10 border-primary/40 text-on-surface";
}

export function strengthSummaryCopy(strength: ApplicationStrength): string {
  const weakest = [...strength.criteria].sort((a, b) => a.score - b.score)[0];
  if (!weakest) return "No criteria yet.";
  const meta = STRENGTH_CRITERIA[weakest.key];
  return `${meta.shortLabel} is the lowest section. ${weakest.gapLine}`;
}
