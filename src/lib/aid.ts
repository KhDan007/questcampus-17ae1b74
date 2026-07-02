"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type AidRecommendation = {
  source: string;
  externalId: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  aidScore: number; // 0..1, higher = better for aid
  netCost: number | null; // USD/yr, may be null
  aidReasons: string[]; // grounded, best-first
  confidence: "high" | "medium" | "low";
};

export function useAidRecommendations(limit = 12): AidRecommendation[] | undefined {
  const { token } = useAuth();
  return useQuery(
    api.aid.recommendByAid,
    token ? ({ token, limit } as never) : "skip",
  ) as AidRecommendation[] | undefined;
}
