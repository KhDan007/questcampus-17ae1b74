"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type AgentStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "completed"
  | string;

export type Priority = "critical" | "high" | "medium" | "low" | string;

export type PortfolioTarget = {
  targetId?: string;
  system?: string;
  externalId?: string;
  name?: string;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  aidScore?: number;
  aidConfidence?: string;
  aidReasons?: string[];
  matchReasons?: string[];
  fieldOverlap?: string[];
  netCost?: number | null;
  ready?: boolean;
  requiredTotal?: number;
  requiredSatisfied?: number;
  blocking?: number;
  coverage?: string | null;
  researchType?: string | null;
  submissionStatus?: string;
  tips?: RoadmapTip[];
  nextActions?: RoadmapAction[];
};

export type ScholarshipProgram = {
  name?: string;
  provider?: string;
  category?: string;
  type?: string;
  amount?: string;
  deadline?: string;
  url?: string;
  eligibility?: string;
  countries?: string[];
  fields?: string[];
  score?: number;
};

export type EvidenceEntry = {
  id?: string;
  targetId?: string;
  kind?: string;
  name?: string;
  basis?: string;
  evidenceUrl?: string;
  sourceUrl?: string;
  conceptKey?: string;
  docType?: string;
};

export type RoadmapAction = {
  id?: string;
  label?: string;
  owner?: "user" | "agent" | "extension" | "worker" | string;
  priority?: Priority;
  due?: string;
  targetId?: string;
  kind?: string;
  evidenceIds?: string[];
};

export type RoadmapTip = {
  id?: string;
  title?: string;
  body?: string;
  priority?: Priority;
  targetId?: string;
  evidenceIds?: string[];
};

export type PortfolioBrain = {
  _id?: string;
  inputHash?: string;
  status?: string;
  profileSnapshot?: {
    firstName?: string | null;
    lifeStage?: string | null;
    financialNeed?: string | null;
    homeCountry?: string | null;
    completed?: boolean;
  } | null;
  savedTargets?: PortfolioTarget[];
  candidateTargets?: PortfolioTarget[];
  scholarshipCandidates?: ScholarshipProgram[];
  readinessSummary?: PortfolioTarget[];
  evidenceIndex?: EvidenceEntry[];
  staleFlags?: string[];
  updatedAt?: number;
};

export type PortfolioRoadmap = {
  _id?: string;
  status?: string;
  agentRunId?: string;
  brainId?: string;
  summary?: string;
  profileRead?: {
    firstName?: string | null;
    lifeStage?: string | null;
    financialNeed?: string | null;
    homeCountry?: string | null;
    missingProfile?: boolean;
  };
  recommendedTargets?: PortfolioTarget[];
  savedTargetPlans?: PortfolioTarget[];
  scholarshipPlan?: {
    priority?: string;
    programs?: ScholarshipProgram[];
    nextActions?: RoadmapAction[];
  };
  applicationTimeline?: Array<{
    phase?: string;
    targetId?: string;
    title?: string;
    detail?: string;
    evidenceIds?: string[];
  }>;
  nextActions?: RoadmapAction[];
  tips?: RoadmapTip[];
  evidence?: EvidenceEntry[];
  confidence?: "high" | "medium" | "low" | string;
  coverage?: "deep_agent" | "deterministic_fallback" | "fallback_after_agent_error" | string;
  error?: string;
  generatedAt?: number;
  updatedAt?: number;
};

export type AgentRun = {
  _id?: string;
  kind?: string;
  status?: AgentStatus;
  progress?: { stage?: string; message?: string; percent?: number };
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  updatedAt?: number;
};

export type AgentEvent = {
  _id?: string;
  runId?: string;
  targetId?: string;
  packageId?: string;
  source?: "worker" | "extension" | "web" | "convex" | string;
  type?: string;
  riskTier?: string;
  payload?: Record<string, unknown>;
  createdAt?: number;
};

export type ApplicationSubmission = {
  _id?: string;
  targetId?: string;
  system?: string;
  externalId?: string;
  universityId?: string;
  status?: string;
  source?: string;
  packageId?: string;
  portalHost?: string;
  confirmationNumber?: string;
  notes?: string;
  submittedAt?: number;
  updatedAt?: number;
  createdAt?: number;
};

function startedRunId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const runId = (result as { runId?: unknown }).runId;
  return typeof runId === "string" ? runId : null;
}

export function agentRunIdFromState({
  activeRunId,
  roadmap,
  events,
}: {
  activeRunId: string | null;
  roadmap?: Pick<PortfolioRoadmap, "agentRunId"> | null;
  events?: Pick<AgentEvent, "runId" | "createdAt">[];
}): string | null {
  if (activeRunId) return activeRunId;

  const eventRun = [...(events ?? [])]
    .filter((event): event is { runId: string; createdAt?: number } => typeof event.runId === "string")
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0]?.runId;
  if (eventRun) return eventRun;

  return typeof roadmap?.agentRunId === "string" ? roadmap.agentRunId : null;
}

export function targetKey(target: Pick<PortfolioTarget, "system" | "externalId" | "targetId">): string {
  if (target.targetId) return target.targetId;
  return `${target.system ?? "unknown"}:${target.externalId ?? "unknown"}`;
}

export function usePortfolioAgent() {
  const { token } = useAuth();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const latestBrain = useQuery(
    api.portfolioAgent.latestPortfolioBrain,
    token ? { token } : "skip",
  ) as PortfolioBrain | null | undefined;
  const roadmap = useQuery(
    api.portfolioAgent.latestPortfolioRoadmap,
    token ? { token } : "skip",
  ) as PortfolioRoadmap | null | undefined;
  const events = useQuery(
    api.portfolioAgent.listAgentEvents,
    token ? { token, limit: 80 } : "skip",
  ) as AgentEvent[] | undefined;
  const latestRunId = useMemo(
    () => agentRunIdFromState({ activeRunId, roadmap, events }),
    [activeRunId, roadmap, events],
  );
  const run = useQuery(
    api.portfolioAgent.getAgentRun,
    token && latestRunId ? { token, runId: latestRunId } : "skip",
  ) as AgentRun | null | undefined;
  const submissions = useQuery(
    api.applications.listApplicationSubmissions,
    token ? { token } : "skip",
  ) as ApplicationSubmission[] | undefined;

  const startMutation = useMutation(api.portfolioAgent.startPortfolioRoadmap);
  const refreshMutation = useMutation(api.portfolioAgent.refreshPortfolioBrain);

  const startRoadmap = useCallback(async () => {
    if (!token) throw new Error("Sign in required.");
    setStartError(null);
    try {
      await refreshMutation({ token } as never);
      const result = await startMutation({ token } as never);
      const runId = startedRunId(result);
      if (runId) setActiveRunId(runId);
      return runId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start agent run.";
      setStartError(message);
      throw error;
    }
  }, [refreshMutation, startMutation, token]);

  const refreshBrain = useCallback(async () => {
    if (!token) throw new Error("Sign in required.");
    await refreshMutation({ token } as never);
  }, [refreshMutation, token]);

  return {
    token,
    latestBrain,
    roadmap,
    events,
    run,
    submissions,
    latestRunId,
    startError,
    startRoadmap,
    refreshBrain,
    setActiveRunId,
  };
}
