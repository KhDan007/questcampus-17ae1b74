import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";

function base(): string {
  const explicit = import.meta.env.VITE_CONVEX_SITE_URL;
  const cloud = import.meta.env.VITE_CONVEX_URL;
  const url = explicit ?? cloud?.replace(".convex.cloud", ".convex.site");
  if (!url) throw new Error("VITE_CONVEX_URL is not set");
  return url.replace(/\/$/, "");
}

export type JoinWaitlistResult =
  | { ok: true; alreadyJoined: boolean; emailSent: boolean }
  | { ok: false; error: string };

export async function joinWaitlist(
  email: string,
  opts?: { name?: string; why?: string },
): Promise<JoinWaitlistResult> {
  const session = auth.getSession();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  const body: Record<string, unknown> = { email };
  if (opts?.name) body.name = opts.name;
  if (opts?.why) body.why = opts.why;
  if (sessionId) body.sessionId = sessionId;

  const res = await fetch(`${base()}/api/waitlist/join`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Request failed (${res.status})`;
    return { ok: false, error: message };
  }

  if (json && typeof json === "object" && "ok" in json && (json as { ok?: boolean }).ok === true) {
    return {
      ok: true,
      alreadyJoined: (json as { alreadyJoined?: boolean }).alreadyJoined ?? false,
      emailSent: (json as { emailSent?: boolean }).emailSent ?? false,
    };
  }

  return { ok: false, error: "Unexpected response" };
}
