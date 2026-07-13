"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type EssayForTarget = {
  essayId: string;
  conceptKey: string | null;
  promptText: string | null;
  wordLimit: number | null;
  targetName: string | null;
  wordCount: number;
  preview: string;
  createdAt: number;
  editedAt: number | null;
};

export function useEssaysForTarget(
  system: string | undefined,
  externalId: string | undefined,
): EssayForTarget[] | undefined {
  const { token } = useAuth();
  const args =
    token && system && externalId
      ? ({ token, system, externalId } as never)
      : ("skip" as const);
  return useQuery(api.essays.essaysForTarget, args) as
    | EssayForTarget[]
    | undefined;
}


export type PlanTaskKind =
  | "profile"
  | "essay"
  | "document"
  | "recommender"
  | "fee"
  | "test"
  | "submit";

export type PlanTask = {
  id: string;
  kind: PlanTaskKind;
  title: string;
  detail?: string;
  required: boolean;
  wordLimit?: number;
  conceptKey?: string;
  docType?: string;
  editor?: "essay" | "document";
  editorKind?: string;
  upload?: boolean;
  fieldTags: string[] | null;
  daysBefore: number;
  dueMs: number;
  phase: string;
  overdue: boolean;
  done: boolean;
};

export type PlanPhase = { key: string; label: string; tasks: PlanTask[] };

export type ApplicationPlan =
  | null
  | { found: false }
  | {
      found: true;
      system: string;
      externalId: string;
      targetName: string | null;
      userFields: string[];
      deadline: {
        dueMs: number;
        source: "scraped" | "user" | "default";
        editable: true;
      };
      phases: PlanPhase[];
      conditional: PlanTask[];
      counts: { total: number; required: number };
    };

export function useApplicationPlan(
  system: string | undefined,
  externalId: string | undefined,
): ApplicationPlan | undefined {
  const { token } = useAuth();
  const nowMs = useMemo(() => Date.now(), []);
  const args =
    token && system && externalId
      ? ({ token, system, externalId, nowMs } as never)
      : ("skip" as const);
  return useQuery(api.applicationPlan.getPlan, args) as ApplicationPlan | undefined;
}

// The single source of readiness truth for one target: the full data-quality
// gate (checklistForTargets.perTarget[].qualityStatus). Drives the honest badge,
// the apply stepper, and whether the per-uni plan is shown or held behind a
// "still researching" panel — so every surface agrees on the same state.
export type TargetReadiness = {
  qualityStatus: string;
  blockedReason: string | null;
  ready: boolean;
};

export function useTargetReadiness(
  system: string | undefined,
  externalId: string | undefined,
): TargetReadiness | undefined {
  const { token } = useAuth();
  const args =
    token && system && externalId
      ? ({ token, targets: [{ system, externalId }] } as never)
      : ("skip" as const);
  const res = useQuery(api.applications.checklistForTargets, args) as
    | {
        perTarget: Array<{
          system: string;
          externalId: string;
          qualityStatus?: string;
          blockedReason?: string | null;
        }>;
      }
    | null
    | undefined;
  return useMemo(() => {
    if (res === undefined) return undefined;
    const row = res?.perTarget?.[0];
    const qualityStatus = row?.qualityStatus ?? "needs_research";
    return {
      qualityStatus,
      blockedReason: row?.blockedReason ?? null,
      ready: qualityStatus === "ready_to_fill",
    };
  }, [res]);
}

export function useSetPlanDeadline() {
  const { token } = useAuth();
  const mut = useMutation(api.applicationPlan.setPlanDeadline);
  return useCallback(
    async ({
      system,
      externalId,
      iso,
    }: {
      system: string;
      externalId: string;
      iso: string;
    }): Promise<void> => {
      if (!token) throw new Error("Sign in required");
      await mut({ token, system, externalId, iso } as never);
    },
    [token, mut],
  );
}

export function useSetTaskDone() {
  const { token } = useAuth();
  const mut = useMutation(api.applicationPlan.setTaskDone);
  return useCallback(
    async ({
      system,
      externalId,
      taskId,
      done,
    }: {
      system: string;
      externalId: string;
      taskId: string;
      done: boolean;
    }): Promise<void> => {
      if (!token) throw new Error("Sign in required");
      await mut({ token, system, externalId, taskId, done } as never);
    },
    [token, mut],
  );
}
