"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type ProfileFieldType =
  | "text"
  | "date"
  | "email"
  | "tel"
  | "enum"
  | "number"
  | "longtext"
  | "essay"
  | "multiselect";

export type ProfileField = {
  conceptKey: string;
  label: string;
  type: ProfileFieldType;
  options?: string[];
  required?: boolean;
  help?: string;
  maxChars?: number;
};

export type RepeatGroup = {
  groupKey: string;
  itemLabel: string;
  max: number;
  itemFields: ProfileField[];
};

export type ProfileSection = {
  key: string;
  title: string;
  description?: string;
  fields?: ProfileField[];
  group?: RepeatGroup;
};

export type ProfileCompleteness = {
  complete: boolean;
  percent: number;
  requiredTotal: number;
  requiredDone: number;
  missing: { conceptKey: string; label: string; section: string }[];
  sections: {
    key: string;
    title: string;
    requiredTotal: number;
    requiredDone: number;
    complete: boolean;
  }[];
};

export type CommonAppProfileData = {
  answers: Record<string, string>;
  completeness: ProfileCompleteness;
};

export function useCommonAppSchema(): ProfileSection[] | undefined {
  return useQuery(api.commonAppProfile.schema, {} as never) as
    | ProfileSection[]
    | undefined;
}

export function useCommonAppProfile(): CommonAppProfileData | null | undefined {
  const { token } = useAuth();
  const args = token ? { token } : "skip";
  return useQuery(api.commonAppProfile.get, args as never) as
    | CommonAppProfileData
    | null
    | undefined;
}

export function usePrefillFromOnboarding() {
  const { token } = useAuth();
  const mutate = useMutation(api.commonAppProfile.prefillFromOnboarding);
  return useCallback(async (): Promise<{ filled: number }> => {
    if (!token) return { filled: 0 };
    const res = (await mutate({ token } as never)) as { filled: number };
    return res ?? { filled: 0 };
  }, [token, mutate]);
}

export type ScheduleSection = {
  sectionKey: string;
  title: string;
  unansweredRequired: number;
  unansweredTotal: number;
  dueMs: number;
};

export type IntakeSchedule = {
  soonestDeadlineMs: number;
  sections: ScheduleSection[];
};

/**
 * Sectioned intake schedule (hardest-first, soonest-due).
 * `nowMs` is passed in so the query result stays deterministic/cacheable.
 * Returns null when signed out, undefined while loading.
 */
export function useIntakeSchedule(nowMs: number): IntakeSchedule | null | undefined {
  const { token } = useAuth();
  const args = token ? { token, nowMs } : "skip";
  return useQuery(api.applicationPlan.intakeSchedule, args as never) as
    | IntakeSchedule
    | null
    | undefined;
}
