// Lightweight client-side tracker for the user's progress through the
// "recommended next steps" funnel surfaced on the dashboard.
//
// Steps (in order):
//   1. refined        — user re-ranked their matches via /onboarding
//   2. essayDrafted   — user generated at least one personal-statement draft
//   3. essayReviewed  — user opened the AI review on their essay
//
// When all three are complete, the dashboard shows the "all caught up" state.

import { useEffect, useState } from "react";

const KEYS = {
  refined: "qc.progress.refined",
  essayDrafted: "qc.progress.essayDrafted",
  essayReviewed: "qc.progress.essayReviewed",
} as const;

export type ProgressKey = keyof typeof KEYS;

export type ProgressState = {
  refined: boolean;
  essayDrafted: boolean;
  essayReviewed: boolean;
};

const EVENT = "qc:progress-change";

function read(key: ProgressKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEYS[key]) === "1";
  } catch {
    return false;
  }
}

export function getProgress(): ProgressState {
  return {
    refined: read("refined"),
    essayDrafted: read("essayDrafted"),
    essayReviewed: read("essayReviewed"),
  };
}

export function markProgress(key: ProgressKey, value = true) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(KEYS[key], "1");
    else window.localStorage.removeItem(KEYS[key]);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export type NextStep = "refine" | "draft" | "review" | "done";

export function nextStep(p: ProgressState): NextStep {
  if (!p.refined) return "refine";
  if (!p.essayDrafted) return "draft";
  if (!p.essayReviewed) return "review";
  return "done";
}

export function useProgress(): ProgressState {
  const [state, setState] = useState<ProgressState>(() => ({
    refined: false,
    essayDrafted: false,
    essayReviewed: false,
  }));
  useEffect(() => {
    const sync = () => setState(getProgress());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return sync();
      if (Object.values(KEYS).includes(e.key as (typeof KEYS)[ProgressKey])) sync();
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return state;
}
