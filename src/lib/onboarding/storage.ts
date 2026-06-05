// LocalStorage fallback for profile data so the profile page works even when
// Convex hasn't been provisioned yet (dev / pre-launch). Mirrors the Convex
// answers shape.

import type { Answers } from "./types";

const PROFILE_KEY = "qc_profile";
const STEP_KEY = "qc_resume_step";

export function saveProfileToLocal(answers: Answers, currentStep: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(answers));
    window.localStorage.setItem(STEP_KEY, String(currentStep));
  } catch {
    /* localStorage quota exceeded — non-critical */
  }
}

export function loadProfileFromLocal(): {
  answers: Answers;
  currentStep: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    const stepRaw = window.localStorage.getItem(STEP_KEY);
    if (!raw) return null;
    return {
      answers: JSON.parse(raw) as Answers,
      currentStep: stepRaw ? parseInt(stepRaw, 10) : 1,
    };
  } catch {
    return null;
  }
}

export function clearProfileFromLocal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(STEP_KEY);
  } catch {
    /* ignore */
  }
}
