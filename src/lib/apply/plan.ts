"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

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
