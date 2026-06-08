"use client";

import { Reveal } from "./Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";

const PAINS = [
  { icon: "🧭", titleKey: "problem.p1.title", bodyKey: "problem.p1.body" },
  { icon: "💸", titleKey: "problem.p2.title", bodyKey: "problem.p2.body" },
  { icon: "⏰", titleKey: "problem.p3.title", bodyKey: "problem.p3.body" },
];

export function ProblemSection() {
  const { t } = useI18n();
  return (
    <section className="bg-inverse-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[900px]">
        <Reveal y={20} scaleFrom={0.95}>
          <h2 className="mx-auto max-w-[720px] text-center text-headline-md text-inverse-on-surface">
            {t("problem.heading")}
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {PAINS.map((p, i) => (
            <Reveal as="li" key={p.titleKey} delay={i * 0.12} y={30}>
              <div className="h-full rounded-lg bg-surface-container-high/10 p-6 ring-1 ring-white/10">
                <span className="text-2xl" aria-hidden>{p.icon}</span>
                <h3 className="mt-4 text-headline-sm text-inverse-on-surface">
                  {t(p.titleKey)}
                </h3>
                <p className="mt-2 text-body-md text-outline-variant">{t(p.bodyKey)}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2} y={20}>
          <blockquote className="mx-auto mt-12 max-w-[600px] border-l-[3px] border-secondary-container pl-5">
            <p className="text-body-lg italic text-inverse-on-surface">
              {t("problem.quote")}
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
