"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type DocKind =
  | "resume"
  | "recommendation_request"
  | "sop"
  | "financial_statement"
  | "activities"
  | "cover_letter"
  | "other"
  | "personal_statement"
  | "supplemental_essay"
  | string;

export type DocFormatSpec = {
  key: string;
  docKind: DocKind;
  system?: string;
  label: string;
  plainText: boolean;
  maxWords?: number;
  minWords?: number;
  maxChars?: number;
  maxLines?: number;
  wrapWidth?: number;
  perItemMaxChars?: number;
  count?: number;
  template?: string;
  rule: string;
};

export type DocFormatView =
  | {
      template: string;
      formatted: string;
      wordCount: number;
      charCount: number;
      lineCount: number;
      violations: string[];
      ok: boolean;
      changed: boolean;
    }
  | {
      template: "activities";
      wordCount: number;
      charCount: number;
      itemCount: number;
      violations: string[];
      ok: boolean;
    };

export type DocDraftSummary = {
  id: string;
  docKind: DocKind;
  system?: string;
  externalId?: string;
  targetName?: string;
  title: string;
  wordCount: number;
  charCount: number;
  ok: boolean;
  updatedAt: number;
};

export type DocDraftFull = {
  id: string;
  docKind: DocKind;
  system?: string;
  externalId?: string;
  targetName?: string;
  title: string;
  content: string;
  spec: DocFormatSpec;
  format: DocFormatView;
  updatedAt: number;
};

export function useDocuments(): DocDraftSummary[] | undefined {
  const { token } = useAuth();
  return useQuery(
    api.documents.list,
    token ? ({ token } as never) : "skip",
  ) as DocDraftSummary[] | undefined;
}

export function useDocument(id: string | undefined): DocDraftFull | undefined {
  const { token } = useAuth();
  return useQuery(
    api.documents.get,
    token && id ? ({ token, id } as never) : "skip",
  ) as DocDraftFull | undefined;
}

export function useDocSpec(
  docKind: DocKind | undefined,
  system?: string,
): DocFormatSpec | undefined {
  return useQuery(
    api.documents.specFor,
    docKind ? ({ docKind, system } as never) : "skip",
  ) as DocFormatSpec | undefined;
}

export function useCreateDocument() {
  const { token } = useAuth();
  const mut = useMutation(api.documents.create);
  return useCallback(
    async (args: {
      docKind: DocKind;
      system?: string;
      externalId?: string;
      targetName?: string;
      title?: string;
    }): Promise<string> => {
      if (!token) throw new Error("Sign in required");
      const res = (await mut({ token, ...args } as never)) as { id: string };
      return res.id;
    },
    [token, mut],
  );
}

export function useRemoveDocument() {
  const { token } = useAuth();
  const mut = useMutation(api.documents.remove);
  return useCallback(
    async (id: string): Promise<void> => {
      if (!token) throw new Error("Sign in required");
      await mut({ token, id } as never);
    },
    [token, mut],
  );
}

/**
 * Debounced save PER doc id. Mirrors useSetAnswer in src/lib/apply/intake.ts.
 */
export function useSaveDocument(debounceMs = 600) {
  const { token } = useAuth();
  const mut = useMutation(api.documents.save);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, { content: string; title?: string }>>({});

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      Object.values(activeTimers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const flushNow = useCallback(
    async (id: string) => {
      if (!token || !id) return;
      const p = pending.current[id];
      if (!p) return;
      delete pending.current[id];
      if (timers.current[id]) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }
      try {
        await mut({ token, id, ...p } as never);
      } catch (e) {
        console.warn("saveDocument failed", e);
      }
    },
    [token, mut],
  );

  const save = useCallback(
    (id: string, content: string, title?: string) => {
      if (!token || !id) return;
      pending.current[id] = { content, ...(title !== undefined ? { title } : {}) };
      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        const p = pending.current[id];
        delete pending.current[id];
        delete timers.current[id];
        if (!p) return;
        mut({ token, id, ...p } as never).catch((e) =>
          console.warn("saveDocument failed", e),
        );
      }, debounceMs);
    },
    [token, mut, debounceMs],
  );

  return { save, flushNow };
}

export type GenerateResult = { ok: true; content: string } | { error: string };

export function useGenerateDoc() {
  const { token } = useAuth();
  const act = useAction(api.documents.generateDoc);
  return useCallback(
    async (id: string, notes?: string): Promise<GenerateResult> => {
      if (!token) return { error: "Sign in required" };
      return (await act({ token, id, notes } as never)) as GenerateResult;
    },
    [token, act],
  );
}

export type ImproveGoal =
  | "tighten"
  | "fix_grammar"
  | "more_impact"
  | "match_format"
  | "professional_tone";

export function useImproveDoc() {
  const { token } = useAuth();
  const act = useAction(api.documents.improveDoc);
  return useCallback(
    async (id: string, goal: ImproveGoal): Promise<GenerateResult> => {
      if (!token) return { error: "Sign in required" };
      return (await act({ token, id, goal } as never)) as GenerateResult;
    },
    [token, act],
  );
}

export function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export const DOC_KIND_OPTIONS: { kind: DocKind; label: string }[] = [
  { kind: "resume", label: "Resume / CV" },
  { kind: "cover_letter", label: "Cover letter" },
  { kind: "sop", label: "Statement of Purpose" },
  { kind: "recommendation_request", label: "Recommendation request" },
  { kind: "financial_statement", label: "Financial statement" },
  { kind: "activities", label: "Activities list" },
  { kind: "other", label: "Other document" },
];

export function isEssayKind(k: DocKind): boolean {
  return k === "personal_statement" || k === "supplemental_essay";
}
