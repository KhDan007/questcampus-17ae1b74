"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type SavedUniversity = {
  id: string;
  universityId?: string;
  source: string;
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  region?: string;
  website?: string;
  fields?: string[];
  origin: "search" | "recommendation" | "manual";
  notes?: string;
  addedAt: number;
  updatedAt: number;
};

export function useSavedUniversities() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const saved = useQuery(
    api.userUniversities.list,
    token ? { token } : "skip",
  ) as SavedUniversity[] | undefined;
  const addMut = useMutation(api.userUniversities.add);
  const removeByMut = useMutation(api.userUniversities.removeByUniversity);
  const removeMut = useMutation(api.userUniversities.remove);

  const byKey = useMemo(() => {
    const m = new Map<string, SavedUniversity>();
    for (const s of saved ?? []) m.set(`${s.source}::${s.externalId}`, s);
    return m;
  }, [saved]);

  const isSaved = useCallback(
    (source: string, externalId: string) =>
      byKey.has(`${source}::${externalId}`),
    [byKey],
  );

  const requireAuth = useCallback(
    (returnTo?: string) => {
      if (isAuthenticated && token) return true;
      const redirect =
        returnTo ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
      void navigate({ to: "/signin", search: { redirect } as never });
      return false;
    },
    [isAuthenticated, token, navigate],
  );

  const addFromSearch = useCallback(
    async (universityId: string) => {
      if (!token) return;
      await addMut({ token, universityId, origin: "search" });
    },
    [token, addMut],
  );

  const addFromRecommendation = useCallback(
    async (source: string, externalId: string) => {
      if (!token) return;
      await addMut({ token, source, externalId, origin: "recommendation" });
    },
    [token, addMut],
  );

  const removeByUniversity = useCallback(
    async (source: string, externalId: string) => {
      if (!token) return;
      await removeByMut({ token, source, externalId });
    },
    [token, removeByMut],
  );

  const removeById = useCallback(
    async (savedId: string) => {
      if (!token) return;
      await removeMut({ token, savedId });
    },
    [token, removeMut],
  );

  return {
    saved,
    isAuthenticated,
    isSaved,
    requireAuth,
    addFromSearch,
    addFromRecommendation,
    removeByUniversity,
    removeById,
  };
}
