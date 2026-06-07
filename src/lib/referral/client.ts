// Referral capture. The frontend NEVER decides discount %. We only persist the
// ?ref= code so it survives the OAuth round-trip, then forward it at signup.

const QC_REF = "qc_ref";

export function captureRef(): void {
  if (typeof window === "undefined") return;
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    window.localStorage.setItem(QC_REF, normalized);
    const u = new URL(window.location.href);
    u.searchParams.delete("ref");
    window.history.replaceState({}, "", u.toString());
  } catch {
    /* non-fatal */
  }
}

export function getRef(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(QC_REF) || undefined;
}

export function clearRef(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QC_REF);
}

export function shareLinkFor(code: string | null | undefined): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://questcampus.lovable.app";
  return `${origin}/?ref=${code ?? ""}`;
}
