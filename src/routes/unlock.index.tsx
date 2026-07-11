"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  ShieldCheck,
  Target,
  Rocket,
  PiggyBank,
  LifeBuoy,
  Star,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth/client";
import { useAuth, useFreeHook } from "@/lib/auth/useAuth";
import { UnlockButton } from "@/components/payments/UnlockButton";
import { TiltCard } from "@/components/payments/TiltCard";
import { FreeBadge } from "@/components/common/FreeBadge";

import { SIGNIN_PATH } from "@/lib/routes";
import { PRICE_MVP } from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/unlock/")({
  head: () => ({
    meta: [
      { title: "Unlock your full match list — QuestCampus" },
      {
        name: "description",
        content:
          "Try free for 3 days, then $15/month for your full ranked university shortlist, polished essay drafts, and every premium feature we ship.",
      },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const { isAdmin, user } = useAuth();
  const freeHook = useFreeHook();
  const notTrialed = !user?.hadTrial;
  const token = auth.getSession()?.token;
  const entitlement = useQuery(api.payments.entitlement, token ? { token } : "skip") as
    | { paid: boolean }
    | undefined;
  const alreadyPaid = isAdmin || entitlement?.paid === true;

  const discountPct = 0;
  const formattedDiscounted: string | null = null;

  const perks = [
    { Icon: LifeBuoy, text: t("unlock.perk1") },
    { Icon: Target, text: t("unlock.perk2") },
    { Icon: Rocket, text: t("unlock.perk3") },
    { Icon: PiggyBank, text: t("unlock.perk4") },
  ];

  const guarantees = [
    { Icon: ShieldCheck, label: "Secure Polar checkout" },
    { Icon: Sparkles, label: "3-day free trial, then monthly" },
    { Icon: Check, label: "Refund within 7 days, no questions" },
  ];

  return (
    <>
      <main className="relative min-h-screen bg-surface px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto w-full" style={{ maxWidth: "920px" }}>
          {/* HERO */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary-fixed px-3 py-1 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-secondary-fixed-variant">
              <Sparkles className="h-3.5 w-3.5" />3-day free trial
            </span>

            {freeHook && (
              <div className="mt-4">
                <FreeBadge variant="line" />
              </div>
            )}

            <h1 className="mt-6 text-balance font-display text-[2.5rem] font-black leading-[1.04] tracking-tight text-on-surface sm:text-[3.5rem] lg:text-[4rem]">
              Stop guessing.{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Unlock</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-primary/30 sm:h-4"
                />
              </span>{" "}
              your real shortlist.
            </h1>

            <p className="mx-auto mt-5 max-w-[60ch] text-pretty text-body-lg text-on-surface-variant">
              The full ranked list of safety, target, and reach universities tuned to your profile —
              plus polished essay drafts and every premium feature we ship. Try it free for 3 days,
              then billed monthly at ${PRICE_MVP}/month. Cancel anytime before your trial ends to
              avoid the charge.
            </p>
          </motion.div>

          {/* PRICE CARD */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[1.15fr_1fr]"
          >
            {/* Left: Price + CTA (cursor-tilt) */}
            <TiltCard className="group relative overflow-hidden rounded-3xl border border-on-surface/8 bg-surface-container-lowest p-7 qc-soft-shadow sm:p-9">
              <div className="flex items-center gap-2 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.18em] text-primary">
                <Lock className="h-3.5 w-3.5" />
                The unlock
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
                {freeHook ? (
                  // Lead with the $0 the student pays TODAY; the $15/mo is the
                  // small print (only starts after the 3-day trial).
                  <>
                    <span className="font-display text-[3.5rem] font-black leading-none text-on-surface sm:text-[4rem]">
                      $0
                    </span>
                    <span className="pb-2 font-display text-xl font-bold text-on-surface">
                      today
                    </span>
                    <span className="w-full pb-1 font-[var(--font-label)] text-label-md font-semibold text-on-surface-variant sm:w-auto">
                      then {formattedDiscounted ?? `$${PRICE_MVP}`}/month
                    </span>
                  </>
                ) : discountPct > 0 && formattedDiscounted ? (
                  <>
                    <span className="font-display text-[3.5rem] font-black leading-none text-on-surface sm:text-[4rem]">
                      {formattedDiscounted}
                    </span>
                    <span className="pb-2 font-display text-2xl font-semibold text-on-surface-variant line-through">
                      ${PRICE_MVP}
                    </span>
                    <span className="pb-2 font-[var(--font-label)] text-label-md text-on-surface-variant">
                      /month
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-[3.5rem] font-black leading-none text-on-surface sm:text-[4rem]">
                      ${PRICE_MVP}
                    </span>
                    <span className="pb-2 font-[var(--font-label)] text-label-md text-on-surface-variant">
                      /month
                    </span>
                  </>
                )}
              </div>

              {discountPct > 0 && formattedDiscounted && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary-fixed px-3 py-1 font-[var(--font-label)] text-label-sm font-bold text-on-secondary-fixed-variant">
                  <Sparkles className="h-3.5 w-3.5" />
                  {discountPct}% off from your invites
                </p>
              )}

              <p className="mt-4 text-body-md text-on-surface-variant">
                Free for 3 days, then $15/month for matches, essays, and premium tools. Cancel
                anytime before the trial ends — no charge. Worth months of research,
                second-guessing, and college-counsellor calls.
              </p>

              <div className="mt-7 flex flex-col items-stretch gap-3">
                {alreadyPaid ? (
                  <>
                    <p className="text-body-md font-semibold text-on-surface">
                      {t("unlock.already")}
                    </p>
                    <Link
                      to="/universities"
                      search={{ q: "" }}
                      className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 font-[var(--font-label)] text-label-lg font-bold text-white transition-colors hover:bg-primary/90"
                    >
                      {t("unlock.seeList")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </>
                ) : (
                  <>
                    <UnlockButton
                      token={token}
                      label={notTrialed ? "Start free trial" : undefined}
                      className="group relative inline-flex min-h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-7 font-[var(--font-label)] text-label-lg font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <p className="text-center font-[var(--font-label)] text-label-sm text-on-surface-variant">
                      Card required today, first charge on day 3.
                    </p>
                  </>
                )}
              </div>

              <ul className="mt-6 flex flex-col gap-2 border-t border-dashed border-on-surface/15 pt-5">
                {guarantees.map(({ Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2.5 text-label-md text-on-surface/80"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    {label}
                  </li>
                ))}
              </ul>
            </TiltCard>

            {/* Right: What you get */}
            <div className="rounded-3xl border border-on-surface/8 bg-secondary-fixed/40 p-7 qc-soft-shadow sm:p-9">
              <div className="flex items-center gap-2 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.18em] text-on-surface/80">
                <Star className="h-3.5 w-3.5" />
                What you get
              </div>
              <ul className="mt-5 space-y-4">
                {perks.map(({ Icon, text }, idx) => (
                  <motion.li
                    key={text}
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.15 + idx * 0.06,
                    }}
                    className="flex items-start gap-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-container-lowest text-on-surface">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1 text-body-md font-medium text-on-surface">{text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-on-surface/15 bg-surface-container/50 px-5 py-5 text-center sm:flex-row sm:gap-6 sm:text-left"
          >
            <div className="flex -space-x-2">
              {[
                "bg-primary-fixed text-on-primary-fixed-variant",
                "bg-secondary-fixed text-on-secondary-fixed-variant",
                "bg-tertiary-fixed text-on-tertiary-fixed-variant",
                "bg-surface-container text-on-surface-variant",
              ].map((bg, i) => (
                <span
                  key={i}
                  className={`grid h-9 w-9 place-items-center rounded-full border border-surface-container-lowest ${bg} font-[var(--font-label)] text-label-sm font-bold`}
                >
                  {["A", "M", "J", "S"][i]}
                </span>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 sm:justify-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="mt-1 text-label-md text-on-surface/80">
                Trusted by students applying to{" "}
                <span className="font-bold text-on-surface">Oxford, MIT, NUS, Sciences Po</span> and
                80+ more.
              </p>
            </div>
          </motion.div>




          <div className="mt-12 text-center">
            <Link
              to="/universities"
              search={{ q: "" }}
              className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              {t("unlock.back")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
