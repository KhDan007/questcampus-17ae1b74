// Local-only version history for personal statements.
// The backend stores a single current essay per essayId; we snapshot drafts
// in localStorage so the user can scroll back through their own edits.

export type EssayVersion = {
  id: string;
  ts: number;
  fullText: string;
  wordCount: number;
  label?: string; // e.g. "Generated", "Edited", "Stronger hook"
};

const KEY = (essayId: string) => `qc.essay.versions.${essayId}`;
const MAX_VERSIONS = 25;

function safeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadVersions(essayId: string): EssayVersion[] {
  if (typeof window === "undefined" || !essayId) return [];
  try {
    const raw = window.localStorage.getItem(KEY(essayId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EssayVersion[]) : [];
  } catch {
    return [];
  }
}

export function pushVersion(
  essayId: string,
  v: { fullText: string; wordCount: number; label?: string },
): EssayVersion | null {
  if (typeof window === "undefined" || !essayId) return null;
  const text = (v.fullText ?? "").trim();
  if (!text) return null;
  const list = loadVersions(essayId);
  // Skip if identical to the most recent snapshot.
  if (list[0]?.fullText === v.fullText) return list[0];
  const entry: EssayVersion = {
    id: safeId(),
    ts: Date.now(),
    fullText: v.fullText,
    wordCount: v.wordCount,
    label: v.label,
  };
  const next = [entry, ...list].slice(0, MAX_VERSIONS);
  try {
    window.localStorage.setItem(KEY(essayId), JSON.stringify(next));
  } catch {
    /* quota: ignore */
  }
  return entry;
}

export function clearVersions(essayId: string) {
  if (typeof window === "undefined" || !essayId) return;
  try {
    window.localStorage.removeItem(KEY(essayId));
  } catch {
    /* ignore */
  }
}

export function formatVersionTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}
