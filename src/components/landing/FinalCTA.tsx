"use client";

import { Link } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function FinalCTA() {
  const { t } = useI18n();
  return (
    <section className="flex w-full items-center justify-center px-6 sm:px-12" style={{ background: "#E63022", minHeight: 280, paddingTop: 64, paddingBottom: 64 }}>
      <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
        <h2 className="font-display text-white" style={{ fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          {t("final.heading")}
        </h2>
        <p className="mt-4 font-body" style={{ fontSize: 16, color: "rgba(255,255,255,0.85)" }}>
          {t("final.subtitle")}
        </p>
        <Link to={ONBOARDING_PATH} className="bc-btn mt-8">
          {t("final.cta")} →
        </Link>
      </div>
    </section>
  );
}
