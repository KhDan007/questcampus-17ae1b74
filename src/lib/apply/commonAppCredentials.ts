"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type CommonAppCredentialsState = {
  hasCredentials: boolean;
  loginEmail?: string | null;
};

export function useCommonAppCredentials(): CommonAppCredentialsState | undefined {
  const { token } = useAuth();
  const args = token ? { token } : "skip";
  return useQuery(api.commonAppCredentials.has, args as never) as
    | CommonAppCredentialsState
    | undefined;
}

export function useSetCommonAppCredentials() {
  const { token } = useAuth();
  const mutate = useMutation(api.commonAppCredentials.set);
  return useCallback(
    async (email: string, password: string): Promise<{ ok: true }> => {
      if (!token) throw new Error("Sign in required");
      return (await mutate({ token, email, password } as never)) as { ok: true };
    },
    [token, mutate],
  );
}

export function useRemoveCommonAppCredentials() {
  const { token } = useAuth();
  const mutate = useMutation(api.commonAppCredentials.remove);
  return useCallback(async (): Promise<{ ok: true }> => {
    if (!token) throw new Error("Sign in required");
    return (await mutate({ token } as never)) as { ok: true };
  }, [token, mutate]);
}
