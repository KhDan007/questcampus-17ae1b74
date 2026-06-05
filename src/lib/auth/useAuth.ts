import { useSyncExternalStore } from "react";
import {
  subscribeAuth,
  getAuthSnapshot,
  getAuthServerSnapshot,
  type AuthSession,
  type AuthUser,
} from "./client";

export function useAuth(): {
  session: AuthSession | null;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
} {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  return {
    session,
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: !!session,
  };
}
