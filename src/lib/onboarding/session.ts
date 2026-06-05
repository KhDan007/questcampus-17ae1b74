// Anonymous session id — the onboarding profile key before auth exists.
// The landing page promises "No account required to start", so we mint a
// stable client id in localStorage. When auth lands later, attach this id to
// the authenticated user and migrate the same Convex doc.

const KEY = "qc_session_id";

// Small uuid v4 — crypto.randomUUID is available in all modern browsers.
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = newId();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
