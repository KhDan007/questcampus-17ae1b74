import { auth } from "@/lib/auth/client";
import { resolveConvexSiteUrl } from "@/lib/backend";
import { getCurrentLang, i18nHeaders } from "@/lib/i18n/I18nProvider";
import { getSessionId } from "@/lib/onboarding/session";

function base(): string {
  return resolveConvexSiteUrl();
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
    ...i18nHeaders(),
  };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  const body: Record<string, unknown> = { email, lang: getCurrentLang() };
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
    const message = localizedError(json, `Request failed (${res.status})`);
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

function localizedError(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const i18n = (json as { errorI18n?: unknown }).errorI18n;
  if (i18n && typeof i18n === "object") {
    const translated = (i18n as Record<string, unknown>)[getCurrentLang()];
    if (typeof translated === "string" && translated) return translated;
  }
  const error = (json as { error?: unknown }).error;
  return typeof error === "string" && error ? error : fallback;
}
