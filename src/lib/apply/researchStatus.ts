import type { ResearchProgress } from "./uniData";

export type ResearchStatusTone =
  | "loading"
  | "queued"
  | "researching"
  | "ready"
  | "partial"
  | "blocked"
  | "error";

export type ResearchStatusView = {
  tone: ResearchStatusTone;
  label: string;
  detail: string;
  percent: number | null;
};

function clampPercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function researchStatusView(
  research: ResearchProgress | null | undefined,
): ResearchStatusView {
  if (research === undefined) {
    return {
      tone: "loading",
      label: "Checking research",
      detail: "Connecting to the backend for the latest portal status.",
      percent: null,
    };
  }

  if (research === null) {
    return {
      tone: "queued",
      label: "Queued after save",
      detail: "Save this school and background research starts automatically.",
      percent: null,
    };
  }

  const percent = clampPercent(research.progress?.percent);

  if (research.status === "ready") {
    const partial = research.coverage === "partial";
    return {
      tone: partial ? "partial" : "ready",
      label: partial ? "Partial requirements ready" : "Requirements ready",
      detail: partial
        ? "The backend found usable public requirements, with a few details still being checked."
        : "Requirements, deadlines, and prep details are connected.",
      percent: 100,
    };
  }

  if (research.status === "paywalled") {
    return {
      tone: "blocked",
      label: "Manual portal check",
      detail: "Some details are behind a portal. Public requirements remain usable.",
      percent,
    };
  }

  if (research.status === "error") {
    return {
      tone: "error",
      label: "Research paused",
      detail: "Public details stay available while the backend retries or falls back.",
      percent,
    };
  }

  return {
    tone: "researching",
    label: "Researching requirements",
    detail: research.progress?.message ?? "Pulling requirements, deadlines, and portal notes.",
    percent,
  };
}

// Maps the backend readiness quality status (checklistForTargets.perTarget[].
// qualityStatus, from the full data-quality gate) to a badge view. "ready_to_fill"
// is the ONLY green state — a thin or partial catalog never reads as ready.
export function qualityStatusView(input: {
  qualityStatus: string;
  blockedReason?: string | null;
}): ResearchStatusView {
  switch (input.qualityStatus) {
    case "ready_to_fill":
      return {
        tone: "ready",
        label: "Ready to apply",
        detail: "Requirements, your details, and the portal mapping are all set.",
        percent: 100,
      };
    case "needs_user_input":
      return {
        tone: "partial",
        label: "Add your info",
        detail: "We have the requirements; a few of your details are still needed.",
        percent: null,
      };
    case "unsupported":
      return {
        tone: "blocked",
        label: "Manual portal",
        detail: "This portal needs a manual step. We'll guide you through it.",
        percent: null,
      };
    case "needs_research":
    default:
      return {
        tone: "researching",
        label: "Still researching",
        detail: "We're still confirming this university's requirements.",
        percent: null,
      };
  }
}
