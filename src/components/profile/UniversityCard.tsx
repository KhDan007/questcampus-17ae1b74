"use client";

import { motion } from "framer-motion";

// Shape returned by convex rag/recommend:recommend (per card).
export type RecCard = {
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

const BUCKET_STYLE: Record<
  RecCard["bucket"],
  { label: string; chip: string; dot: string }
> = {
  safety: {
    label: "Safety",
    chip: "bg-tertiary-container/15 text-tertiary",
    dot: "bg-tertiary-container",
  },
  target: {
    label: "Target",
    chip: "bg-primary-fixed text-primary",
    dot: "bg-primary-container",
  },
  reach: {
    label: "Reach",
    chip: "bg-secondary-container/20 text-secondary",
    dot: "bg-secondary-container",
  },
};

const SIZE_LABEL: Record<string, string> = {
  small: "Small (<5k)",
  medium: "Medium (5k–20k)",
  large: "Large (20k+)",
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
}: {
  card: RecCard;
  index: number;
  locked?: boolean;
  reduce?: boolean;
}) {
  const b = BUCKET_STYLE[card.bucket];
  const location = [card.city, card.state].filter(Boolean).join(", ");

  const aid =
    card.pellRate != null
      ? card.pellRate > 0.4
        ? "Strong"
        : card.pellRate > 0.2
          ? "Moderate"
          : "Limited"
      : null;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.06 }}
      className={`group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 transition-shadow sm:p-6 ${
        locked ? "select-none" : "hover:shadow-[0_8px_28px_-10px_rgba(53,37,205,0.18)]"
      }`}
    >
      {/* Header: name + bucket chip */}
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
          className={`shrink-0 rounded-full px-3 py-1 text-label-sm font-semibold uppercase tracking-wide ${b.chip}`}
        >
          {b.label}
        </span>
      </div>

      {/* Why this matches */}
      {card.why && (
        <p className="mt-4 rounded-lg bg-primary-fixed/40 p-3.5 text-body-md leading-relaxed text-on-surface">
          <span className="mr-1.5">✨</span>
          {card.why}
        </p>
      )}

      {/* Requirements / stats grid */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <Stat label="Acceptance rate" value={pct(card.acceptanceRate)} />
        <Stat label="Avg SAT" value={card.satAvg ? String(card.satAvg) : null} />
        <Stat
          label="Mid ACT"
          value={card.actMidpoint ? String(card.actMidpoint) : null}
        />
        <Stat label="Annual cost" value={money(card.costAttendance)} />
        <Stat label="Out-of-state tuition" value={money(card.tuitionOutState)} />
        <Stat
          label="Size"
          value={card.sizeBucket ? SIZE_LABEL[card.sizeBucket] ?? null : null}
        />
        <Stat label="Financial aid" value={aid} />
      </dl>

      {/* Apply link */}
      {card.website && !locked && (
        <a
          href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary-container px-5 text-label-md font-medium text-on-primary transition-transform hover:scale-[1.02]"
        >
          Visit & apply
          <span aria-hidden>→</span>
        </a>
      )}
    </motion.article>
  );
}
