"use client";

import { Link } from "@tanstack/react-router";
import { PenLine, FileText, Sparkles, ArrowRight } from "lucide-react";
import { useApplicantProfile } from "@/lib/apply/profile";
import { useApplicationDocuments } from "@/lib/applyQueue/client";

type Action = {
  icon: typeof PenLine;
  title: string;
  body: string;
  cta: string;
  to: string;
};

export function NextProductiveAction() {
  const { missingCount } = useApplicantProfile();
  const { docs } = useApplicationDocuments();
  const docsCount = docs?.length ?? 0;

  const action: Action = (() => {
    if (missingCount > 0) {
      return {
        icon: Sparkles,
        title: "While we research, finish your profile",
        body: `${missingCount} field${missingCount === 1 ? "" : "s"} left. Takes about a minute and unlocks every form.`,
        cta: "Continue profile",
        to: "/apply/prep",
      };
    }
    if (docsCount < 2) {
      return {
        icon: FileText,
        title: "Add your transcript & personal statement",
        body: "We reuse these across every portal you apply to.",
        cta: "Manage documents",
        to: "/apply",
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
        </div>
        <Link
          to={action.to}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          {action.cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
