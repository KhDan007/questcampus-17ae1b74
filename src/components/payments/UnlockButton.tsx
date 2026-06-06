"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { startCheckout } from "@/lib/payments/client";
import { SIGNIN_PATH } from "@/lib/routes";

type Props = {
  token: string | undefined;
  label?: string;
  className?: string;
  onAlreadyPaid?: () => void;
};

// Single source of truth for the "Unlock full matches" CTA. Used both on the
// inline paywall in the profile and on the dedicated /unlock route.
export function UnlockButton({
  token,
  label = "Unlock full list — $5",
  className,
  onAlreadyPaid,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await startCheckout(token);
      switch (res.kind) {
        case "redirect":
          window.location.href = res.url;
          return;
        case "already_paid":
          setMessage("You already have full access — refreshing…");
          onAlreadyPaid?.();
          return;
        case "unauthorized":
          navigate({
            to: SIGNIN_PATH,
            search: { redirect: "/unlock" } as Record<string, string>,
          });
          return;
        case "not_configured":
          setMessage("Payments aren't live yet — check back soon.");
          return;
        case "error":
          setMessage(res.message || "Something went wrong. Try again.");
          return;
      }
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !token;
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={
          className ??
          "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        }
      >
        {loading ? "Redirecting…" : label}
        {!loading && <span aria-hidden>→</span>}
      </button>
      {!token && (
        <p className="text-label-sm text-on-surface-variant">
          <a href={SIGNIN_PATH} className="underline hover:text-primary">
            Sign in
          </a>{" "}
          to unlock.
        </p>
      )}
      {message && (
        <p className="max-w-xs text-center text-label-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </div>
  );
}
