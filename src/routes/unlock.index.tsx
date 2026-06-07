"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { NavBar } from "@/components/landing/NavBar";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { InviteFriendsPanel } from "@/components/referrals/InviteFriendsPanel";
import { SIGNIN_PATH } from "@/lib/routes";
import { PRICE_MVP } from "@/lib/config";

export const Route = createFileRoute("/unlock/")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Unlock your full match list" },
      {
        name: "description",
        content:
          "Unlock your full personalized list of safety, target, and reach universities with one secure payment.",
      },
    ],
  }),
  component: UnlockPage,
});

const PERKS = [
  { icon: "🛟", text: "Every safety school where you're a likely admit" },
  { icon: "🎯", text: "Target schools matched to your grades and goals" },
  { icon: "🚀", text: "Reach schools worth aiming for — with the why" },
  { icon: "💰", text: "Scholarship & cost details on every match" },
];

function UnlockPage() {
  const token = auth.getSession()?.token;
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const alreadyPaid = entitlement?.paid === true;

  const referral = useQuery(
    api.referrals.summary,
    token ? { token } : "skip",
  ) as
    | {
        discountPercent: number;
        maxPercent: number;
        perReferralPercent: number;
      }
    | null
    | undefined;
  const discountPct = Math.min(
    referral?.discountPercent ?? 0,
    referral?.maxPercent ?? 50,
  );
  const discountedPrice = discountPct > 0
    ? (PRICE_MVP * (100 - discountPct)) / 100
    : null;
  const formattedDiscounted = discountedPrice !== null
    ? `$${discountedPrice.toFixed(discountedPrice % 1 === 0 ? 0 : 2)}`
    : null;

  return (
    <>
      <NavBar variant="minimal" />
      <main className="min-h-screen bg-surface px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-[640px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-2xl text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)]">
              🔓
            </span>
            <h1 className="mt-6 text-display-lg-mobile text-on-background sm:text-display-lg">
              Unlock your full match list
            </h1>
            <p className="mt-4 text-body-lg text-on-surface-variant">
              One $9 payment. Every match sorted into safety, target, and reach —
              with the why behind each one.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-10 space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6"
          >
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span aria-hidden className="text-xl leading-none">
                  {p.icon}
                </span>
                <span className="text-body-md text-on-surface">{p.text}</span>
              </li>
            ))}
          </motion.ul>

          <div className="mt-10 flex flex-col items-center gap-4">
            {alreadyPaid ? (
              <>
                <p className="text-body-md text-on-surface">
                  ✅ You already have full access.
                </p>
                <Link
                  to="/profile"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-8 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
                >
                  See my full list →
                </Link>
              </>
            ) : (
              <>
                {discountPct > 0 && formattedDiscounted && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-full bg-secondary-container px-4 py-1.5 text-label-md font-semibold text-on-secondary-container"
                  >
                    🎉 {discountPct}% off applied — pay {formattedDiscounted} instead of ${PRICE_MVP}
                  </motion.p>
                )}
                <UnlockButton token={token} />
                {!token && (
                  <p className="text-label-sm text-on-surface-variant">
                    Need an account?{" "}
                    <Link to={SIGNIN_PATH} className="underline hover:text-primary">
                      Sign in or sign up
                    </Link>
                    .
                  </p>
                )}
                <p className="text-label-sm text-on-surface-variant">
                  Secure checkout via Stripe · Referral discount applied automatically
                </p>
              </>
            )}
          </div>

          {token && !alreadyPaid && (
            <div className="mt-12">
              <InviteFriendsPanel token={token} variant="inline" />
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              to="/profile"
              className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              ← Back to your profile
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
