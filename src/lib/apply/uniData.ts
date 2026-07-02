"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type UniDeadline = {
  intake: string | null;
  dateText: string;
  isoDate?: string;
  evidence: string;
  sourceUrl: string;
  category?: "admission" | "other";
};

export type UniInsight = { text?: string; sourceUrl?: string };

export type UniFacts = {
  source: string;
  externalId: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  website?: string | null;
  ownership?: string | null;
  sizeBucket?: string | null;
  studentSize?: number | null;
  admissionRate?: number | null;
  satAvg?: number | null;
  actMidpoint?: number | null;
  tuitionInState?: number | null;
  tuitionOutState?: number | null;
  costAttendance?: number | null;
  medianDebt?: number | null;
  globalRank?: number | null;
  languageOfInstruction?: string | null;
  fees?: { amount?: number | null; currency?: string | null } | null;
  english?: unknown;
  entry?: unknown;
  deadlines?: UniDeadline[];
  insights?: UniInsight[];
};

export type Scholarship = {
  _id: string;
  name: string;
  provider?: string | null;
  type?: string | null;
  category?: string | null;
  amount?: string | null;
  eligibility?: string | null;
  deadline?: string | null;
  url?: string | null;
  countries?: string[] | null;
};

export type ResearchProgress = {
  status: string;
  researchType?: string;
  coverage?: "full" | "partial" | string;
  progress: { stage?: string; message?: string; percent?: number; updatedAt?: number } | null;
  researchedAt?: number;
  error?: string;
  deepResearchMeta?: unknown;
};

export function useUniFacts(system: string, externalId: string) {
  return useQuery(api.universities.uniFacts, { source: system, externalId } as never) as
    | UniFacts
    | null
    | undefined;
}

export function useUniScholarships(system: string, externalId: string) {
  return useQuery(api.ingest.scholarships.listForUniversity, { system, externalId } as never) as
    | Scholarship[]
    | undefined;
}

export function useResearchProgress(system: string, externalId: string) {
  return useQuery(
    (api as any)["ingest/deepResearch"].deepResearchProgress,
    { system, externalId } as never,
  ) as ResearchProgress | null | undefined;
}
