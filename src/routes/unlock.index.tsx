"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { NavBar } from "@/components/landing/NavBar";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { InviteFriendsPanel } from "@/components/referrals/InviteFriendsPanel";
import { SIGNIN_PATH } from "@/lib/routes";
import { PRICE_MVP } from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Unlock your full match list" },
      { name: "description", content: "Unlock your full personalized list of safety, target, and reach universities." },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const { t } = useI18n();
  const token = auth.getSession()?.token;
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean } | undefined;
  const alreadyPaid = entitlement?.paid === true;

  const referral = useQuery(api.referrals.summary, token ? { token } : "skip") as
    | { discountPercent: number; maxPercent: number; perReferralPercent: number } | null | undefined;
  const discountPct = Math.min(referral?.discountPercent ?? 0, referral?.maxPercent ?? 50);
  const discountedPrice = discountPct > 0 ? (PRICE_MVP * (100 - discountPct)) / 100 : null;
  const formattedDiscounted = discountedPrice !== null
    ? `$${discountedPrice.toFixed(discountedPrice % 1 === 0 ? 0 : 2)}` : null;

  const perks = [
    t("unlock.perk1"),
    t("unlock.perk2"),
    t("unlock.perk3"),
    t("unlock.perk4"),
  ];

  return (
    <>
      <NavBar variant="minimal" />
      <main className="grid min-h-screen w-full" style={{ paddingTop: 64 }}>
        <div className="grid w-full lg:grid-cols-2" style={{ minHeight: "calc(100vh - 64px)" }}>
          {/* LEFT — red */}
          <div
            className="flex flex-col justify-center px-8 py-16 lg:px-16"
            style={{ background: "#E63022", color: "#FFFFFF" }}
          >
            <svg width="180" height="180" viewBox="0 0 120 120" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" aria-hidden>
              <polygon points="60,10 75,46 114,46 82,68 95,108 60,84 25,108 38,68 6,46 45,46" />
            </svg>
            <h1 className="mt-8 font-display" style={{ fontWeight: 800, fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              {t("unlock.title")}
            </h1>
            <p className="mt-4 font-body" style={{ fontSize: 16, color: "rgba(255,255,255,0.85)" }}>
              {t("unlock.subtitle", { price: PRICE_MVP })}
            </p>
            <ul className="mt-8 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-3 font-body" style={{ fontSize: 15 }}>
                  <span style={{ fontWeight: 700 }}>✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — cream */}
          <div className="flex flex-col justify-center px-8 py-16 lg:px-16 bg-cream">
            <span className="bc-chip self-start">ONE-TIME UNLOCK</span>
            <p className="mt-6 font-display text-ink" style={{ fontWeight: 800, fontSize: 72, lineHeight: 1 }}>
              ${PRICE_MVP}
            </p>
            <p className="mt-2 font-body text-ink-muted" style={{ fontSize: 14 }}>
              Not a subscription. Pay once, yours forever.
            </p>
            <p className="mt-1 font-body text-ink-muted" style={{ fontSize: 12 }}>
              <s>Private counselors: $1,500+</s>
            </p>

            {discountPct > 0 && formattedDiscounted && (
              <span className="bc-chip mt-4 self-start" style={{ height: 32, fontSize: 12 }}>
                {t("unlock.discount", { pct: discountPct, discounted: formattedDiscounted, price: PRICE_MVP })}
              </span>
            )}

            <div className="mt-8 flex flex-col items-start gap-3">
              {alreadyPaid ? (
                <>
                  <p className="font-body text-ink" style={{ fontSize: 15 }}>{t("unlock.already")}</p>
                  <Link to="/profile" className="bc-btn">{t("unlock.seeList")} →</Link>
                </>
              ) : (
                <>
                  <UnlockButton token={token} />
                  {!token && (
                    <p className="font-body text-ink-muted" style={{ fontSize: 13 }}>
                      {t("unlock.needAccount")}{" "}
                      <Link to={SIGNIN_PATH} className="underline text-ink">{t("unlock.signinLink")}</Link>
                    </p>
                  )}
                  <p className="font-body text-ink-muted" style={{ fontSize: 12 }}>
                    {t("unlock.secureNote")}
                  </p>
                </>
              )}
            </div>

            {token && !alreadyPaid && (
              <div className="mt-12">
                <InviteFriendsPanel token={token} variant="inline" />
              </div>
            )}

            <Link to="/profile" className="mt-8 font-body text-ink-muted hover:text-ink" style={{ fontSize: 14 }}>
              ← {t("unlock.back")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
