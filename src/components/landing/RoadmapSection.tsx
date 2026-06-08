"use client";

import { CTAButton } from "./CTAButton";
import { Reveal } from "./Reveal";
import { WAITLIST_PATH } from "@/lib/routes";
import {
  PRICE_FULL,
  WAITLIST_BASE_DISCOUNT,
  REFERRAL_EXTRA_DISCOUNT,
  fmtUsd,
} from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Status = "soon" | "later";

const ITEMS: { icon: string; titleKey: string; bodyKey: string; status: Status }[] = [
  { icon: "📝", titleKey: "roadmap.r1.title", bodyKey: "roadmap.r1.body", status: "soon" },
  { icon: "📋", titleKey: "roadmap.r2.title", bodyKey: "roadmap.r2.body", status: "soon" },
  { icon: "📄", titleKey: "roadmap.r3.title", bodyKey: "roadmap.r3.body", status: "soon" },
  { icon: "🗓️", titleKey: "roadmap.r4.title", bodyKey: "roadmap.r4.body", status: "soon" },
  { icon: "🤖", titleKey: "roadmap.r5.title", bodyKey: "roadmap.r5.body", status: "later" },
];

function StatusChip({ status }: { status: Status }) {
  const { t } = useI18n();
  const cls =
    status === "soon"
      ? "bg-tertiary-container/20 text-tertiary-fixed-dim"
      : "bg-white/10 text-outline-variant";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-medium ${cls}`}>
      {status === "soon" ? t("roadmap.status.soon") : t("roadmap.status.later")}
    </span>
  );
}

function RoadmapCard({ item }: { item: (typeof ITEMS)[number] }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-w-[78%] snap-start flex-col rounded-lg bg-white/[0.04] p-5 ring-1 ring-white/10 md:min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-3xl" aria-hidden>{item.icon}</span>
        <StatusChip status={item.status} />
      </div>
      <h3 className="mt-4 text-headline-sm text-inverse-on-surface">
        {t(item.titleKey)}
      </h3>
      <p className="mt-2 text-body-md text-outline-variant">{t(item.bodyKey)}</p>
    </div>
  );
}

export function RoadmapSection() {
  const { t } = useI18n();
  return (
    <section className="bg-inverse-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <p className="text-label-md font-semibold uppercase text-secondary-container">
            {t("roadmap.eyebrow")}
          </p>
          <h2 className="mt-3 text-display-lg-mobile text-inverse-on-surface">
            {t("roadmap.heading")}
          </h2>
          <p className="mt-3 max-w-[640px] text-body-lg text-outline-variant">
            {t("roadmap.subtitle")}
          </p>
        </Reveal>

        <div className="relative mt-12">
          <div className="flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0">
            {ITEMS.map((item, i) => (
              <Reveal
                key={item.titleKey}
                delay={i * 0.1}
                y={30}
                className={
                  i === ITEMS.length - 1
                    ? "md:col-span-2 md:mx-auto md:w-1/2"
                    : undefined
                }
              >
                <RoadmapCard item={item} />
              </Reveal>
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-inverse-surface to-transparent md:hidden"
          />
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center text-center">
            <p className="max-w-[620px] text-body-md text-inverse-on-surface">
              {t("roadmap.waitlistText", {
                discount: WAITLIST_BASE_DISCOUNT,
                refDiscount: REFERRAL_EXTRA_DISCOUNT,
                price_full: fmtUsd(PRICE_FULL),
              })}
            </p>
            <div className="mt-6">
              <CTAButton href={WAITLIST_PATH} variant="amber" hoverScale={1.03}>
                {t("roadmap.cta")}
              </CTAButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
