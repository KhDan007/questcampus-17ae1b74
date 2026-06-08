"use client";

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
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
        className={className ?? "bc-btn"}
        style={{ width: "100%", maxWidth: 360 }}
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
