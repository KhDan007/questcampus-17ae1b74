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

const FREE_FEATURES = [
  "Full 7-chapter onboarding",
  "2–3 personalized university matches",
  "AI explanation for each match",
  "Scholarship type highlighted",
];

const PAID_FEATURES = [
  "Everything in Free",
  "Full safety / target / reach list",
  "Filters by country, scholarship type, deadline",
  "Direct application links",
  "Priority support",
];

function Check() {
  return (
    <span aria-hidden className="mt-0.5 shrink-0 text-primary">
      ✓
    </span>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="bg-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[960px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-on-background">
            The best college counseling advice
            <br className="hidden sm:block" /> used to cost{" "}
            {fmtUsd(PRICE_COUNSELOR_ANCHOR)}.
          </h2>
          <p className="mt-3 text-display-lg-mobile text-primary">
            We think that&apos;s <AmberUnderline>wrong</AmberUnderline>.
          </p>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          {/* Free */}
          <Reveal y={30}>
            <div className="flex h-full flex-col rounded-lg bg-surface-container-low p-6 ring-1 ring-outline-variant/50">
              <span className="self-start rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-semibold uppercase text-on-surface-variant">
                Free
              </span>
              <h3 className="mt-4 text-headline-sm text-on-surface">
                See if it&apos;s for you
              </h3>
              <p className="mt-2 text-display-lg-mobile font-bold text-on-surface">
                $0
              </p>
              <ul className="mt-5 flex-1 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2 text-body-md text-on-surface-variant">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CTAButton href={ONBOARDING_PATH} variant="ghost" className="w-full">
                  Start for free →
                </CTAButton>
              </div>
            </div>
          </Reveal>

          {/* Paid — featured */}
          <Reveal y={30} delay={0.06} scaleFrom={0.97}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg bg-surface-container-high p-6 shadow-[0_12px_32px_-8px_rgba(79,70,229,0.25)] ring-1 ring-primary/20">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] bg-primary"
              />
              <span className="self-start rounded-full bg-secondary-container px-3 py-1 text-label-sm font-semibold uppercase text-on-secondary-container">
                Most popular
              </span>
              <h3 className="mt-4 text-headline-sm text-on-surface">
                Get the full picture
              </h3>
              <div className="mt-2">
                <span className="text-display-lg font-bold text-primary">
                  {fmtUsd(PRICE_MVP)}
                </span>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  one-time payment · not a subscription
                </p>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  <s>{fmtUsd(PRICE_COUNSELOR_ANCHOR)}+ with a private counselor</s>
                </p>
              </div>
              <ul className="mt-5 flex-1 space-y-3">
                {PAID_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2 text-body-md text-on-surface-variant">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CTAButton href={ONBOARDING_PATH} className="w-full">
                  Get full access →
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
              Joining the waitlist? Get{" "}
              <strong className="text-secondary">
                {WAITLIST_BASE_DISCOUNT}% off
              </strong>{" "}
              at launch — plus an extra{" "}
              <strong className="text-secondary">
                {REFERRAL_EXTRA_DISCOUNT}% off per friend you refer
              </strong>
              . Founding Member badge included.
            </p>
            <a
              href={WAITLIST_PATH}
              className="mt-2 inline-block text-label-md font-semibold text-secondary hover:underline"
            >
              Join the waitlist →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
