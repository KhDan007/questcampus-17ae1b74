"use client";

import { useState } from "react";
import { ChevronDown, Check, ShieldCheck, AlertTriangle, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import type { IntakeItem, TargetCoverage } from "@/lib/apply/intake";
import { IntakeItemField } from "./RequirementField";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  title: string;
  subtitle?: string;
  items: IntakeItem[];
  onChange: (item: IntakeItem, value: string) => void;
  defaultOpen?: boolean;
  coverage?: TargetCoverage;
  onRescan?: () => void;
  rescanning?: boolean;
};

type CoverageMeta = {
  label: string;
  className: string;
  Icon: typeof ShieldCheck;
};

function coverageMeta(coverage: TargetCoverage | undefined): CoverageMeta {
  switch (coverage) {
    case "full":
      return {
        label: "Verified requirements",
        className: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        Icon: ShieldCheck,
      };
    case "partial":
      return {
        label: "Partial — may be incomplete",
        className: "bg-secondary-fixed text-on-secondary-fixed-variant",
        Icon: AlertTriangle,
      };
    case "error":
      return {
        label: "Not captured yet",
        className: "bg-surface-container text-on-surface-variant",
        Icon: HelpCircle,
      };
    default:
      return {
        label: "Gathering requirements…",
        className: "bg-surface-container text-on-surface-variant",
        Icon: Loader2,
      };
  }
}

export function RequirementsZone({
  title,
  subtitle,
  items,
  onChange,
  defaultOpen = false,
  coverage,
  onRescan,
  rescanning = false,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const [showAnswered, setShowAnswered] = useState(false);

  const showCoverage = coverage !== undefined || onRescan !== undefined;
  const meta = coverageMeta(coverage);
  const isFull = coverage === "full";
  const isError = coverage === "error" || (coverage !== "full" && coverage !== "partial" && items.length === 0 && coverage === "error");
  const isEmpty = items.length === 0;
  const isPartial = coverage === "partial";
  const isGathering = coverage === undefined && showCoverage;
  const hideProgress = !isFull && (isEmpty || coverage === "error");

  const answered = items.filter((i) => i.answered);
  const unanswered = items.filter((i) => !i.answered);
  const complete = items.length > 0 && unanswered.length === 0;
  const visible = showAnswered ? items : unanswered;

  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest qc-soft-shadow">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-headline-sm font-bold text-on-surface">{title}</h3>
            {showCoverage && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-label-sm ${meta.className}`}
              >
                <meta.Icon className={`h-3.5 w-3.5 ${isGathering ? "animate-spin" : ""}`} />
                {meta.label}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {hideProgress ? null : complete ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-tertiary-fixed px-2.5 py-0.5 text-label-sm text-on-tertiary-fixed-variant">
              <Check className="h-3.5 w-3.5" /> Done
            </span>
          ) : (
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
              {answered.length}/{items.length}
            </span>
          )}
          <ChevronDown
            className={`h-5 w-5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-on-surface/8 p-5 space-y-4">
          {(isPartial || coverage === "error" || (isGathering && isEmpty)) && (
            <div
              className={`flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between ${
                isPartial
                  ? "bg-secondary-fixed/40"
                  : "bg-surface-container"
              }`}
            >
              <div className="min-w-0">
                <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                  {coverage === "error"
                    ? "We haven't captured this university's requirements yet."
                    : isPartial
                      ? "We haven't fully captured this university's requirements yet."
                      : "Still gathering this university's requirements."}
                </p>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {coverage === "error"
                    ? "Don't treat this list as a complete application. Re-scan to try again."
                    : isPartial
                      ? "The list below may be incomplete — don't treat it as the full application."
                      : "This can take a minute for schools we haven't seen before."}
                </p>
              </div>
              {onRescan && (
                <button
                  type="button"
                  onClick={onRescan}
                  disabled={rescanning}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rescanning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {rescanning ? "Re-scanning…" : "Re-scan requirements"}
                </button>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              {coverage === "error"
                ? "No requirements captured for this university yet."
                : isGathering
                  ? "We'll list questions here as soon as the crawl finishes."
                  : "Nothing to answer here."}
            </p>
          ) : (
            <>
              {visible.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">
                  All set. Answered items are hidden —{" "}
                  <button
                    className="underline underline-offset-2"
                    type="button"
                    onClick={() => setShowAnswered(true)}
                  >
                    show them
                  </button>
                  .
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {visible.map((it) => (
                  <IntakeItemField key={it.key} item={it} onChange={(v) => onChange(it, v)} />
                ))}
              </div>
              {answered.length > 0 && unanswered.length > 0 && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowAnswered((s) => !s)}
                    className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
                  >
                    {showAnswered ? "Hide answered" : t("audit.requirements.showAnswered", { count: answered.length })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
