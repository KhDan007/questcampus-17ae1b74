import { useEffect, useState, useSyncExternalStore } from "react";
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
export function hasPaidAccess(
  user: { email?: string | null; paid?: boolean } | null | undefined,
): boolean {
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
  isHydrated: boolean;
} {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  // Track client-side hydration so route guards don't redirect to /signin
  // during the first render pass (when the server snapshot is null even
  // for signed-in users whose token lives in localStorage).
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const user = session?.user ?? null;
  return {
    session,
    user,
    token: session?.token ?? null,
    isAuthenticated: !!session,
    isAdmin: isAdminUser(user),
    hasPaidAccess: hasPaidAccess(user),
    isHydrated,
  };
}
