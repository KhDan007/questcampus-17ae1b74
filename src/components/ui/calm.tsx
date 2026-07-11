"use client";

// Calm design-system primitives — the shared vocabulary for the authenticated
// workspace. Every app page composes these so the whole platform reads as one
// system: white cards on a warm-gray canvas, a single soft elevation, soft
// pastel icon tiles keyed to status, and one coral action per view.
//
// Rules (see the dashboard redesign):
// - Card surface = surface-container-lowest (white) + hairline border + soft shadow.
// - Reserve the coral fill + hard shadow for ONE primary action per view.
// - Color = status, never decoration. Icon tiles use the *-fixed tokens.

import { Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

export type Tone = "coral" | "green" | "amber" | "muted" | "neutral";

// Soft pastel icon-tile backgrounds. coral = action, green = ready/positive,
// amber = value/scholarship/score, muted = passive, neutral = default surface.
export const TILE: Record<Tone, string> = {
  coral: "bg-primary-fixed text-on-primary-fixed-variant",
  green: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  amber: "bg-secondary-fixed text-on-secondary-fixed-variant",
  muted: "bg-surface-container text-on-surface-variant",
  neutral: "bg-surface-container-high text-on-surface",
};

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The one calm surface primitive. Passive by default; pass `as="button"`/href via children. */
export function Card({
  className,
  children,
  interactive,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-on-surface/8 bg-surface-container-lowest qc-soft-shadow",
        interactive && "qc-soft-shadow-hover",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Plain page header — greeting/title + optional subtitle and trailing actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-headline-lg font-bold text-on-surface text-balance">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** In-card section heading with optional subtitle and a trailing slot. */
export function SectionHeading({
  title,
  subtitle,
  aside,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-headline-sm font-bold text-on-surface">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Soft pastel icon tile. */
export function IconTile({
  icon: Icon,
  tone = "coral",
  size = "md",
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "h-9 w-9 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-xl" : "h-10 w-10 rounded-xl";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <span className={cx("grid shrink-0 place-items-center", box, TILE[tone], className)}>
      <Icon className={ic} />
    </span>
  );
}

/** The single coral primary button. Use once per view. */
export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Quiet secondary button — hairline, no coral, no hard shadow. */
export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Semantic chip. */
export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold",
        TILE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small stat tile for snapshot/summary rails. */
export function StatTile({
  label,
  value,
  tone = "neutral",
  to,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  to?: string;
}) {
  const valueColor =
    tone === "green"
      ? "text-tertiary"
      : tone === "amber"
        ? "text-secondary"
        : tone === "coral"
          ? "text-primary"
          : "text-on-surface";
  const inner = (
    <div className="flex h-full flex-col rounded-xl bg-surface-container/70 px-3 py-2.5">
      <span className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant/80">
        {label}
      </span>
      <span className={cx("mt-0.5 font-display text-headline-sm font-bold tabular-nums", valueColor)}>
        {value}
      </span>
    </div>
  );
  return to ? (
    <Link to={to as never} className="qc-soft-shadow-hover rounded-xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Peerlist-style underline tab bar. Controlled. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ key: T; label: string; count?: number }>;
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-1 overflow-x-auto border-b border-on-surface/10", className)} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.key)}
            className={cx(
              "relative shrink-0 px-3 pb-2.5 pt-1 font-[var(--font-label)] text-label-md font-semibold transition-colors",
              active ? "text-primary" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={cx(
                    "rounded-full px-1.5 text-label-sm tabular-nums",
                    active ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-on-surface/8 text-on-surface-variant",
                  )}
                >
                  {t.count}
                </span>
              )}
            </span>
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

/** Dashed calm empty state. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-on-surface/20 bg-surface-container-lowest px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && <IconTile icon={Icon} tone="muted" size="lg" />}
      <div>
        <p className="font-display text-headline-sm font-bold text-on-surface">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-md text-body-sm text-on-surface-variant">{body}</p>}
      </div>
      {action}
    </div>
  );
}
