"use client";

import { AmberUnderline } from "./AmberUnderline";
import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { ONBOARDING_PATH, WAITLIST_PATH } from "@/lib/routes";
import {
  PRICE_MVP,
  PRICE_COUNSELOR_ANCHOR,
  WAITLIST_BASE_DISCOUNT,
  REFERRAL_EXTRA_DISCOUNT,
  fmtUsd,
} from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

const FREE_KEYS = ["pricing.free.f1", "pricing.free.f2", "pricing.free.f3", "pricing.free.f4"];
const PAID_KEYS = [
  "pricing.paid.f1",
  "pricing.paid.f2",
  "pricing.paid.f3",
  "pricing.paid.f4",
  "pricing.paid.f5",
];

function Check() {
  return (
    <span aria-hidden className="mt-0.5 shrink-0 text-primary">
      ✓
    </span>
  );
}

export function PricingSection() {
  const { t } = useI18n();
  const anchor = fmtUsd(PRICE_COUNSELOR_ANCHOR);

  // The pricing.waitlist.text template includes inline <strong> styling. We
  // split it at the placeholders so we can still highlight the discount values
  // without per-language HTML strings.
  const waitlistTemplate = t("pricing.waitlist.text", {
    discount: `__D__`,
    refDiscount: `__R__`,
  });
  const parts = waitlistTemplate.split(/(__D__|__R__)/g);

  return (
    <section id="pricing" className="bg-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[960px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-primary">
            {t("pricing.eyebrow")}
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-on-background">
            {t("pricing.heading1", { anchor })}
          </h2>
          <p className="mt-3 text-display-lg-mobile text-primary">
            {t("pricing.heading2")} <AmberUnderline>{t("pricing.wrong")}</AmberUnderline>.
          </p>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          {/* Free */}
          <Reveal y={30}>
            <div className="flex h-full flex-col rounded-lg bg-surface-container-low p-6 ring-1 ring-outline-variant/50">
              <span className="self-start rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-semibold uppercase text-on-surface-variant">
                {t("pricing.free.badge")}
              </span>
              <h3 className="mt-4 text-headline-sm text-on-surface">{t("pricing.free.title")}</h3>
              <p className="mt-2 text-display-lg-mobile font-bold text-on-surface">$0</p>
              <ul className="mt-5 flex-1 space-y-3">
                {FREE_KEYS.map((k) => (
                  <li key={k} className="flex gap-2 text-body-md text-on-surface-variant">
                    <Check />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CTAButton href={ONBOARDING_PATH} variant="ghost" className="w-full">
                  {t("pricing.free.cta")}
                </CTAButton>
              </div>
            </div>
          </Reveal>

          {/* Paid */}
          <Reveal y={30} delay={0.06} scaleFrom={0.97}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg bg-surface-container-high p-6 shadow-[0_12px_32px_-8px_rgba(79,70,229,0.25)] ring-1 ring-primary/20">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
              <span className="self-start rounded-full bg-secondary-container px-3 py-1 text-label-sm font-semibold uppercase text-on-secondary-container">
                {t("pricing.paid.badge")}
              </span>
              <h3 className="mt-4 text-headline-sm text-on-surface">{t("pricing.paid.title")}</h3>
              <div className="mt-2">
                <span className="text-display-lg font-bold text-primary">{fmtUsd(PRICE_MVP)}</span>
                <span className="ml-1 text-label-md font-semibold text-primary">/month</span>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  {t("pricing.paid.subtitle")}
                </p>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  <s>{t("pricing.paid.compare", { anchor })}</s>
                </p>
              </div>
              <ul className="mt-5 flex-1 space-y-3">
                {PAID_KEYS.map((k) => (
                  <li key={k} className="flex gap-2 text-body-md text-on-surface-variant">
                    <Check />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CTAButton href="/unlock" className="w-full">
                  {t("pricing.paid.cta")}
                </CTAButton>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Waitlist callout */}
        <Reveal delay={0.1}>
          <div
            className="mt-6 rounded-lg border-l-[3px] border-secondary-container p-5"
            style={{ background: "rgba(254,166,25,0.15)" }}
          >
            <p className="text-body-md text-on-surface">
              {parts.map((p, i) => {
                if (p === "__D__") {
                  return (
                    <strong key={i} className="text-secondary">
                      {WAITLIST_BASE_DISCOUNT}%
                    </strong>
                  );
                }
                if (p === "__R__") {
                  return (
                    <strong key={i} className="text-secondary">
                      {REFERRAL_EXTRA_DISCOUNT}%
                    </strong>
                  );
                }
                return <span key={i}>{p}</span>;
              })}
            </p>
            <a
              href={WAITLIST_PATH}
              className="mt-2 inline-block text-label-md font-semibold text-secondary hover:underline"
            >
              {t("pricing.waitlist.link")}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
