"use client";

import { Link } from "@tanstack/react-router";
import { WAITLIST_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function WaitlistTab() {
  const { t } = useI18n();
  // Translation key, with a hard fallback so the tab is never empty.
  const label = t("waitlistTab.label") || "JOIN WAITLIST";

  return (
    <Link
      to={WAITLIST_PATH}
      aria-label={label}
      className="
        fixed right-0 top-1/2 z-[9999] -translate-y-1/2
        items-center justify-center
        bg-bc-yellow text-ink
        hidden md:flex
        cursor-pointer select-none
      "
      style={{
        width: 40,
        height: 160,
        borderTop: "2px solid #111111",
        borderBottom: "2px solid #111111",
        borderLeft: "2px solid #111111",
        boxShadow: "-4px 0 0 #111111",
      }}
    >
      <span
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.12em",
          color: "#111111",
          transform: "rotate(90deg)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export function WaitlistTabMobile() {
  const { t } = useI18n();
  const label = t("waitlistTab.label") || "JOIN WAITLIST";
  return (
    <Link
      to={WAITLIST_PATH}
      aria-label={label}
      className="
        fixed right-0 top-1/2 z-[9999] -translate-y-1/2
        flex md:hidden items-center justify-center
        bg-bc-yellow text-ink
      "
      style={{
        width: 40,
        height: 40,
        borderTop: "2px solid #111111",
        borderBottom: "2px solid #111111",
        borderLeft: "2px solid #111111",
        boxShadow: "-4px 0 0 #111111",
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>↗</span>
    </Link>
  );
}
