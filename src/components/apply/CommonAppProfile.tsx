"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Check,
  Sparkles,
  Plus,
  Trash2,
  PenLine,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCommonAppSchema,
  useCommonAppProfile,
  usePrefillFromOnboarding,
  type ProfileField,
  type ProfileSection,
  type RepeatGroup,
} from "@/lib/apply/commonAppProfile";
import { useSetAnswer } from "@/lib/apply/intake";



export function CommonAppProfile({
  focusSection,
  embedded = false,
}: { focusSection?: string; embedded?: boolean } = {}) {
  const schema = useCommonAppSchema();
  const profile = useCommonAppProfile();
  const setAnswer = useSetAnswer();
  const prefill = usePrefillFromOnboarding();
  const [prefilling, setPrefilling] = useState(false);
  const [activeSection, setActiveSection] = useState<string | undefined>(focusSection);

  useEffect(() => {
    setActiveSection(focusSection);
  }, [focusSection]);

  const answers = profile?.answers ?? {};
  const completeness = profile?.completeness;

  const sectionStatusByKey = useMemo(() => {
    const map = new Map<
      string,
      { complete: boolean; requiredDone: number; requiredTotal: number }
    >();
    completeness?.sections.forEach((s) =>
      map.set(s.key, {
        complete: s.complete,
        requiredDone: s.requiredDone,
        requiredTotal: s.requiredTotal,
      }),
    );
    return map;
  }, [completeness]);

  const onPrefill = useCallback(async () => {
    if (prefilling) return;
    setPrefilling(true);
    try {
      const res = await prefill();
      if (res.filled > 0) {
        toast.success(
          `Prefilled ${res.filled} field${res.filled === 1 ? "" : "s"} from your onboarding.`,
        );
      } else {
        toast.message("Nothing new to prefill.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prefill failed");
    } finally {
      setPrefilling(false);
    }
  }, [prefill, prefilling]);

  if (profile === null) {
    return (
      <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-6 text-body-md text-on-surface-variant qc-soft-shadow">
        Sign in to build your Common App profile.
      </div>
    );
  }
  if (schema === undefined || profile === undefined) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-16 qc-soft-shadow">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, Math.round(completeness?.percent ?? 0)));
  const complete = completeness?.complete ?? false;

  return (
    <div className="space-y-4 sm:space-y-5">
      {!embedded && (
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Applications
        </Link>
      )}

      {/* Header */}
      <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-8">
        <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
          Universal profile
        </p>
        <h1 className="mt-1 font-display text-headline-lg font-bold text-on-surface sm:text-display-md">
          Common App Profile
        </h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Fill this once — we auto-fill it into every Common App school.
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 sm:mt-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                {complete ? "Profile complete" : `${percent}% complete`}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {completeness?.requiredDone ?? 0}/{completeness?.requiredTotal ?? 0} required fields
              </p>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-on-surface/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className={
                  "h-full transition-[width] duration-300 " +
                  (complete ? "bg-tertiary" : "bg-primary")
                }
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onPrefill}
            disabled={prefilling}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {prefilling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
            Prefill from my onboarding answers
          </button>
        </div>
      </section>

      {activeSection && schema.some((s) => s.key === activeSection) && (
        <button
          type="button"
          onClick={() => setActiveSection(undefined)}
          className="inline-flex items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          Show all sections
        </button>
      )}

      {/* Sections */}
      {activeSection ? (
        schema
          .filter((s) => s.key === activeSection)
          .map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              status={sectionStatusByKey.get(section.key)}
              answers={answers}
              setAnswer={setAnswer}
            />
          ))
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {schema.map((section) => (
            <SectionSummaryRow
              key={section.key}
              section={section}
              status={sectionStatusByKey.get(section.key)}
              onOpen={() => setActiveSection(section.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionSummaryRow({
  section,
  status,
  onOpen,
}: {
  section: ProfileSection;
  status?: { complete: boolean; requiredDone: number; requiredTotal: number };
  onOpen: () => void;
}) {
  const done = status?.complete ?? false;
  const fieldCount = section.group
    ? `Up to ${section.group.max} ${section.group.itemLabel.toLowerCase()}${section.group.max === 1 ? "" : "s"}`
    : `${section.fields?.length ?? 0} field${section.fields?.length === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 text-left qc-soft-shadow qc-soft-shadow-hover sm:p-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-on-surface-variant" />
          )}
          <h2 className="truncate font-display text-headline-sm font-bold text-on-surface">
            {section.title}
          </h2>
        </div>
        {section.description && (
          <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
            {section.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {status && (
            <span
              className={
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-[var(--font-label)] text-label-sm " +
                (done
                  ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                  : "bg-surface-container text-on-surface-variant")
              }
            >
              {status.requiredDone}/{status.requiredTotal} required
            </span>
          )}
          <span className="text-label-sm text-on-surface-variant">{fieldCount}</span>
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function SectionCard({
  section,
  status,
  answers,
  setAnswer,
}: {
  section: ProfileSection;
  status?: { complete: boolean; requiredDone: number; requiredTotal: number };
  answers: Record<string, string>;
  setAnswer: (conceptKey: string, value: string) => void;
}) {
  const done = status?.complete ?? false;
  return (
    <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            {section.title}
          </h2>
          {section.description && (
            <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
              {section.description}
            </p>
          )}
        </div>
        {status && (
          <span
            className={
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-[var(--font-label)] text-label-sm " +
              (done
                ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                : "bg-surface-container text-on-surface-variant")
            }
          >
            {done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-tertiary" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            {status.requiredDone}/{status.requiredTotal}
          </span>
        )}
      </div>

      <div className="mt-4 sm:mt-5">
        {section.fields && section.fields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {section.fields.map((f) => (
              <ScalarField
                key={f.conceptKey}
                field={f}
                value={answers[f.conceptKey] ?? ""}
                onChange={(v) => setAnswer(f.conceptKey, v)}
              />
            ))}
          </div>
        )}
        {section.group && (
          <RepeatGroupEditor
            group={section.group}
            answers={answers}
            setAnswer={setAnswer}
          />
        )}
      </div>
    </section>
  );
}

export function ScalarField({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (v: string) => void;
}) {
  // Controlled input; sync from the store only while unfocused so reactive
  // refreshes (e.g. Prefill) never fight the user's active typing.
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  const update = (v: string) => {
    setLocal(v);
    onChange(v);
  };
  const focusHandlers = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };


  const isFullWidth = field.type === "longtext" || field.type === "essay";
  const wrapperClass = "min-w-0 " + (isFullWidth ? "sm:col-span-2" : "");

  if (field.type === "essay") {
    return (
      <div className={"flex flex-col gap-1.5 " + wrapperClass}>
        <FieldLabel field={field} />
        <div className="flex items-center justify-between gap-3 rounded-md border border-on-surface/8 bg-surface-container px-3 py-3">
          <p className="min-w-0 text-body-sm text-on-surface-variant">
            Written in the Essay Assistant.
          </p>
          <Link
            to="/essay"
            search={{ conceptKey: field.conceptKey } as never}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
          >
            <PenLine className="h-3.5 w-3.5 text-primary" />
            Write in Essay Assistant
          </Link>
        </div>
        {field.help && (
          <p className="text-label-sm text-on-surface-variant">{field.help}</p>
        )}
      </div>
    );
  }

  // Multi-select (Common App checkbox groups: grade levels, timing). Stored as
  // a comma-joined string in option order so it round-trips through the answer
  // store like any other field.
  if (field.type === "multiselect") {
    const selected = new Set(
      local.split(",").map((s) => s.trim()).filter(Boolean),
    );
    const toggle = (opt: string) => {
      const next = new Set(selected);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      update((field.options ?? []).filter((o) => next.has(o)).join(", "));
    };
    return (
      <div className={"flex flex-col gap-1.5 " + wrapperClass}>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => {
            const on = selected.has(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                aria-pressed={on}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-[var(--font-label)] text-label-md font-semibold transition-colors " +
                  (on
                    ? "bg-primary-fixed/70 text-primary"
                    : "border border-on-surface/15 bg-surface text-on-surface-variant hover:bg-on-surface/5")
                }
              >
                {on ? <Check className="h-3.5 w-3.5" /> : null}
                {o}
              </button>
            );
          })}
        </div>
        {field.help && <p className="text-label-sm text-on-surface-variant">{field.help}</p>}
      </div>
    );
  }

  const inputClass =
    "w-full min-w-0 rounded-md border border-on-surface/15 bg-surface px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none";

  const maxAttr = field.maxChars ? { maxLength: field.maxChars } : {};
  const counter =
    field.maxChars != null ? (
      <p
        className={
          "text-label-sm " +
          (local.length > field.maxChars
            ? "text-on-error-container"
            : "text-on-surface-variant")
        }
      >
        {local.length}/{field.maxChars}
      </p>
    ) : null;

  return (
    <div className={"flex flex-col gap-1.5 " + wrapperClass}>
      <FieldLabel field={field} />

      {field.type === "longtext" ? (
        <textarea
          value={local}
          onChange={(e) => update(e.target.value)}
          rows={4}
          className={inputClass}
          {...focusHandlers}
          {...maxAttr}
        />
      ) : field.type === "enum" ? (
        <select
          value={local}
          onChange={(e) => update(e.target.value)}
          className={inputClass}
          {...focusHandlers}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            field.type === "date"
              ? "date"
              : field.type === "email"
                ? "email"
                : field.type === "tel"
                  ? "tel"
                  : field.type === "number"
                    ? "number"
                    : "text"
          }
          value={local}
          onChange={(e) => update(e.target.value)}
          className={inputClass}
          {...focusHandlers}
          {...maxAttr}
        />
      )}


      <div className="flex items-center justify-between gap-3">
        {field.help ? (
          <p className="text-label-sm text-on-surface-variant">{field.help}</p>
        ) : (
          <span />
        )}
        {counter}
      </div>
    </div>
  );
}

function FieldLabel({ field }: { field: ProfileField }) {
  return (
    <label className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
      {field.label}
      {field.required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function RepeatGroupEditor({
  group,
  answers,
  setAnswer,
}: {
  group: RepeatGroup;
  answers: Record<string, string>;
  setAnswer: (conceptKey: string, value: string) => void;
}) {
  // Find highest index that has any answer.
  const filledIndexes = useMemo(() => {
    const set = new Set<number>();
    const prefix = `${group.groupKey}_`;
    Object.entries(answers).forEach(([k, v]) => {
      if (!k.startsWith(prefix) || !v) return;
      const rest = k.slice(prefix.length);
      const idxStr = rest.split("_", 1)[0];
      const idx = Number.parseInt(idxStr, 10);
      if (Number.isFinite(idx) && idx >= 1 && idx <= group.max) set.add(idx);
    });
    return set;
  }, [answers, group.groupKey, group.max]);

  const initialCount = Math.min(
    group.max,
    Math.max(1, filledIndexes.size > 0 ? Math.max(...filledIndexes) + 1 : 1),
  );
  const [count, setCount] = useState(initialCount);

  // Grow visible count if the store gains new filled indexes (e.g. prefill).
  useEffect(() => {
    if (filledIndexes.size === 0) return;
    const highest = Math.max(...filledIndexes);
    setCount((c) => Math.max(c, Math.min(group.max, highest + 1)));
  }, [filledIndexes, group.max]);

  const clearItem = (index: number) => {
    group.itemFields.forEach((f) => {
      setAnswer(`${group.groupKey}_${index}_${f.conceptKey}`, "");
    });
  };

  const indexes = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      {indexes.map((index) => (
        <div
          key={index}
          className="rounded-xl border border-on-surface/8 bg-surface-container/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
              {group.itemLabel} {index}
            </p>
            <button
              type="button"
              onClick={() => clearItem(index)}
              className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-error-container"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {group.itemFields.map((f) => {
              const key = `${group.groupKey}_${index}_${f.conceptKey}`;
              return (
                <ScalarField
                  key={key}
                  field={{ ...f, conceptKey: key, label: f.label }}
                  value={answers[key] ?? ""}
                  onChange={(v) => setAnswer(key, v)}
                />
              );
            })}
          </div>
        </div>
      ))}
      {count < group.max && (
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(group.max, c + 1))}
          className="inline-flex items-center gap-1.5 rounded-md border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <Plus className="h-4 w-4 text-primary" />
          Add another {group.itemLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}
