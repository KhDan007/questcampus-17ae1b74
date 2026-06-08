"use client";

import { Link } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@/lib/routes";
import { PRICE_MVP, PRICE_COUNSELOR_ANCHOR, fmtUsd } from "@/lib/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

const FREE_KEYS = ["pricing.free.f1", "pricing.free.f2", "pricing.free.f3", "pricing.free.f4"];
const PAID_KEYS = [
  "pricing.paid.f1",
  "pricing.paid.f2",
  "pricing.paid.f3",
  "pricing.paid.f4",
  "pricing.paid.f5",
];

export function PricingSection() {
  const { t } = useI18n();
  const anchor = fmtUsd(PRICE_COUNSELOR_ANCHOR);

  return (
    <section id="pricing" className="bg-cream px-6 sm:px-12" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="mx-auto max-w-[1100px]">
        <span className="bc-chip">{t("pricing.eyebrow") || "PRICING"}</span>
        <h2 className="mt-6 font-display text-ink" style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05 }}>
          {t("pricing.heading1", { anchor })}
        </h2>
        <h2 className="font-display" style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05, color: "#E63022" }}>
          {t("pricing.heading2")} {t("pricing.wrong")}.
        </h2>

        <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-2">
          {/* Free card */}
          <div className="flex flex-col p-8 bg-cream" style={{ border: "2px solid #111111", boxShadow: "4px 4px 0 #111111" }}>
            <span className="bc-chip self-start">{t("pricing.free.badge") || "FREE"}</span>
            <p className="mt-6 font-display text-ink" style={{ fontWeight: 800, fontSize: 56, lineHeight: 1 }}>$0</p>
            <p className="mt-2 font-body text-ink" style={{ fontSize: 16 }}>{t("pricing.free.title")}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {FREE_KEYS.map((k) => (
                <li key={k} className="flex gap-3 font-body text-ink-muted" style={{ fontSize: 15 }}>
                  <span className="text-ink" style={{ fontWeight: 700 }}>✓</span>
                  {t(k)}
                </li>
              ))}
            </ul>
            <Link to={ONBOARDING_PATH} className="bc-btn bc-btn-outline mt-8 w-full">
              {t("pricing.free.cta")}
            </Link>
          </div>

          {/* Paid card */}
          <div className="flex flex-col p-8" style={{ background: "#1B4FD8", border: "2px solid #111111", boxShadow: "4px 4px 0 #111111" }}>
            <span className="bc-chip self-start">{t("pricing.paid.badge") || "MOST POPULAR"}</span>
            <p className="mt-6 font-display text-white" style={{ fontWeight: 800, fontSize: 56, lineHeight: 1 }}>
              {fmtUsd(PRICE_MVP)}
            </p>
            <p className="mt-2 font-body text-white" style={{ fontSize: 14 }}>{t("pricing.paid.subtitle")}</p>
            <p className="mt-1 font-body" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <s>{t("pricing.paid.compare", { anchor })}</s>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {PAID_KEYS.map((k) => (
                <li key={k} className="flex gap-3 font-body text-white" style={{ fontSize: 15 }}>
                  <span style={{ fontWeight: 700 }}>✓</span>
                  {t(k)}
                </li>
              ))}
            </ul>
            <Link to="/unlock" className="bc-btn mt-8 w-full">
              {t("pricing.paid.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
