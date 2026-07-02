"use client";

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  PenLine,
  FileText,
  Sparkles,
  ArrowRight,
  Upload,
  ClipboardCheck,
  MessageSquare,
  Rocket,
} from "lucide-react";
import type { ComponentType } from "react";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  useGuidedSteps,
  describeGuidedStep,
  type GuidedStep,
} from "@/lib/apply/guidedSteps";
import type { BackendTarget } from "@/lib/apply/intake";

type Action = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta: string;
  to?: string;
  onClick?: () => void;
};

function stepIcon(kind: GuidedStep["kind"]): ComponentType<{ className?: string }> {
  switch (kind) {
    case "document":
      return Upload;
    case "essay":
      return PenLine;
    case "eligibility":
      return ClipboardCheck;
    case "field":
    default:
      return MessageSquare;
  }
}

function scrollToPrep() {
  // No-op placeholder retained for backwards compatibility; unused.
}
void scrollToPrep;

export function NextProductiveAction() {
  const { saved } = useSavedUniversities();
  const targets: BackendTarget[] = useMemo(
    () =>
      (saved ?? []).map((s) => ({
        system: s.source,
        externalId: s.externalId,
        name: s.name,
      })),
    [saved],
  );
  const guided = useGuidedSteps(targets);

  const action: Action = (() => {
    if (targets.length === 0) {
      return {
        icon: Sparkles,
        title: "Pick your first universities",
        body: "Save schools you're interested in — we'll research each one and generate your exact prep list.",
        cta: "Browse universities",
        to: "/universities",
      };
    }
    if (guided.loading) {
      return {
        icon: FileText,
        title: "Preparing your requirements…",
        body: "We're pulling the exact questions each university asks. Hang tight.",
        cta: "Open guided prep",
        onClick: scrollToPrep,
      };
    }
    if (guided.next) {
      const s = guided.next;
      return {
        icon: stepIcon(s.kind),
        title: describeGuidedStep(s),
        body:
          s.kind === "document"
            ? "One upload — reused across every portal you apply to."
            : s.kind === "essay"
              ? "Draft it once in the Essay Assistant; we'll reuse it where it fits."
              : s.kind === "eligibility"
                ? "Quick answer to confirm you match this school's requirements."
                : "One quick answer — saved everywhere it's asked.",
        cta: s.kind === "essay" ? "Draft in Essay Assistant" : "Open guided prep",
        to: s.kind === "essay" ? "/essay" : undefined,
        onClick: s.kind === "essay" ? undefined : scrollToPrep,
      };
    }
    if (guided.total > 0) {
      return {
        icon: Rocket,
        title: "Everything's ready — launch auto-apply",
        body: `${guided.doneCount} of ${guided.total} required items complete.`,
        cta: "Launch auto-apply",
        onClick: scrollToPrep,
      };
    }
    return {
      icon: PenLine,
      title: "Draft your personal statement",
      body: "Use the essay assistant while research finishes in the background.",
      cta: "Open essay assistant",
      to: "/essay",
    };
  })();

  const Icon = action.icon;
  const progressCopy =
    targets.length > 0 && !guided.loading && guided.total > 0
      ? `${guided.doneCount} of ${guided.total} done`
      : null;

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-on-surface bg-gradient-to-br from-primary-fixed via-surface to-tertiary-fixed p-5 qc-hard-shadow sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface bg-surface text-primary qc-hard-shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Do this next
          </p>
          <h3 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
            {action.title}
          </h3>
          <p className="mt-1 text-body-md text-on-surface-variant">{action.body}</p>
          {progressCopy && (
            <p className="mt-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface/60">
              {progressCopy}
            </p>
          )}
        </div>
        {action.onClick ? (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            {action.cta} <ArrowRight className="h-4 w-4" />
          </button>
        ) : action.to ? (
          <Link
            to={action.to}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            {action.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
