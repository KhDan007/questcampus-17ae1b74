"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { startCheckout } from "@/lib/payments/client";
import { SIGNIN_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PRICE_MVP } from "@/lib/config";

type Props = {
  token: string | undefined;
  label?: string;
  className?: string;
  onAlreadyPaid?: () => void;
};

export function UnlockButton({ token, label, className, onAlreadyPaid }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => setMounted(true), []);
  const [message, setMessage] = useState<string | null>(null);

  const resolvedLabel = label ?? t("unlock.button", { price: PRICE_MVP });

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
          setMessage(t("unlock.alreadyHave"));
          onAlreadyPaid?.();
          return;
        case "unauthorized":
          navigate({
            to: SIGNIN_PATH,
            search: { redirect: "/unlock" } as Record<string, string>,
          });
          return;
        case "not_configured":
          setMessage(t("unlock.notLive"));
          return;
        case "error":
          // Never surface a raw backend/Polar error (e.g. "Polar checkout 401:
          // {…}") to the user — always a friendly, actionable message.
          setMessage(t("unlock.genericError"));
          return;
      }
    } finally {
      setLoading(false);
    }
  }

  // Until mounted, treat as "has token" to avoid SSR/client mismatch since
  // token is read from localStorage and is always undefined on the server.
  const disabled = mounted ? loading || !token : loading;
  const showSignInHint = mounted && !token;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={
          className ??
          "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        }
      >
        {loading ? t("unlock.redirecting") : resolvedLabel}
        {!loading && <span aria-hidden>→</span>}
      </button>
      {showSignInHint && (
        <p className="text-label-sm text-on-surface-variant">
          <a href={SIGNIN_PATH} className="underline hover:text-primary">
            {t("unlock.signinPrompt")}
          </a>{" "}
          {t("unlock.signinSuffix")}
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
