// Thin auth client — talks to Convex HTTP actions defined in your backend.
// All endpoints are relative to VITE_CONVEX_URL. The contract is documented
// at the bottom of this file and mirrored in src/routes/signin.tsx.

const TOKEN_KEY = "qc.auth.token";
const USER_KEY = "qc.auth.user";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

function base(): string {
  const url = import.meta.env.VITE_CONVEX_URL;
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

export const auth = {
  async signUp(email: string, password: string, name?: string): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/auth/sign-up", { email, password, name });
    saveSession(session);
    return session;
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/auth/sign-in", { email, password });
    saveSession(session);
    return session;
  },

  async startGoogle(returnUrl: string): Promise<{ authorizationUrl: string }> {
    return post<{ authorizationUrl: string }>("/api/auth/google/start", { returnUrl });
  },

  async exchangeGoogleCode(code: string, state: string): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/auth/google/callback", { code, state });
    saveSession(session);
    return session;
  },

  signOut(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },

  getSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem(TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    if (!token || !userRaw) return null;
    try {
      return { token, user: JSON.parse(userRaw) as AuthUser };
    } catch {
      return null;
    }
  },
};

function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}
