"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useGuidedSteps, type GuidedStep, type GuidedStepKind } from "@/lib/apply/guidedSteps";
import type {
  BackendTarget,
  EligibilityResult,
  EligQuestion,
  IntakePlan,
} from "@/lib/apply/intake";
import { useRescanRequirements } from "@/lib/apply/intake";
import { useApplicationDocuments, type DocType } from "@/lib/applyQueue/client";
import { useGuides } from "@/lib/apply/guidance";
import { GuideBlock } from "@/components/apply/GuideBlock";
import { RequirementsZone } from "./RequirementsZone";
import { IntakeItemField } from "./RequirementField";

type Props = {
  targets: BackendTarget[];
  plan: IntakePlan | undefined;
  eligibility: EligibilityResult | undefined;
  onSetAnswer: (conceptKey: string, value: string) => void;
  onAnswerEligibility: (askKey: string, value: string) => void;
};

const KIND_META: Record<
  GuidedStepKind,
  { label: string; Icon: typeof ShieldCheck; tone: string; ring: string; chip: string }
> = {
  eligibility: {
    label: "Eligibility",
    Icon: ShieldCheck,
    tone: "bg-secondary text-on-surface",
    ring: "border-secondary/60",
    chip: "bg-secondary/25 text-on-surface",
  },
  document: {
    label: "Document",
    Icon: FileText,
    tone: "bg-primary text-white",
    ring: "border-primary/50",
    chip: "bg-primary/15 text-primary",
  },
  field: {
    label: "Question",
    Icon: HelpCircle,
    tone: "bg-tertiary text-on-surface",
    ring: "border-tertiary/60",
    chip: "bg-tertiary/25 text-on-surface",
  },
  essay: {
    label: "Essay",
    Icon: PenLine,
    tone: "bg-on-surface text-white",
    ring: "border-on-surface/50",
    chip: "bg-on-surface/10 text-on-surface",
  },
};

export function GuidedPrep({
  targets,
  plan,
  onSetAnswer,
  onAnswerEligibility,
}: Props) {
  const guided = useGuidedSteps(targets);
  const [showAll, setShowAll] = useState(false);
  const [cursor, setCursor] = useState(0);

  const remainingLen = guided.remaining.length;
  useEffect(() => {
    if (cursor > 0 && cursor >= remainingLen) {
      setCursor(Math.max(0, remainingLen - 1));
    }
  }, [remainingLen, cursor]);

  const step = guided.remaining[cursor] ?? guided.remaining[0] ?? null;
  const total = guided.total;
  const done = guided.doneCount;
  const percent = total > 0 ? Math.round((done / total) * 100) : 100;

  if (guided.loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-on-surface/10" />
        <div className="h-48 animate-pulse rounded-2xl border-2 border-on-surface/15 bg-surface/60" />
      </div>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border-2 border-on-surface bg-surface qc-hard-shadow-sm"
      id="guided-prep"
    >
      {/* Header band */}
      <header className="relative bg-gradient-to-br from-primary/10 via-secondary/10 to-tertiary/10 p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              Guided prep
            </p>
            <h3 className="mt-1 font-display text-headline-md font-bold text-on-surface sm:text-headline-lg">
              {total === 0
                ? "Nothing to do — universities still researching."
                : step
                  ? "One step at a time. We'll walk you through it."
                  : "You're ready to apply."}
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {total === 0
                ? "Your steps will appear here the moment requirements land."
                : step
                  ? `Step ${Math.min(done + 1, total)} of ${total} · ${percent}% complete`
                  : "All required items are done — launch when ready."}
            </p>
          </div>
          {total > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {showAll ? "Step-by-step" : "See all"}
            </button>
          )}
        </div>

        {total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                {done} <span className="font-normal text-on-surface-variant">of {total} done</span>
              </span>
              <span className="font-[var(--font-label)] font-bold tabular-nums text-on-surface">
                {percent}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border-2 border-on-surface bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Step dots */}
            {!showAll && guided.steps.length > 1 && guided.steps.length <= 24 && (
              <StepDots
                steps={guided.steps}
                remaining={guided.remaining}
                currentId={step?.id}
                onJump={(idx) => setCursor(idx)}
              />
            )}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="border-t-2 border-on-surface/15 bg-surface p-5 sm:p-6">
        {showAll ? (
          <AllRequirements plan={plan} onChange={onSetAnswer} />
        ) : step ? (
          <StepCard
            key={step.id}
            step={step}
            onAnswerEligibility={onAnswerEligibility}
            onSetAnswer={onSetAnswer}
            onBack={() => setCursor((c) => Math.max(0, c - 1))}
            onSkip={() =>
              setCursor((c) => Math.min(Math.max(0, remainingLen - 1), c + 1))
            }
            onNext={() =>
              setCursor((c) => Math.min(Math.max(0, remainingLen - 1), c + 1))
            }
            hasBack={cursor > 0}
            hasNext={cursor < remainingLen - 1}
            position={done + 1}
            total={total}
          />
        ) : total > 0 ? (
          <ReadyState />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function StepDots({
  steps,
  remaining,
  currentId,
  onJump,
}: {
  steps: GuidedStep[];
  remaining: GuidedStep[];
  currentId?: string;
  onJump: (remainingIndex: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {steps.map((s) => {
        const isDone = s.satisfied;
        const isCurrent = s.id === currentId;
        const remIdx = remaining.findIndex((r) => r.id === s.id);
        const cls = isCurrent
          ? "bg-primary border-on-surface w-6"
          : isDone
            ? "bg-tertiary border-on-surface/60"
            : "bg-surface border-on-surface/30 hover:border-on-surface";
        return (
          <button
            key={s.id}
            type="button"
            disabled={isDone || remIdx < 0}
            onClick={() => remIdx >= 0 && onJump(remIdx)}
            aria-label={s.label}
            className={`h-2.5 w-2.5 rounded-full border-2 transition-all ${cls}`}
          />
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-4">
      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-on-surface-variant" />
      <p className="text-body-sm text-on-surface-variant">
        Requirements will populate as each university finishes researching. Nothing you need to do right now.
      </p>
    </div>
  );
}

function ReadyState() {
  return (
    <div className="rounded-xl border-2 border-tertiary bg-tertiary/15 p-5 qc-hard-shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-tertiary text-on-surface">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h4 className="font-display text-headline-sm font-bold text-on-surface">
            You're ready to apply
          </h4>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            All required items are complete. Use the Apply bar below to launch your applications.
          </p>
        </div>
      </div>
    </div>
  );
}

function AllRequirements({
  plan,
  onChange,
}: {
  plan: IntakePlan | undefined;
  onChange: (conceptKey: string, value: string) => void;
}) {
  const { rescan, isRescanning } = useRescanRequirements();
  if (!plan) return null;
  const coverageByKey = new Map(
    (plan.targets ?? []).map((t) => [`${t.system}::${t.externalId}`, t.coverage]),
  );
  return (
    <div className="space-y-3">
      <RequirementsZone
        title="Shared essentials"
        subtitle="Used across every application on your list."
        items={plan.shared ?? []}
        onChange={(item, value) => {
          if (item.conceptKey) onChange(item.conceptKey, value);
        }}
        defaultOpen
      />
      {(plan.specific ?? []).map((s) => {
        const key = `${s.system}::${s.externalId}`;
        return (
          <RequirementsZone
            key={key}
            title={s.name}
            items={s.items ?? []}
            coverage={coverageByKey.get(key)}
            onChange={(item, value) => {
              if (item.conceptKey) onChange(item.conceptKey, value);
            }}
            onRescan={() => void rescan(s.system, s.externalId)}
            rescanning={isRescanning(s.system, s.externalId)}
          />
        );
      })}
    </div>
  );
}

function StepCard({
  step,
  onSetAnswer,
  onAnswerEligibility,
  onBack,
  onSkip,
  onNext,
  hasBack,
  hasNext,
  position,
  total,
}: {
  step: GuidedStep;
  onSetAnswer: (conceptKey: string, value: string) => void;
  onAnswerEligibility: (askKey: string, value: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  hasBack: boolean;
  hasNext: boolean;
  position: number;
  total: number;
}) {
  const meta = KIND_META[step.kind];
  const Icon = meta.Icon;
  return (
    <article className="space-y-5">
      {/* Step head */}
      <div className="flex items-start gap-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-on-surface qc-hard-shadow-sm ${meta.tone}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border-2 border-on-surface/15 px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide ${meta.chip}`}
            >
              {meta.label}
            </span>
            {step.targetName && (
              <span className="inline-flex max-w-[16rem] items-center truncate rounded-full border-2 border-on-surface/15 bg-surface-container-lowest px-2 py-0.5 text-label-sm text-on-surface-variant">
                {step.targetName}
              </span>
            )}
            <span className="ml-auto font-[var(--font-label)] text-label-sm font-semibold tabular-nums text-on-surface-variant">
              {position} / {total}
            </span>
          </div>
          <h4 className="mt-1.5 font-display text-headline-sm font-bold leading-tight text-on-surface sm:text-headline-md">
            {step.label}
          </h4>
          {step.prompt && (
            <p className="mt-3 rounded-lg border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-body-sm italic text-on-surface-variant">
              "{step.prompt}"
              {step.wordLimit ? (
                <span className="not-italic"> · {step.wordLimit} words</span>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {/* Input */}
      <div className={`rounded-xl border-2 ${meta.ring} bg-surface-container-lowest p-4`}>
        {step.kind === "eligibility" && step.question ? (
          <EligibilityInput
            q={step.question}
            onChange={(v) => step.askKey && onAnswerEligibility(step.askKey, v)}
          />
        ) : step.kind === "document" ? (
          <DocumentStep
            docType={(step.docType ?? "other") as DocType}
            label={step.label}
          />
        ) : step.kind === "essay" ? (
          <EssayStep />
        ) : step.item ? (
          <IntakeItemField
            item={step.item}
            onChange={(v) => step.conceptKey && onSetAnswer(step.conceptKey, v)}
          />
        ) : null}
      </div>

      <StepGuidance step={step} />


      {/* Nav */}
      <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-on-surface/15 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={!hasBack}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-3 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:border-on-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          {hasNext && (
            <button
              type="button"
              onClick={onSkip}
              className="font-[var(--font-label)] text-label-md text-on-surface-variant underline underline-offset-4 hover:text-on-surface"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            {hasNext ? "Next" : "Finish"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EligibilityInput({
  q,
  onChange,
}: {
  q: EligQuestion;
  onChange: (v: string) => void;
}) {
  const [value, setValue] = useState("");
  const update = (v: string) => {
    setValue(v);
    onChange(v);
  };
  if (q.kind === "select") {
    return (
      <div className="flex flex-wrap gap-2">
        {(q.options ?? []).map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => update(o)}
              className={`rounded-md border-2 px-3 py-2 font-[var(--font-label)] text-label-md capitalize transition-transform hover:-translate-y-0.5 ${
                on
                  ? "border-on-surface bg-primary text-white qc-hard-shadow-sm"
                  : "border-on-surface/25 bg-surface text-on-surface hover:border-on-surface"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }
  if (q.kind === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
        {[
          { v: "yes", label: "Yes" },
          { v: "no", label: "No" },
        ].map((opt) => {
          const on = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => update(opt.v)}
              className={`rounded-md border-2 px-3 py-2.5 font-[var(--font-label)] text-label-md font-semibold transition-transform hover:-translate-y-0.5 ${
                on
                  ? "border-on-surface bg-primary text-white qc-hard-shadow-sm"
                  : "border-on-surface/25 bg-surface text-on-surface hover:border-on-surface"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <input
      type={q.kind === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => update(e.target.value)}
      placeholder={q.kind === "number" ? "Enter a number" : "Type your answer"}
      className="w-full rounded-md border-2 border-on-surface/25 bg-surface px-3 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-on-surface focus:outline-none"
    />
  );
}

function DocumentStep({ docType, label }: { docType: DocType; label: string }) {
  const { docs, upload } = useApplicationDocuments();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = (docs ?? []).find(
    (d) => d.docType === docType && d.hasFile !== false,
  );

  async function pick(file: File | null | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await upload(file, docType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {existing ? (
        <div className="flex items-center gap-3 rounded-md border-2 border-tertiary bg-tertiary/15 px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-tertiary text-on-surface">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[var(--font-label)] text-label-md font-semibold text-on-surface">
              {existing.fileName}
            </p>
            <p className="text-label-sm text-on-surface-variant">Uploaded · counts for every school that needs this.</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-md border-2 border-on-surface/25 bg-surface px-2.5 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="group flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-on-surface/30 bg-surface px-3 py-6 text-center transition-colors hover:border-on-surface hover:bg-primary/5 disabled:opacity-60"
        >
          <span className="grid h-11 w-11 place-items-center rounded-md border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm transition-transform group-hover:-translate-y-0.5">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </span>
          <span className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
            {busy ? "Uploading…" : `Upload ${label.toLowerCase()}`}
          </span>
          <span className="text-label-sm text-on-surface-variant">
            PDF, DOC, or image · up to 20 MB
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-2 rounded-md border-2 border-error/30 bg-error/10 px-2.5 py-1.5 text-label-sm text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}

function EssayStep() {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-on-surface text-white">
          <PenLine className="h-5 w-5" />
        </span>
        <p className="text-body-sm text-on-surface">
          Draft this essay in the Essay Assistant — grounded in your story, first draft free.
        </p>
      </div>
      <Link
        to="/essay"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        <Sparkles className="h-4 w-4" /> Open Essay Assistant
      </Link>
    </div>
  );
}

function StepGuidance({ step }: { step: GuidedStep }) {
  const rows = useGuides([
    {
      kind: step.kind,
      docType: step.docType ?? null,
      conceptKey: step.conceptKey ?? null,
      label: step.label ?? null,
    },
  ]);
  const guide = rows?.[0]?.guide ?? null;
  return (
    <GuideBlock
      guide={guide}
      explainArgs={{
        kind: step.kind,
        docType: step.docType ?? null,
        conceptKey: step.conceptKey ?? null,
        label: step.label ?? null,
        prompt: step.prompt ?? null,
      }}
    />
  );
}
