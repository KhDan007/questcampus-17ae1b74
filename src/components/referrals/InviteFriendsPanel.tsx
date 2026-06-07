"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { shareLinkFor } from "@/lib/referral/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Summary = {
  referralCode: string | null;
  referredBy: boolean;
  counts: { total: number; qualified: number; pending: number };
  discountPercent: number;
  perReferralPercent: number;
  maxPercent: number;
} | null;

export function InviteFriendsPanel({
  token,
  variant = "card",
}: {
  token: string | undefined;
  variant?: "card" | "inline";
}) {
  const { t } = useI18n();
  const summary = useQuery(
    api.referrals.summary,
    token ? { token } : "skip",
  ) as Summary | undefined;

  if (!token) return null;
  if (summary === undefined) {
    return <PanelShell variant={variant}><LoadingState /></PanelShell>;
  }
  if (summary === null || !summary.referralCode) {
    return null;
  }

  const link = shareLinkFor(summary.referralCode);
  const pct = Math.min(summary.discountPercent, summary.maxPercent);
  const progress = Math.min(100, (pct / summary.maxPercent) * 100);
  const qualified = summary.counts.qualified;
  const pending = summary.counts.pending;

  const baseBody = t("inv.body", { max: summary.maxPercent });
  const body = summary.referredBy && pct > 0
    ? t("inv.body.bonus", { base: baseBody })
    : t("inv.body.plain", { base: baseBody });

  return (
    <PanelShell variant={variant}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-md font-semibold uppercase text-primary">
            {t("inv.eyebrow")}
          </p>
          <h3 className="mt-1 text-headline-sm text-on-surface">
            {pct > 0 ? t("inv.earnedPct", { pct }) : t("inv.earn")}
          </h3>
          <p className="mt-1 text-body-sm text-on-surface-variant">{body}</p>
        </div>
        <span aria-hidden className="text-2xl">🎁</span>
      </div>

      <ShareRow link={link} code={summary.referralCode} />

      <div className="mt-5">
        <div className="flex items-end justify-between text-label-sm text-on-surface-variant">
          <span>
            {qualified === 1
              ? t("inv.joined.one", { n: qualified })
              : t("inv.joined.many", { n: qualified })}
          </span>
          <span>{pct}% / {summary.maxPercent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        {pending > 0 && (
          <p className="mt-2 text-label-sm text-on-surface-variant">
            {pending === 1
              ? t("inv.pending.one", { n: pending })
              : t("inv.pending.many", { n: pending })}
          </p>
        )}
      </div>
    </PanelShell>
  );
}

function PanelShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "card" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5">
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-surface-container-low p-6 ring-1 ring-outline-variant/40">
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-surface-container-high" />
      <div className="h-2 w-full animate-pulse rounded-full bg-surface-container-high" />
    </div>
  );
}

function ShareRow({ link, code }: { link: string; code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no-op */
    }
  }

  async function share() {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({
          title: "QuestCampus",
          text: t("inv.shareText"),
          url: link,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copy();
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <div className="flex min-h-[48px] flex-1 items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 text-body-sm text-on-surface">
        <span className="truncate" title={link}>{link}</span>
        <span className="ml-auto rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm font-medium text-on-surface-variant">
          {code}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary-container px-5 text-label-md font-semibold text-on-primary transition-transform hover:scale-[1.02]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("inv.copied") : t("inv.copy")}
        </button>
        <button
          type="button"
          onClick={share}
          aria-label={t("inv.share")}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-outline-variant px-4 text-on-surface transition-colors hover:bg-surface-container"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
