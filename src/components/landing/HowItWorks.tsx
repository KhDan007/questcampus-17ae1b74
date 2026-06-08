"use client";

import { Link } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

function StepIcon({ kind, color }: { kind: "book" | "compass" | "star"; color: string }) {
  const stroke = color;
  if (kind === "book") {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke={stroke} strokeWidth="3" aria-hidden>
        <path d="M10 18 L40 24 L70 18 L70 62 L40 68 L10 62 Z" />
        <path d="M40 24 L40 68" />
      </svg>
    );
  }
  if (kind === "compass") {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke={stroke} strokeWidth="3" aria-hidden>
        <circle cx="40" cy="40" r="32" />
        <polygon points="40,14 48,40 40,66 32,40" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke={stroke} strokeWidth="3" aria-hidden strokeLinejoin="round">
      <polygon points="40,8 50,32 76,32 55,48 63,72 40,57 17,72 25,48 4,32 30,32" />
    </svg>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="how-it-works" className="bg-cream px-6 sm:px-12" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="mx-auto max-w-[1200px]">
        <span className="bc-chip">{t("howit.eyebrow") || "HOW IT WORKS"}</span>
        <h2
          className="mt-6 font-display text-ink max-w-[760px]"
          style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {t("howit.heading")}
        </h2>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {/* Card 1 — Red */}
          <div className="relative p-8 overflow-hidden" style={{ background: "#E63022", border: "2px solid #111111", boxShadow: "4px 4px 0 #111111", minHeight: 320 }}>
            <span
              className="absolute font-display"
              style={{ fontWeight: 800, fontSize: 96, lineHeight: 1, color: "rgba(255,255,255,0.18)", top: 8, right: 16 }}
              aria-hidden
            >
              1
            </span>
            <StepIcon kind="book" color="#FFFFFF" />
            <h3 className="mt-6 font-display text-white" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>
              {t("howit.s1.title")}
            </h3>
            <p className="mt-3 font-body" style={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}>
              {t("howit.s1.body")}
            </p>
          </div>

          {/* Card 2 — White */}
          <div className="relative p-8 overflow-hidden bg-white" style={{ border: "2px solid #111111", boxShadow: "4px 4px 0 #111111", minHeight: 320 }}>
            <span
              className="absolute font-display"
              style={{ fontWeight: 800, fontSize: 96, lineHeight: 1, color: "rgba(17,17,17,0.10)", top: 8, right: 16 }}
              aria-hidden
            >
              2
            </span>
            <StepIcon kind="compass" color="#111111" />
            <h3 className="mt-6 font-display text-ink" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>
              {t("howit.s2.title")}
            </h3>
            <p className="mt-3 font-body text-ink-muted" style={{ fontSize: 15 }}>
              {t("howit.s2.body")}
            </p>
          </div>

          {/* Card 3 — Yellow */}
          <div className="relative p-8 overflow-hidden" style={{ background: "#FFCF00", border: "2px solid #111111", boxShadow: "4px 4px 0 #111111", minHeight: 320 }}>
            <span
              className="absolute font-display"
              style={{ fontWeight: 800, fontSize: 96, lineHeight: 1, color: "rgba(17,17,17,0.12)", top: 8, right: 16 }}
              aria-hidden
            >
              3
            </span>
            <StepIcon kind="star" color="#111111" />
            <h3 className="mt-6 font-display text-ink" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>
              {t("howit.s3.title")}
            </h3>
            <p className="mt-3 font-body text-ink-muted" style={{ fontSize: 15 }}>
              {t("howit.s3.body")}
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start gap-3">
          <Link to={ONBOARDING_PATH} className="bc-btn">
            {t("howit.cta")} →
          </Link>
          <p className="font-body text-ink-muted" style={{ fontSize: 13 }}>{t("howit.note")}</p>
        </div>
      </div>
    </section>
  );
}
