// Thin auth client — talks to Convex HTTP actions defined in your backend.
// All endpoints are relative to VITE_CONVEX_URL. The contract is documented
// at the bottom of this file and mirrored in src/routes/signin.tsx.

// Referral system removed.

const TOKEN_KEY = "qc.auth.token";
const USER_KEY = "qc.auth.user";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  paid?: boolean;
  emailVerified?: boolean;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export const VERIFY_EMAIL_EVENT = "qc:verify-email";

export function requestEmailVerification(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VERIFY_EMAIL_EVENT));
}

function base(): string {
  const explicit = import.meta.env.VITE_CONVEX_SITE_URL;
  const base = import.meta.env.VITE_CONVEX_URL;
  const url =
    explicit ??
    base?.replace(".convex.cloud", ".convex.site").replace("convex.", "api.");
  if (!url) throw new Error("VITE_CONVEX_URL is not set");
  return url.replace(/\/$/, "");
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
      (json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : null) ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

// ── Reactive store ──────────────────────────────────────────────────────────
// useSyncExternalStore-compatible store so the header (and any hook) updates
// instantly on sign-in / sign-out without a reload.

const listeners = new Set<() => void>();

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
}

let snapshot: AuthSession | null = readSession();

function emit() {
  snapshot = readSession();
  listeners.forEach((l) => l());
}

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAuthSnapshot(): AuthSession | null {
  return snapshot;
}

export function getAuthServerSnapshot(): AuthSession | null {
  return null;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === null) emit();
  });
}

export const auth = {
  async signUp(email: string, password: string, name?: string): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/auth/sign-up", {
      email,
      password,
      name,
    });
    saveSession(session);
    return session;
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    // Attribution is first-signup only — do NOT forward the ref code here.
    const session = await post<AuthSession>("/api/auth/sign-in", { email, password });
    saveSession(session);
    return session;
  },

  async startGoogle(returnUrl: string): Promise<{ authorizationUrl: string }> {
    return post<{ authorizationUrl: string }>("/api/auth/google/start", { returnUrl });
  },

  async exchangeGoogleCode(code: string, state: string): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/auth/google/callback", {
      code,
      state,
    });
    saveSession(session);
    return session;
  },

  signOut(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem("qc_profile");
    window.localStorage.removeItem("qc_resume_step");
    window.localStorage.removeItem("qc_session_id");
    emit();
  },

  getSession(): AuthSession | null {
    return readSession();
  },

  updateUser(user: AuthUser): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    emit();
  },

  async sendVerifyEmail(token: string): Promise<{
    sent?: boolean;
    alreadyVerified?: boolean;
    retryAfter?: number;
    error?: string;
  }> {
    const res = await fetch(`${base()}/api/auth/verify-email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      return { error: body?.error ?? "Too many requests.", retryAfter: body?.retryAfter };
    }
    return body ?? {};
  },

  async confirmVerifyEmail(
    token: string,
    code: string,
  ): Promise<
    | { ok: true; user: AuthUser }
    | { ok: false; status: number; error: string; attemptsLeft?: number; expired?: boolean; locked?: boolean }
  > {
    const res = await fetch(`${base()}/api/auth/verify-email/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.user) {
      return { ok: true, user: body.user as AuthUser };
    }
    return {
      ok: false,
      status: res.status,
      error: body?.error ?? "Verification failed.",
      attemptsLeft: body?.attemptsLeft,
      expired: body?.expired,
      locked: body?.locked,
    };
  },
};

function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  emit();
}
