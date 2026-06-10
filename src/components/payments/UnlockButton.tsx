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
          setMessage(res.message || t("unlock.genericError"));
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
        {loading ? t("unlock.redirecting") : resolvedLabel}
        {!loading && <span aria-hidden>→</span>}
      </button>
      {!token && (
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
