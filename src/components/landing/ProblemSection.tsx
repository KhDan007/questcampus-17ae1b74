"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

const PAINS = [
  { titleKey: "problem.p1.title", bodyKey: "problem.p1.body" },
  { titleKey: "problem.p2.title", bodyKey: "problem.p2.body" },
  { titleKey: "problem.p3.title", bodyKey: "problem.p3.body" },
];

export function ProblemSection() {
  const { t } = useI18n();
  return (
    <section className="relative px-6 sm:px-12" style={{ background: "#1B4FD8", paddingTop: 96, paddingBottom: 120 }}>
      <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[200px_1fr]">
        <div className="relative">
          <div
            className="font-display"
            style={{ fontWeight: 800, fontSize: 120, lineHeight: 1, color: "rgba(255,255,255,0.15)" }}
            aria-hidden
          >
            3
          </div>
        </div>

        <div>
          {PAINS.map((p, i) => (
            <div
              key={p.titleKey}
              className="py-5"
              style={{ borderBottom: i < PAINS.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none" }}
            >
              <h3 className="font-display text-white" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>
                {t(p.titleKey)}
              </h3>
              <p className="mt-2 font-body" style={{ fontSize: 16, color: "rgba(255,255,255,0.75)" }}>
                {t(p.bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Overlap card */}
      <div className="relative mx-auto max-w-[480px]" style={{ marginBottom: -60, marginTop: 48 }}>
        <div className="bc-card">
          <p className="font-display text-ink" style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.15 }}>
            “{t("problem.quote")}”
          </p>
        </div>
      </div>
    </section>
  );
}
