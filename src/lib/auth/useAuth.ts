import { useSyncExternalStore } from "react";
import {
  subscribeAuth,
  getAuthSnapshot,
  getAuthServerSnapshot,
  type AuthSession,
  type AuthUser,
} from "./client";

export const ADMIN_EMAIL = "admin@questcampus.app";

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;
}

/**
 * Single source of truth for premium gating on the frontend.
 * Backend remains the security boundary — this is UI convenience only.
 */
// TEMPORARY: frontend-only full access for everyone until the timestamp below.
// After this expires, gating falls back to the normal admin/paid check.
// Set to ~3h from deploy (2026-06-12).
const TEMP_FULL_ACCESS_UNTIL_MS = 1781253000000; // ~3h window

export function hasPaidAccess(
  user: { email?: string | null; paid?: boolean } | null | undefined,
): boolean {
  if (Date.now() < TEMP_FULL_ACCESS_UNTIL_MS) return true;
  if (!user) return false;
  return isAdminUser(user) || user.paid === true;
}

export function useAuth(): {
  session: AuthSession | null;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPaidAccess: boolean;
} {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  const user = session?.user ?? null;
  return {
    session,
    user,
    token: session?.token ?? null,
    isAuthenticated: !!session,
    isAdmin: isAdminUser(user),
    hasPaidAccess: hasPaidAccess(user),
  };
}
