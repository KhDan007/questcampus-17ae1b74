"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { WhyReasons } from "@/components/common/WhyReasons";
import { askAssistant } from "@/lib/assistant";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAutoTranslate } from "@/lib/i18n/useAutoTranslate";
import { EnrichmentDetails } from "./EnrichmentDetails";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { useSavedUniversities } from "@/lib/universities/savedClient";

// Shape returned by convex rag/recommend:recommend (per card).
export type RecCard = {
  _id?: string;
  id?: string;            // preferred handle for enrichOnOpen({ id })
  source?: string;        // "scorecard" | "directory"
  externalId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  region?: string;
  website?: string;
  acceptanceRate?: number;
  satAvg?: number;
  actMidpoint?: number;
  costAttendance?: number;
  tuitionOutState?: number;
  pellRate?: number;
  sizeBucket?: string;
  fields?: string[];
  globalRank?: number;
  languageOfInstruction?: string[];
  intlTuition?: number;
  intlTuitionCurrency?: string;
  ieltsOverall?: number;
  toeflIbt?: number;
  bucket: "safety" | "target" | "reach";
  score: number; // internal ranking composite (not shown to the student)
  matchPercent?: number; // calibrated, student-facing 0..100 match score
  why: string;
};

const BUCKET_CHIP: Record<RecCard["bucket"], string> = {
  safety: "bg-tertiary-container/15 text-tertiary",
  target: "bg-primary-fixed text-primary",
  reach: "bg-secondary-container/20 text-secondary",
};

function pct(n?: number): string | null {
  return n == null ? null : `${Math.round(n * 100)}%`;
}
function money(n?: number): string | null {
  return n == null ? null : `$${Math.round(n).toLocaleString()}`;
}

// One stat cell. Renders nothing when value missing (omit, no N/A).
function Stat({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className="text-body-lg font-semibold text-on-surface">{value}</dd>
    </div>
  );
}

export function UniversityCard({
  card,
  index,
  locked = false,
  reduce = false,
  onDismiss,
}: {
  card: RecCard;
  index: number;
  locked?: boolean;
  reduce?: boolean;
  onDismiss?: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = [card.city, card.state, card.country].filter(Boolean).join(", ");
  const translatedWhy = useAutoTranslate(card.why || null);

  const aidKey =
    card.pellRate != null
      ? card.pellRate > 0.4
        ? "card.aid.strong"
        : card.pellRate > 0.2
          ? "card.aid.moderate"
          : "card.aid.limited"
      : null;
  const aid = aidKey ? t(aidKey) : null;

  const sizeKey =
    card.sizeBucket && ["small", "medium", "large"].includes(card.sizeBucket)
      ? `card.size.${card.sizeBucket}`
      : null;
  const sizeLabel = sizeKey ? t(sizeKey) : null;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.06 }}
      className={`group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 transition-shadow sm:p-6 ${
        locked ? "select-none" : "hover:shadow-[0_8px_28px_-10px_rgba(53,37,205,0.18)]"
      }`}
    >
      {/* Header: name + bucket chip — name is a proper noun, kept untranslated */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-headline-sm text-on-background">
            {card.name}
          </h3>
          {location && (
            <p className="mt-1 text-body-md text-on-surface-variant">
              📍 {location}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-label-sm font-semibold uppercase tracking-wide ${BUCKET_CHIP[card.bucket]}`}
        >
          {t(`card.bucket.${card.bucket}`)}
        </span>
      </div>

      {/* Why this matches (auto-translated AI copy) — concise reasons as bullets */}
      {card.why && (
        <div className="mt-4 rounded-lg bg-primary-fixed/40 p-3.5 text-body-md leading-relaxed text-on-surface">
          <WhyReasons why={translatedWhy ?? card.why} />
        </div>
      )}

      {/* Requirements / stats grid */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:mt-5 sm:grid-cols-3 sm:gap-y-4">
        <Stat label={t("card.stat.acceptance")} value={pct(card.acceptanceRate)} />
        <Stat label={t("card.stat.sat")} value={card.satAvg ? String(card.satAvg) : null} />
        <Stat
          label={t("card.stat.act")}
          value={card.actMidpoint ? String(card.actMidpoint) : null}
        />
        <Stat label={t("card.stat.cost")} value={money(card.costAttendance)} />
        <Stat label={t("card.stat.tuition")} value={money(card.tuitionOutState)} />
        <Stat label={t("card.stat.size")} value={sizeLabel} />
        <Stat label={t("card.stat.aid")} value={aid} />
      </dl>

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
          {card.website && (
            <a
              href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary-container px-5 text-label-md font-medium text-on-primary transition-transform hover:scale-[1.02]"
            >
              {t("card.visit")}
              <span aria-hidden>→</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-outline-variant/60 px-5 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            {open ? t("enrich.hide") : t("enrich.show")}
            <span aria-hidden>{open ? "▲" : "▼"}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              askAssistant(`Is ${card.name} a good fit for me? Give me the key pros and cons for my profile.`)
            }
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-outline-variant/60 px-5 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            <Sparkles className="h-4 w-4" /> Ask AI
          </button>
          <RecommendationSaveToggle source={card.source ?? "scorecard"} externalId={card.externalId} />
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Remove from matches"
              className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-outline-variant/60 px-4 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {open && !locked && (
        <EnrichmentDetails
          schoolId={card.id ?? card._id}
          externalId={card.externalId}
          website={card.website}
        />
      )}
    </motion.article>
  );
}

function RecommendationSaveToggle({ source, externalId }: { source: string; externalId: string }) {
  const { isSaved, isAuthenticated, requireAuth, addFromRecommendation, removeByUniversity } =
    useSavedUniversities();
  const saved = isSaved(source, externalId);
  return (
    <SaveToggle
      saved={saved}
      onAdd={async () => {
        if (!isAuthenticated) {
          requireAuth();
          return;
        }
        await addFromRecommendation(source, externalId);
      }}
      onRemove={async () => {
        if (!isAuthenticated) return;
        await removeByUniversity(source, externalId);
      }}
    />
  );
}
