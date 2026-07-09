"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAutoApplyGate } from "@/lib/apply/autoApplyGate";

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
  // All hooks unconditionally at the top — Rules of Hooks.
  const navigate = useNavigate();
  const gate = useAutoApplyGate();
  const [busy, setBusy] = useState(false);

  const cls =
    className ??
    `inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-${size === "md" ? "3.5" : "2.5"} py-${size === "md" ? "2" : "1"} font-[var(--font-label)] ${size === "md" ? "text-label-md" : "text-label-sm"} font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          switch (gate.evaluate()) {
            case "signin_required": {
              const redirect =
                typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
              await navigate({ to: "/signin", search: { redirect } as never });
              return;
            }
            case "extension_required":
              await navigate({
                to: "/extension",
                search: { system: system ?? source, externalId } as never,
              });
              return;
            case "profile_incomplete":
              toast.message("Finish your Common App profile first — the extension fills from those answers.");
              await navigate({ to: "/common-app" });
              return;
            case "ready":
              await navigate({
                to: "/application/$system/$externalId",
                params: { system: system ?? source, externalId },
              });
              return;
          }
        } finally {
          setBusy(false);
        }
      }}
      className={cls}
      title={targetName ? `Apply to ${targetName}` : "Apply"}
    >
      {busy ? (
        <Loader2 className={size === "md" ? "h-4 w-4 animate-spin" : "h-3.5 w-3.5 animate-spin"} />
      ) : (
        <Send className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      )}
      Apply
    </button>
  );
}

