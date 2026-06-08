"use client";

import { Link } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function HeroSection() {
  const { t } = useI18n();
  return (
    <section
      className="relative grid w-full"
      style={{
        minHeight: "calc(100vh - 64px)",
        marginTop: 64,
        gridTemplateColumns: "1fr",
      }}
    >
      <div className="grid w-full lg:grid-cols-[55%_45%]">
        {/* LEFT — cream panel */}
        <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20 bg-cream">
          <span className="bc-chip self-start">{t("hero.badge") || "AI UNIVERSITY MATCHING"}</span>

          <h1
            className="mt-8 font-display text-ink"
            style={{
              fontWeight: 800,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
            }}
          >
            {t("hero.titleA")}
            <br />
            {t("hero.titleB")}
          </h1>

          <p className="mt-6 max-w-[520px] font-body text-ink-muted" style={{ fontSize: 16, lineHeight: 1.55 }}>
            {t("hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-col items-start gap-3">
            <Link to={ONBOARDING_PATH} className="bc-btn">
              {t("hero.cta")}
            </Link>
            <p className="font-body text-ink-muted" style={{ fontSize: 13 }}>{t("hero.note")}</p>
          </div>
        </div>

        {/* RIGHT — red panel */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ background: "#E63022", minHeight: 320 }}
        >
          {/* Compass SVG */}
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            aria-hidden
          >
            <circle cx="120" cy="120" r="100" />
            <circle cx="120" cy="120" r="70" />
            <polygon points="120,40 135,120 120,200 105,120" fill="#FFFFFF" stroke="#FFFFFF" />
            <polygon points="40,120 120,105 200,120 120,135" fill="none" />
            <circle cx="120" cy="120" r="6" fill="#FFFFFF" />
          </svg>

          {/* Floating card — top right */}
          <div
            className="absolute bg-white"
            style={{
              top: "12%",
              right: "8%",
              border: "2px solid #111111",
              boxShadow: "4px 4px 0 #111111",
              padding: 16,
              minWidth: 140,
            }}
          >
            <div className="font-display text-ink" style={{ fontWeight: 800, fontSize: 36, lineHeight: 1 }}>94</div>
            <div className="font-body text-ink" style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", marginTop: 4 }}>MATCH</div>
            <div className="font-body text-ink" style={{ fontWeight: 500, fontSize: 14, marginTop: 6 }}>MIT</div>
          </div>

          {/* Floating card — bottom left */}
          <div
            className="absolute bg-white"
            style={{
              bottom: "14%",
              left: "8%",
              border: "2px solid #111111",
              boxShadow: "4px 4px 0 #111111",
              padding: 16,
              minWidth: 160,
            }}
          >
            <div className="font-display text-ink" style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>$18k</div>
            <div className="font-body text-ink-muted" style={{ fontSize: 14, marginTop: 4 }}>scholarship fit</div>
          </div>
        </div>
      </div>
    </section>
  );
}
