"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { resolveConvexClientUrl } from "@/lib/backend";

// Single Convex client for the app. Scoped to the onboarding route group so the
// marketing landing page stays fully static (no client runtime shipped there).
// VITE_CONVEX_URL is provisioned by `npx convex dev` (see README/setup).
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    try {
      return new ConvexReactClient(resolveConvexClientUrl());
    } catch {
      return null;
    }
  }, []);

  if (!client) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-headline-md text-on-surface">
          Backend not configured
        </h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Set <code className="rounded bg-surface-container px-1">VITE_CONVEX_URL</code>{" "}
          and run <code className="rounded bg-surface-container px-1">npx convex dev</code>{" "}
          to enable onboarding.
        </p>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
