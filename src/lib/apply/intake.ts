"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import type { SelectionItem } from "@/lib/applyQueue/selection";

/**
 * Convert local selection items into the target shape the backend expects.
 * Backend targets are `{ source, externalId }` pairs.
 */
export function selectionToTargets(items: SelectionItem[]) {
  return items.map((i) => ({ source: i.source, externalId: i.externalId }));
}

export type IntakeRequirement = {
  key: string;
  label?: string;
  question?: string;
  help?: string;
  type?: "text" | "textarea" | "select" | "multiselect" | "date" | "number" | "boolean" | "file" | string;
  options?: Array<{ value: string; label?: string } | string>;
  required?: boolean;
  value?: unknown;
  answered?: boolean;
  group?: string;
};

export type IntakeTarget = {
  source: string;
  externalId: string;
  name?: string;
  found?: boolean;
};

export type IntakePlan = {
  shared?: IntakeRequirement[];
  specific?: Array<{
    target: IntakeTarget;
    requirements?: IntakeRequirement[];
  }>;
  targets?: IntakeTarget[];
};

export type EligibilityEntry = {
  target: IntakeTarget;
  ready?: boolean;
  blockers?: Array<{ key?: string; message: string; severity?: "hard" | "soft" }>;
  questions?: IntakeRequirement[];
};

export type EligibilityResult = {
  entries?: EligibilityEntry[];
  overallReady?: boolean;
};

export type AutoApplyEntitlement = {
  gate: "not_ready" | "ready_free" | "ready_paid" | "needs_payment";
  overallReady?: boolean;
  freeUsed?: boolean;
  paid?: boolean;
  applyCount?: number;
};

export function useIntakePlan(targets: Array<{ source: string; externalId: string }>) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.intakePlan, args as never) as IntakePlan | undefined;
}

export function useEligibility(targets: Array<{ source: string; externalId: string }>) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.eligibilityForTargets, args as never) as EligibilityResult | undefined;
}

export function useChecklist(targets: Array<{ source: string; externalId: string }>) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.checklistForTargets, args as never) as
    | { entries?: Array<{ target: IntakeTarget; ready?: boolean; missing?: string[] }> }
    | undefined;
}

export function useAutoApplyEntitlement(targets: Array<{ source: string; externalId: string }>) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.autoApplyEntitlement, args as never) as
    | AutoApplyEntitlement
    | undefined;
}

/** Debounced setAnswer with per-key coalescing. */
export function useSetAnswer(debounceMs = 400) {
  const { token } = useAuth();
  const mutate = useMutation(api.applications.setAnswer);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, unknown>>({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  return useCallback(
    (args: {
      key: string;
      value: unknown;
      target?: { source: string; externalId: string } | null;
      scope?: "shared" | "specific";
    }) => {
      if (!token) return;
      const scopeKey = args.target ? `${args.target.source}::${args.target.externalId}::${args.key}` : `shared::${args.key}`;
      pending.current[scopeKey] = args.value;
      if (timers.current[scopeKey]) clearTimeout(timers.current[scopeKey]);
      timers.current[scopeKey] = setTimeout(() => {
        const value = pending.current[scopeKey];
        delete pending.current[scopeKey];
        delete timers.current[scopeKey];
        mutate({
          token,
          key: args.key,
          value,
          target: args.target ?? undefined,
          scope: args.scope,
        } as never).catch((e) => console.warn("setAnswer failed", e));
      }, debounceMs);
    },
    [token, mutate, debounceMs],
  );
}

export function useAnswerEligibility() {
  const { token } = useAuth();
  const mutate = useMutation(api.applications.answerEligibility);
  return useCallback(
    (args: { target: { source: string; externalId: string }; key: string; value: unknown }) => {
      if (!token) return Promise.resolve();
      return mutate({ token, ...args } as never).catch((e) => {
        console.warn("answerEligibility failed", e);
      });
    },
    [token, mutate],
  );
}

/** Utility: total answered / total required across a plan for progress UI. */
export function summarizePlan(plan: IntakePlan | undefined) {
  if (!plan) return { total: 0, answered: 0, percent: 0 };
  const all: IntakeRequirement[] = [];
  (plan.shared ?? []).forEach((r) => all.push(r));
  (plan.specific ?? []).forEach((s) => (s.requirements ?? []).forEach((r) => all.push(r)));
  const total = all.length;
  const answered = all.filter((r) => r.answered || (r.value !== undefined && r.value !== null && r.value !== "")).length;
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);
  return { total, answered, percent };
}

export function useTargetsFromSelection(items: SelectionItem[]) {
  return useMemo(() => selectionToTargets(items), [items]);
}
