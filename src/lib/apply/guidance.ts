"use client";

import { useMemo } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type Guide = {
  key: string;
  title: string;
  whatItIs: string;
  howToGet: string[];
  format?: string;
  tips?: string[];
  whereExactly?: string;
  timeEstimate?: string;
  commonMistakes?: string[];
  writable?: boolean;
  editor?: "essay" | "document";
  editorKind?: string;
};

export type GuideRow = {
  kind: string;
  docType: string | null;
  conceptKey: string | null;
  label: string | null;
  guide: Guide | null;
};

export type GuideItemArg = {
  kind: string;
  docType?: string | null;
  conceptKey?: string | null;
  label?: string | null;
};

/**
 * Batch guidance lookup. Memoized by stable JSON of items so we don't
 * refetch on unrelated re-renders.
 */
export function useGuides(items: GuideItemArg[]): GuideRow[] | undefined {
  const normalized = useMemo(
    () =>
      items.map((i) => ({
        kind: i.kind,
        docType: i.docType ?? null,
        conceptKey: i.conceptKey ?? null,
        label: i.label ?? null,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items)],
  );
  return useQuery(
    api.guidance.guideForItems,
    normalized.length === 0 ? "skip" : ({ items: normalized } as never),
  ) as GuideRow[] | undefined;
}

export type ExplainArgs = {
  system?: string;
  externalId?: string;
  kind: string;
  docType?: string | null;
  conceptKey?: string | null;
  label?: string | null;
  prompt?: string | null;
  question?: string;
};

export function useExplainItem() {
  const explain = useAction(api.guidance.explainItem);
  const { token } = useAuth();
  return async (args: ExplainArgs): Promise<{ answer: string }> => {
    if (!token) throw new Error("Sign in to ask AI");
    return (await explain({ token, ...args } as never)) as { answer: string };
  };
}
