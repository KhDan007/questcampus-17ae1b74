"use client";

import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { ONBOARDING_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

function ProgressTeaser() {
  const { t } = useI18n();
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full w-[42%] rounded-full bg-primary-container" />
      </div>
      <p className="mt-2 text-label-sm text-on-surface-variant">
        {t("howit.teaser.progress")}
      </p>
    </div>
  );
}

function MatchingTeaser() {
  const { t } = useI18n();
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <p className="text-label-sm text-on-surface-variant">
        {t("howit.teaser.matching")}
      </p>
      <div className="mt-3 space-y-2">
        {[100, 80, 60].map((w) => (
          <div
            key={w}
            className="h-3 rounded-full bg-surface-container-high"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function CardTeaser() {
  const { t } = useI18n();
  return (
    <div className="rounded-md bg-surface-container-lowest p-4 ring-1 ring-outline-variant/60">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-semibold text-on-surface">TU Delft</span>
        <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-primary">
          {t("howit.teaser.match", { percent: 92 })}
        </span>
      </div>
      <p className="mt-1 text-label-sm text-on-surface-variant">Delft, Netherlands</p>
      <span className="mt-3 inline-block rounded-full bg-tertiary-container/15 px-2 py-0.5 text-label-sm text-tertiary">
        {t("howit.teaser.scholarship")}
      </span>
    </div>
  );
}

const STEPS = [
  { n: "1", titleKey: "howit.s1.title", bodyKey: "howit.s1.body", Teaser: ProgressTeaser },
  { n: "2", titleKey: "howit.s2.title", bodyKey: "howit.s2.body", Teaser: MatchingTeaser },
  { n: "3", titleKey: "howit.s3.title", bodyKey: "howit.s3.body", Teaser: CardTeaser },
];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section
      id="how-it-works"
      className="bg-surface-container-low px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-primary">
            {t("howit.eyebrow")}
          </p>
          <h2 className="mt-3 max-w-[640px] text-display-lg-mobile text-on-background">
            {t("howit.heading")}
          </h2>
        </Reveal>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-4 hidden border-t border-dashed border-outline-variant md:block"
          />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 0.15} y={40}>
                <div className="relative flex flex-col">
                  <span className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-md font-bold text-on-secondary-container">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-headline-sm text-on-surface">
                    {t(s.titleKey)}
                  </h3>
                  <p className="mt-2 text-body-md text-on-surface-variant">
                    {t(s.bodyKey)}
                  </p>
                  <div className="mt-5"><s.Teaser /></div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14 flex flex-col items-center gap-3">
            <CTAButton href={ONBOARDING_PATH} hoverScale={1.03}>
              {t("howit.cta")}
            </CTAButton>
            <p className="text-label-sm text-on-surface-variant">
              {t("howit.note")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
