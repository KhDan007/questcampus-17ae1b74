"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import type { SelectionItem } from "@/lib/applyQueue/selection";

/** Backend target shape uses `system` (SelectionItem.source → system). */
export type BackendTarget = { system: string; externalId: string; name?: string };

export function selectionToTargets(items: SelectionItem[]): BackendTarget[] {
  return items.map((i) => ({ system: i.source, externalId: i.externalId, name: i.name }));
}

export type IntakeItemKind = "field" | "essay" | "document" | "video";

export type IntakeItem = {
  key: string;
  kind: IntakeItemKind;
  conceptKey?: string;
  docType?: string;
  label: string;
  type: string; // text|email|date|number|tel|select|textarea
  enumOptions?: string[];
  prompt?: string;
  wordLimit?: number;
  required: boolean;
  targetCount: number;
  targetNames: string[];
  answered: boolean;
  value?: string;
};

export type IntakeTarget = {
  system: string;
  externalId: string;
  name: string;
  found: boolean;
};

export type IntakePlan = {
  targets: IntakeTarget[];
  shared: IntakeItem[];
  specific: { system: string; externalId: string; name: string; items: IntakeItem[] }[];
  manualNotes: { kind: "fee" | "recommender"; targetNames: string[] }[];
  summary: { totalAskable: number; answered: number; remaining: number };
};

export type EligQuestion = {
  askKey: string;
  label: string;
  kind: "select" | "number" | "text" | "boolean";
  options?: string[];
};

export type EligibilityBlocker = {
  criterion: string;
  label: string;
  askKey: string;
  evidence?: string;
  evidenceUrl?: string;
};

export type EligibilityPerTarget = {
  system: string;
  externalId: string;
  name: string;
  verdict: "eligible" | "ineligible" | "unknown";
  blockers: EligibilityBlocker[];
  warnings: EligibilityBlocker[];
  unknowns: EligibilityBlocker[];
  questions: EligQuestion[];
};

export type EligibilityResult = {
  overall: "eligible" | "ineligible" | "unknown";
  questions: EligQuestion[];
  perTarget: EligibilityPerTarget[];
};

export type ChecklistResult = {
  overallReady?: boolean;
  perTarget: {
    system: string;
    externalId: string;
    found: boolean;
    checklist: { ready: boolean; [k: string]: unknown } | null;
  }[];
};

export type AutoApplyEntitlement = {
  gate: "not_ready" | "ready_free" | "ready_paid" | "needs_payment";
  overallReady?: boolean;
  freeUsed?: boolean;
  paid?: boolean;
  applyCount?: number;
};

export function useIntakePlan(targets: BackendTarget[]) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.intakePlan, args as never) as IntakePlan | undefined;
}

export function useEligibility(targets: BackendTarget[]) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.eligibilityForTargets, args as never) as
    | EligibilityResult
    | undefined;
}

export function useChecklist(targets: BackendTarget[]) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.checklistForTargets, args as never) as
    | ChecklistResult
    | undefined;
}

export function useAutoApplyEntitlement(targets: BackendTarget[]) {
  const { token } = useAuth();
  const args = token && targets.length > 0 ? { token, targets } : "skip";
  return useQuery(api.applications.autoApplyEntitlement, args as never) as
    | AutoApplyEntitlement
    | undefined;
}

/**
 * Debounced setAnswer. Universal answer store — one value per conceptKey,
 * shared across all universities. Empty string clears.
 */
export function useSetAnswer(debounceMs = 400) {
  const { token } = useAuth();
  const mutate = useMutation(api.applications.setAnswer);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, string>>({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  return useCallback(
    (conceptKey: string, value: string) => {
      if (!token || !conceptKey) return;
      pending.current[conceptKey] = value;
      if (timers.current[conceptKey]) clearTimeout(timers.current[conceptKey]);
      timers.current[conceptKey] = setTimeout(() => {
        const v = pending.current[conceptKey];
        delete pending.current[conceptKey];
        delete timers.current[conceptKey];
        mutate({ token, conceptKey, value: v } as never).catch((e) =>
          console.warn("setAnswer failed", e),
        );
      }, debounceMs);
    },
    [token, mutate, debounceMs],
  );
}

/**
 * Batched eligibility answers. Backend takes the WHOLE record every time —
 * we merge locally and debounce.
 */
export function useAnswerEligibility(debounceMs = 400) {
  const { token } = useAuth();
  const mutate = useMutation(api.applications.answerEligibility);
  const buffer = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (askKey: string, value: string) => {
      if (!token || !askKey) return;
      buffer.current[askKey] = value;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const answers = { ...buffer.current };
        mutate({ token, answers } as never).catch((e) =>
          console.warn("answerEligibility failed", e),
        );
      }, debounceMs);
    },
    [token, mutate, debounceMs],
  );
}

/**
 * Read the full universal answer store. Handy for pre-hydrating fields when
 * `intakePlan` doesn't already include a current value.
 */
export function useListAnswers() {
  const { token } = useAuth();
  const args = token ? { token } : "skip";
  return useQuery(api.applications.listAnswers, args as never) as
    | Record<string, string>
    | undefined;
}

export function useTargetsFromSelection(items: SelectionItem[]) {
  return useMemo(() => selectionToTargets(items), [items]);
}
