"use client";

import { useMemo } from "react";
import {
  useEligibility,
  useIntakePlan,
  type BackendTarget,
  type EligQuestion,
  type IntakeItem,
} from "./intake";
import { useApplicationDocuments } from "@/lib/applyQueue/client";

export type GuidedStepKind = "eligibility" | "document" | "field" | "essay";

export type GuidedStep = {
  id: string;
  kind: GuidedStepKind;
  label: string;
  prompt?: string;
  conceptKey?: string;
  askKey?: string;
  docType?: string;
  targetName?: string;
  wordLimit?: number;
  /** eligibility source */
  question?: EligQuestion;
  /** intake source (field/essay/document) */
  item?: IntakeItem;
  satisfied: boolean;
};

export type GuidedSteps = {
  steps: GuidedStep[];
  remaining: GuidedStep[];
  next: GuidedStep | null;
  doneCount: number;
  total: number;
  loading: boolean;
};

const EMPTY: GuidedSteps = {
  steps: [],
  remaining: [],
  next: null,
  doneCount: 0,
  total: 0,
  loading: true,
};

/**
 * Ordered, deduped queue of REQUIRED, UNSATISFIED prep steps derived from the
 * existing intake / eligibility / documents queries. Fully reactive.
 *
 * Ordering (gating first):
 *   1. eligibility gap questions
 *   2. documents (one per distinct docType)
 *   3. required fields (deduped by conceptKey)
 *   4. required essays (deduped by conceptKey or per-target key)
 */
export function useGuidedSteps(targets: BackendTarget[]): GuidedSteps {
  const plan = useIntakePlan(targets);
  const eligibility = useEligibility(targets);
  const { docs } = useApplicationDocuments();

  return useMemo(() => {
    if (targets.length === 0) return { ...EMPTY, loading: false };
    if (!plan || !eligibility) return EMPTY;

    const steps: GuidedStep[] = [];

    // 1) Eligibility gap questions — `questions[]` only contains UNANSWERED gaps.
    for (const q of eligibility.questions ?? []) {
      if (!q?.askKey) continue;
      steps.push({
        id: `elig::${q.askKey}`,
        kind: "eligibility",
        label: q.label ?? q.askKey,
        askKey: q.askKey,
        question: q,
        satisfied: false,
      });
    }

    // Flatten intake items with their originating target name (shared → undefined).
    const allItems: Array<{ item: IntakeItem; targetName?: string }> = [];
    for (const it of plan.shared ?? []) {
      if (!it) continue;
      allItems.push({ item: it });
    }
    for (const s of plan.specific ?? []) {
      for (const it of s?.items ?? []) {
        if (!it) continue;
        allItems.push({ item: it, targetName: s.name });
      }
    }

    // Document coverage — a docType is satisfied when at least one uploaded doc
    // of that type has `hasFile !== false`.
    const docHasByType = new Map<string, boolean>();
    for (const d of docs ?? []) {
      if (!d?.docType) continue;
      const has = d.hasFile !== false;
      const prev = docHasByType.get(d.docType) ?? false;
      docHasByType.set(d.docType, prev || has);
    }

    // 2) Documents — one step per distinct docType (across shared + specific).
    const seenDocs = new Set<string>();
    for (const { item, targetName } of allItems) {
      if (item.kind !== "document" && item.kind !== "video") continue;
      const dt = item.docType ?? "other";
      if (seenDocs.has(dt)) continue;
      seenDocs.add(dt);
      steps.push({
        id: `doc::${dt}`,
        kind: "document",
        label: item.label,
        docType: dt,
        targetName,
        item,
        satisfied: docHasByType.get(dt) === true,
      });
    }

    // 3) Required fields — dedupe by conceptKey (fall back to key).
    const seenField = new Set<string>();
    for (const { item, targetName } of allItems) {
      if (item.kind !== "field") continue;
      if (!item.required) continue;
      const key = item.conceptKey ?? item.key;
      if (seenField.has(key)) continue;
      seenField.add(key);
      steps.push({
        id: `field::${key}`,
        kind: "field",
        label: item.label,
        conceptKey: item.conceptKey,
        targetName,
        item,
        satisfied: item.answered === true,
      });
    }

    // 4) Required essays — dedupe by conceptKey; per-target essays keyed by target+key.
    const seenEssay = new Set<string>();
    for (const { item, targetName } of allItems) {
      if (item.kind !== "essay") continue;
      if (!item.required) continue;
      const key = item.conceptKey ?? `${targetName ?? "shared"}::${item.key}`;
      if (seenEssay.has(key)) continue;
      seenEssay.add(key);
      steps.push({
        id: `essay::${key}`,
        kind: "essay",
        label: item.label,
        prompt: item.prompt,
        conceptKey: item.conceptKey,
        wordLimit: item.wordLimit,
        targetName,
        item,
        satisfied: item.answered === true,
      });
    }

    const remaining = steps.filter((s) => !s.satisfied);
    const doneCount = steps.length - remaining.length;
    return {
      steps,
      remaining,
      next: remaining[0] ?? null,
      doneCount,
      total: steps.length,
      loading: false,
    };
  }, [plan, eligibility, docs, targets]);
}

/** Human-friendly single-line label for a step (used on the dashboard hero). */
export function describeGuidedStep(step: GuidedStep): string {
  const scope = step.targetName ? ` for ${step.targetName}` : "";
  switch (step.kind) {
    case "eligibility":
      return `Answer: ${step.label.toLowerCase()}`;
    case "document":
      return `Upload your ${step.label.toLowerCase()}`;
    case "essay":
      return `Write your ${step.label.toLowerCase()}${scope}`;
    case "field":
    default:
      return `Answer: ${step.label.toLowerCase()}${scope}`;
  }
}
