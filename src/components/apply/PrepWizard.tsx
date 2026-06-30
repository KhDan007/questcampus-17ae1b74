"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { PROFILE_FIELDS, useApplicantProfile, type ApplicantProfile } from "@/lib/apply/profile";
import {
  useApplicationDocuments,
  useApplyActions,
  type DocType,
} from "@/lib/applyQueue/client";
import { useApplySelection } from "@/lib/applyQueue/selection";

const DOC_STEPS: { type: DocType; label: string; helper: string }[] = [
  { type: "transcript", label: "Transcript", helper: "Latest official transcript (PDF). Skip if you don't have one yet." },
  { type: "personal_statement", label: "Personal statement", helper: "Your main essay. You can draft one later in the essay assistant." },
  { type: "passport", label: "Passport / ID", helper: "Photo page (PDF or image). Required for international applications." },
  { type: "resume", label: "Resume / CV", helper: "Activities, awards, work experience." },
];

type StepKey =
  | { kind: "field"; index: number }
  | { kind: "doc"; index: number }
  | { kind: "review" };

export function PrepWizard() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { profile, setField } = useApplicantProfile();
  const { docs, upload } = useApplicationDocuments();
  const { items, clear } = useApplySelection();
  const { startApply } = useApplyActions();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: StepKey[] = useMemo(
    () => [
      ...PROFILE_FIELDS.map((_, i) => ({ kind: "field" as const, index: i })),
      ...DOC_STEPS.map((_, i) => ({ kind: "doc" as const, index: i })),
      { kind: "review" as const },
    ],
    [],
  );

  const total = steps.length;
  const step = steps[stepIdx];
  const pct = Math.round(((stepIdx + 1) / total) * 100);

  function goNext() {
    setStepIdx((i) => Math.min(total - 1, i + 1));
  }
  function goBack() {
    setStepIdx((i) => Math.max(0, i - 1));
  }

  async function submitAll() {
    setSubmitting(true);
    setError(null);
    try {
      const list = items.length > 0 ? items : [];
      for (const it of list) {
        try {
          await startApply({ system: it.source, externalId: it.externalId, targetName: it.name });
        } catch (e) {
          // continue with others; surface last error
          setError(e instanceof Error ? e.message : "Failed to start one application");
        }
      }
      clear();
      void navigate({ to: "/apply" });
    } finally {
      setSubmitting(false);
    }
  }

  const variants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="font-[var(--font-label)] text-label-sm text-on-surface-variant">
            Step {stepIdx + 1} of {total}
          </p>
          <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
            {pct}%
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          {...variants}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border-2 border-on-surface bg-surface/95 p-6 qc-hard-shadow sm:p-8"
        >
          {step.kind === "field" && (
            <FieldStep
              fieldIdx={step.index}
              profile={profile}
              onChange={(v) => setField(PROFILE_FIELDS[step.index].key, v)}
              onNext={goNext}
            />
          )}
          {step.kind === "doc" && (
            <DocStep
              docIdx={step.index}
              uploadedCount={(docs ?? []).filter((d) => d.docType === DOC_STEPS[step.index].type).length}
              onUpload={async (file) => {
                await upload(file, DOC_STEPS[step.index].type);
              }}
            />
          )}
          {step.kind === "review" && (
            <ReviewStep
              profile={profile}
              docs={docs ?? []}
              targets={items}
              onSubmit={submitAll}
              submitting={submitting}
              error={error}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIdx === 0}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-[var(--font-label)] text-label-md text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step.kind !== "review" && (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function FieldStep({
  fieldIdx,
  profile,
  onChange,
  onNext,
}: {
  fieldIdx: number;
  profile: ApplicantProfile;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const field = PROFILE_FIELDS[fieldIdx];
  const value = profile[field.key] ?? "";
  return (
    <div>
      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
        {field.label}
      </p>
      <h2 className="mt-2 font-display text-headline-lg font-bold text-on-surface">
        {field.question}
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">{field.helper}</p>
      <div className="mt-6">
        {field.multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full rounded-xl border-2 border-on-surface/25 bg-surface px-4 py-3 font-[var(--font-body)] text-body-lg text-on-surface placeholder:text-on-surface/30 focus:border-on-surface focus:outline-none"
          />
        ) : (
          <input
            type={field.type ?? "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onNext();
              }
            }}
            placeholder={field.placeholder}
            autoFocus
            className="w-full rounded-xl border-2 border-on-surface/25 bg-surface px-4 py-3.5 font-display text-headline-sm text-on-surface placeholder:text-on-surface/30 focus:border-on-surface focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

function DocStep({
  docIdx,
  uploadedCount,
  onUpload,
}: {
  docIdx: number;
  uploadedCount: number;
  onUpload: (file: File) => Promise<void>;
}) {
  const doc = DOC_STEPS[docIdx];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
        Documents · {docIdx + 1} of {DOC_STEPS.length}
      </p>
      <h2 className="mt-2 font-display text-headline-lg font-bold text-on-surface">
        {doc.label}
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">{doc.helper}</p>

      <div className="mt-6 rounded-xl border-2 border-dashed border-on-surface/25 bg-surface-container-lowest p-6 text-center">
        {uploadedCount > 0 ? (
          <div className="flex items-center justify-center gap-2 text-tertiary">
            <Check className="h-5 w-5" />
            <span className="font-[var(--font-label)] text-label-md font-semibold">
              {uploadedCount} file{uploadedCount === 1 ? "" : "s"} on file
            </span>
          </div>
        ) : (
          <FileText className="mx-auto h-10 w-10 text-on-surface/30" />
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = "";
            if (!f) return;
            setErr(null);
            setBusy(true);
            try {
              await onUpload(f);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Upload failed");
            } finally {
              setBusy(false);
            }
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3.5 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploadedCount > 0 ? "Add another" : "Upload file"}
        </button>
        {err && <p className="mt-3 text-label-sm text-on-error-container">{err}</p>}
      </div>

      <p className="mt-3 text-center text-label-sm text-on-surface-variant">
        You can always add or replace this later.
      </p>
    </div>
  );
}

function ReviewStep({
  profile,
  docs,
  targets,
  onSubmit,
  submitting,
  error,
}: {
  profile: ApplicantProfile;
  docs: { docType: string }[];
  targets: { name: string }[];
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const fieldsDone = PROFILE_FIELDS.filter((f) => profile[f.key]?.toString().trim()).length;
  const docsDone = docs.length;
  return (
    <div>
      <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
        Ready to launch
      </p>
      <h2 className="mt-2 font-display text-headline-lg font-bold text-on-surface">
        Launch {targets.length} application{targets.length === 1 ? "" : "s"}
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        We'll deep-research each portal in the background and ping you the moment one is ready to fill.
      </p>

      <ul className="mt-5 space-y-2">
        <ReviewRow label="Profile fields" value={`${fieldsDone} / ${PROFILE_FIELDS.length}`} ok={fieldsDone >= 4} />
        <ReviewRow label="Documents uploaded" value={`${docsDone}`} ok={docsDone >= 1} />
        <ReviewRow label="Universities queued" value={`${targets.length}`} ok={targets.length > 0} />
      </ul>

      {targets.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-3">
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
            Queued
          </p>
          <ul className="mt-2 space-y-1">
            {targets.slice(0, 6).map((t, i) => (
              <li key={i} className="truncate text-label-md text-on-surface">
                {i + 1}. {t.name}
              </li>
            ))}
            {targets.length > 6 && (
              <li className="text-label-sm text-on-surface-variant">
                +{targets.length - 6} more
              </li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-error/40 bg-error-container/40 px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting || targets.length === 0}
        onClick={onSubmit}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-on-surface bg-primary px-4 py-3.5 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Launching…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Start {targets.length} application{targets.length === 1 ? "" : "s"}
          </>
        )}
      </button>
    </div>
  );
}

function ReviewRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-md border-2 border-on-surface/15 bg-surface-container-lowest px-3 py-2.5">
      <span className="text-body-md text-on-surface">{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-[var(--font-label)] text-label-md font-bold text-on-surface">{value}</span>
        {ok && <Check className="h-4 w-4 text-tertiary" />}
      </span>
    </li>
  );
}
