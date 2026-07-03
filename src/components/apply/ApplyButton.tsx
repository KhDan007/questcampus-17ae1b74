"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Send, Loader2 } from "lucide-react";
import { useApplyActions } from "@/lib/applyQueue/client";
import { useAuth } from "@/lib/auth/useAuth";

type Props = {
  source: string;
  externalId: string;
  targetName: string;
  /** Optional override; defaults to source. */
  system?: string;
  className?: string;
  size?: "sm" | "md";
};

export function ApplyButton({
  source,
  externalId,
  targetName,
  system,
  className,
  size = "sm",
}: Props) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { startApply } = useApplyActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cls =
    className ??
    `inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-${size === "md" ? "3.5" : "2.5"} py-${size === "md" ? "2" : "1"} font-[var(--font-label)] ${size === "md" ? "text-label-md" : "text-label-sm"} font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!isAuthenticated) {
            const redirect =
              typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
            void navigate({ to: "/signin", search: { redirect } as never });
            return;
          }
          setError(null);
          setBusy(true);
          try {
            const { jobId } = await startApply({
              system: system ?? source,
              externalId,
              targetName,
            });
            void navigate({ to: "/apply/$jobId", params: { jobId } });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not start application");
            setBusy(false);
          }
        }}
        className={cls}
        title="Start auto-apply"
      >
        {busy ? (
          <Loader2 className={size === "md" ? "h-4 w-4 animate-spin" : "h-3.5 w-3.5 animate-spin"} />
        ) : (
          <Send className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        )}
        Apply
      </button>
      {error && (
        <p className="mt-1 text-label-sm text-on-error-container" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
