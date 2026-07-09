import type { BackendTarget, ChecklistResult } from "@/lib/apply/intake";
import type { SavedUniversity } from "@/lib/universities/savedClient";
import {
  targetKey,
  type AgentEvent,
  type ApplicationSubmission,
  type EvidenceEntry,
  type PortfolioBrain,
  type PortfolioRoadmap,
  type PortfolioTarget,
  type RoadmapAction,
  type RoadmapTip,
  type ScholarshipProgram,
} from "@/lib/agent/portfolio";

export type AgentCockpitModel = {
  savedTargets: BackendTarget[];
  targetPlans: PortfolioTarget[];
  recommendations: PortfolioTarget[];
  scholarshipPrograms: ScholarshipProgram[];
  nextActions: RoadmapAction[];
  tips: RoadmapTip[];
  evidence: EvidenceEntry[];
  readyCount: number;
  blockedCount: number;
  extensionEvents: AgentEvent[];
  latestExtensionEvent?: AgentEvent;
  appliedCount: number;
  roadmapReady: boolean;
};

export function savedUniversitiesToBackendTargets(saved: SavedUniversity[] | undefined): BackendTarget[] {
  return (saved ?? []).map((target) => ({
    system: target.source,
    externalId: target.externalId,
    name: target.name,
  }));
}

export function buildAgentCockpitModel({
  savedTargets,
  latestBrain,
  roadmap,
  events,
  submissions,
  checklist,
}: {
  savedTargets: BackendTarget[];
  latestBrain?: PortfolioBrain | null;
  roadmap?: PortfolioRoadmap | null;
  events?: AgentEvent[];
  submissions?: ApplicationSubmission[];
  checklist?: ChecklistResult;
}): AgentCockpitModel {
  const targetPlans = buildTargetPlans(
    roadmap?.savedTargetPlans,
    latestBrain?.readinessSummary,
    savedTargets,
    checklist,
  );
  const recommendations = dedupeTargets(roadmap?.recommendedTargets, latestBrain?.candidateTargets).slice(0, 8);
  const scholarshipPrograms = (
    (roadmap?.scholarshipPlan?.programs?.length
      ? roadmap.scholarshipPlan.programs
      : latestBrain?.scholarshipCandidates) ?? []
  ).slice(0, 8);
  const nextActions = roadmap?.nextActions ?? [];
  const tips = roadmap?.tips ?? [];
  const evidence = roadmap?.evidence ?? latestBrain?.evidenceIndex ?? [];
  const readyCount = targetPlans.filter((target) => target.ready).length;
  const blockedCount = targetPlans.filter((target) => !target.ready).length;
  const extensionEvents = (events ?? []).filter((event) => event.source === "extension");
  const appliedCount = (submissions ?? []).filter((item) =>
    ["submitted", "confirmed_applied"].includes(item.status ?? ""),
  ).length;

  return {
    savedTargets,
    targetPlans,
    recommendations,
    scholarshipPrograms,
    nextActions,
    tips,
    evidence,
    readyCount,
    blockedCount,
    extensionEvents,
    latestExtensionEvent: extensionEvents[0],
    appliedCount,
    roadmapReady: !!roadmap || recommendations.length > 0 || evidence.length > 0,
  };
}

function buildTargetPlans(
  roadmapTargets: PortfolioTarget[] | undefined,
  brainTargets: PortfolioTarget[] | undefined,
  savedTargets: BackendTarget[],
  checklist: ChecklistResult | undefined,
) {
  const byKey = new Map<string, PortfolioTarget>();
  for (const target of [...(brainTargets ?? []), ...(roadmapTargets ?? [])]) {
    byKey.set(targetKey(target), target);
  }

  return savedTargets.map((target) => {
    const key = `${target.system}:${target.externalId}`;
    const existing = byKey.get(key);
    if (existing) {
      return {
        ...existing,
        system: existing.system ?? target.system,
        externalId: existing.externalId ?? target.externalId,
        name: existing.name ?? target.name,
        targetId: existing.targetId ?? key,
      };
    }

    const row = checklist?.perTarget.find(
      (item) => item.system === target.system && item.externalId === target.externalId,
    );
    const checklistValue = row?.checklist as
      | { ready?: boolean; requiredTotal?: number; requiredSatisfied?: number; blocking?: number }
      | null
      | undefined;
    return {
      ...target,
      targetId: key,
      ready: !!checklistValue?.ready,
      requiredTotal: checklistValue?.requiredTotal ?? 0,
      requiredSatisfied: checklistValue?.requiredSatisfied ?? 0,
      blocking: checklistValue?.blocking ?? 0,
      coverage: row?.found === false ? "needs_research" : "known",
    };
  });
}

function dedupeTargets(...groups: Array<PortfolioTarget[] | undefined>) {
  const seen = new Set<string>();
  const out: PortfolioTarget[] = [];
  for (const group of groups) {
    for (const target of group ?? []) {
      const key = targetKey(target);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(target);
    }
  }
  return out;
}
