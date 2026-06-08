"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAutoTranslate } from "@/lib/i18n/useAutoTranslate";
import { EnrichmentDetails } from "./EnrichmentDetails";

export type RecCard = {
  _id?: string;
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  website?: string;
  acceptanceRate?: number;
  satAvg?: number;
  actMidpoint?: number;
  costAttendance?: number;
  tuitionOutState?: number;
  pellRate?: number;
  sizeBucket?: string;
  bucket: "safety" | "target" | "reach";
  score: number;
  why: string;
};

const BUCKET_STYLE: Record<RecCard["bucket"], { bg: string; fg: string }> = {
  safety: { bg: "#16A34A", fg: "#111111" },
  target: { bg: "#1B4FD8", fg: "#FFFFFF" },
  reach: { bg: "#E63022", fg: "#FFFFFF" },
};

function pct(n?: number) { return n == null ? null : `${Math.round(n * 100)}%`; }
function money(n?: number) { return n == null ? null : `$${Math.round(n).toLocaleString()}`; }

function DataPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-body text-ink"
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        padding: "0 10px",
        background: "#FFF8F0",
        border: "2px solid #111111",
        borderRadius: 9999,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function UniversityCard({
  card,
  index: _index,
  locked = false,
}: {
  card: RecCard;
  index: number;
  locked?: boolean;
  reduce?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const location = [card.city, card.state].filter(Boolean).join(", ");
  const translatedWhy = useAutoTranslate(card.why || null);
  const bucket = BUCKET_STYLE[card.bucket];

  const aidKey =
    card.pellRate != null
      ? card.pellRate > 0.4 ? "card.aid.strong"
        : card.pellRate > 0.2 ? "card.aid.moderate"
        : "card.aid.limited"
      : null;
  const aid = aidKey ? t(aidKey) : null;

  const pills: string[] = [];
  if (card.acceptanceRate != null) pills.push(`${pct(card.acceptanceRate)} ACCEPT`);
  if (card.satAvg) pills.push(`SAT ${card.satAvg}`);
  if (card.costAttendance) pills.push(`${money(card.costAttendance)}/YR`);
  if (aid) pills.push(aid.toUpperCase());

  return (
    <article
      className="relative bg-white p-6 bc-shadow-hover"
      style={{
        border: "2px solid #111111",
        boxShadow: "4px 4px 0 #111111",
        filter: locked ? "blur(6px)" : "none",
        pointerEvents: locked ? "none" : "auto",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Match score chip */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "#FFCF00",
            border: "2px solid #111111",
            borderRadius: 9999,
            padding: "4px 12px",
          }}
        >
          <span className="font-display text-ink" style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
            {Math.round(card.score * 100)}
          </span>
          <span className="font-body text-ink" style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.08em" }}>MATCH</span>
        </div>

        <span
          className="font-body"
          style={{
            background: bucket.bg,
            color: bucket.fg,
            border: "2px solid #111111",
            borderRadius: 9999,
            padding: "4px 12px",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {t(`card.bucket.${card.bucket}`)}
        </span>
      </div>

      <h3 className="mt-5 font-display text-ink" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>
        {card.name}
      </h3>
      {location && (
        <p className="mt-1 font-body text-ink-muted" style={{ fontSize: 14 }}>
          <span aria-hidden>📍 </span>{location}
        </p>
      )}

      {pills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {pills.map((p) => <DataPill key={p}>{p}</DataPill>)}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {card.why && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="font-body text-ink underline-offset-4 hover:underline"
            style={{ fontWeight: 500, fontSize: 14 }}
          >
            {open ? t("enrich.hide") : `${t("card.visit") || "Why this fits you"} →`}
          </button>
        )}
        {!locked && !showEnrich && (
          <button
            type="button"
            onClick={() => setShowEnrich(true)}
            className="bc-btn"
            style={{ height: 40, fontSize: 13 }}
          >
            {t("enrich.show")}
          </button>
        )}
      </div>

      {open && card.why && (
        <div className="mt-4" style={{ borderLeft: "4px solid #1B4FD8", paddingLeft: 16 }}>
          <p className="font-body text-ink-muted" style={{ fontSize: 16, lineHeight: 1.5 }}>
            {translatedWhy ?? card.why}
          </p>
        </div>
      )}

      {!locked && showEnrich && (
        <EnrichmentDetails schoolId={card._id} externalId={card.externalId} website={card.website} />
      )}

      {card.website && (
        <a
          href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block bc-btn"
          style={{ height: 44, fontSize: 14 }}
        >
          {t("card.visit")} →
        </a>
      )}
    </article>
  );
}
