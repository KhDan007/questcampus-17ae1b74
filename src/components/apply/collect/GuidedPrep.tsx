"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Loader2,
  PenLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { useGuidedSteps, type GuidedStep } from "@/lib/apply/guidedSteps";
import type {
  BackendTarget,
  EligibilityResult,
  EligQuestion,
  IntakePlan,
} from "@/lib/apply/intake";
import { useApplicationDocuments, type DocType } from "@/lib/applyQueue/client";
import { RequirementsZone } from "./RequirementsZone";
import { IntakeItemField } from "./RequirementField";

type Props = {
  targets: BackendTarget[];
  plan: IntakePlan | undefined;
  eligibility: EligibilityResult | undefined;
  onSetAnswer: (conceptKey: string, value: string) => void;
  onAnswerEligibility: (askKey: string, value: string) => void;
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
      <div className="h-40 animate-pulse rounded-2xl border-2 border-on-surface/15 bg-surface/60" />
    );
  }

  return (
    <div className="space-y-4" id="guided-prep">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm font-bold text-on-surface">
            Guided prep
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            {total === 0
              ? "Nothing required yet — universities still researching."
              : step
                ? `Step ${done + 1} of ${total} · ${percent}% done`
                : "All required items done. Ready to apply."}
          </p>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-2.5 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {showAll ? "Step-by-step" : "Show all requirements"}
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {showAll ? (
        <AllRequirements plan={plan} onChange={onSetAnswer} />
      ) : step ? (
        <StepCard
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
        />
      ) : total > 0 ? (
        <div className="rounded-2xl border-2 border-tertiary/40 bg-tertiary/10 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-on-surface bg-tertiary text-on-surface">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="font-display text-headline-sm font-bold text-on-surface">
                You're ready to apply
              </h4>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                All required items are complete. Use the Apply bar below to launch.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/70 p-5 text-body-sm text-on-surface-variant">
          Requirements will populate as each university finishes researching.
        </div>
      )}
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
  if (!plan) return null;
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
      {(plan.specific ?? []).map((s) => (
        <RequirementsZone
          key={`${s.system}::${s.externalId}`}
          title={s.name}
          items={s.items ?? []}
          onChange={(item, value) => {
            if (item.conceptKey) onChange(item.conceptKey, value);
          }}
        />
      ))}
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
}: {
  step: GuidedStep;
  onSetAnswer: (conceptKey: string, value: string) => void;
  onAnswerEligibility: (askKey: string, value: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  hasBack: boolean;
  hasNext: boolean;
}) {
  const eyebrow =
    step.kind === "eligibility"
      ? "Eligibility"
      : step.kind === "document"
        ? "Document"
        : step.kind === "field"
          ? "Question"
          : "Essay";
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm">
      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.16em] text-primary">
        {eyebrow}
        {step.targetName ? ` · ${step.targetName}` : ""}
      </p>
      <h4 className="mt-1 font-display text-headline-sm font-bold text-on-surface">
        {step.label}
      </h4>
      {step.prompt && (
        <p className="mt-2 rounded-md border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-body-sm text-on-surface-variant">
          {step.prompt}
        </p>
      )}

      <div className="mt-4">
        {step.kind === "eligibility" && step.question ? (
          <EligibilityInput
            q={step.question}
            onChange={(v) =>
              step.askKey && onAnswerEligibility(step.askKey, v)
            }
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
            onChange={(v) =>
              step.conceptKey && onSetAnswer(step.conceptKey, v)
            }
          />
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!hasBack}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={!hasNext}
            className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
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
      <select
        value={value}
        onChange={(e) => update(e.target.value)}
        className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
      >
        <option value="">Select…</option>
        {(q.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (q.kind === "boolean") {
    return (
      <div className="flex gap-2">
        {["yes", "no"].map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => update(opt)}
              className={`rounded-md border-2 px-3 py-1.5 text-label-sm capitalize ${
                on
                  ? "border-on-surface bg-primary text-white"
                  : "border-on-surface/25 bg-surface text-on-surface"
              }`}
            >
              {opt}
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
      className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
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
        <div className="flex items-center gap-2 rounded-md border-2 border-tertiary/40 bg-tertiary/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
            {existing.fileName}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-on-surface/30 bg-surface px-3 py-3 font-[var(--font-label)] text-label-md text-on-surface hover:border-on-surface hover:bg-primary/5 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {busy ? "Uploading…" : `Upload ${label.toLowerCase()}`}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-1 text-label-sm text-on-error-container">{error}</p>
      )}
    </div>
  );
}

function EssayStep() {
  return (
    <div className="flex items-start gap-3 rounded-md border-2 border-on-surface/15 bg-surface-container-lowest p-3">
      <PenLine className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-on-surface">
          Drafting essays lives in the Essay Assistant — grounded in your story,
          first draft free.
        </p>
      </div>
      <Link
        to="/essay"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-3 py-1.5 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5"
      >
        <Sparkles className="h-3.5 w-3.5" /> Draft in Essay Assistant
      </Link>
    </div>
  );
}
