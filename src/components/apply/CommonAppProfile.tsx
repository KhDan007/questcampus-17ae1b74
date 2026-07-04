"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Plus,
  Trash2,
  PenLine,
  ArrowLeft,
  Lock,
  KeyRound,
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
import {
  useCommonAppCredentials,
  useSetCommonAppCredentials,
  useRemoveCommonAppCredentials,
} from "@/lib/apply/commonAppCredentials";



export function CommonAppProfile({ focusSection }: { focusSection?: string } = {}) {
  const schema = useCommonAppSchema();
  const profile = useCommonAppProfile();
  const setAnswer = useSetAnswer();
  const prefill = usePrefillFromOnboarding();
  const [prefilling, setPrefilling] = useState(false);

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
      <div className="rounded-2xl border-2 border-on-surface/20 bg-surface p-6 text-body-md text-on-surface-variant">
        Sign in to build your Common App profile.
      </div>
    );
  }
  if (schema === undefined || profile === undefined) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-on-surface/20 bg-surface p-16">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, Math.round(completeness?.percent ?? 0)));
  const complete = completeness?.complete ?? false;

  return (
    <div className="space-y-5">
      <Link
        to="/apply"
        className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      {/* Header */}
      <section className="rounded-2xl border-2 border-on-surface bg-surface-container-lowest p-6 qc-hard-shadow sm:p-8">
        <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
          Universal profile
        </p>
        <h1 className="mt-1 font-display text-display-sm font-bold text-on-surface sm:text-display-md">
          Common App Profile
        </h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Fill this once — we auto-fill it into every Common App school.
        </p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
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

      <CommonAppLoginCard />

      {focusSection && schema.some((s) => s.key === focusSection) && (
        <Link
          to="/common-app"
          search={{} as never}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface"
        >
          Show all sections
        </Link>
      )}

      {/* Sections */}
      {(focusSection
        ? schema.filter((s) => s.key === focusSection)
        : schema
      ).map((section) => (
        <SectionCard
          key={section.key}
          section={section}
          status={sectionStatusByKey.get(section.key)}
          answers={answers}
          setAnswer={setAnswer}
        />
      ))}
    </div>
  );
}

function SectionCard({
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
    <section className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm sm:p-6">
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
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-[var(--font-label)] text-label-sm " +
              (done
                ? "border-tertiary/50 bg-tertiary/10 text-on-surface"
                : "border-on-surface/25 bg-surface text-on-surface-variant")
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

      <div className="mt-5">
        {section.fields && section.fields.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
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

function ScalarField({
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
  const wrapperClass = isFullWidth ? "sm:col-span-2" : "";

  if (field.type === "essay") {
    return (
      <div className={"flex flex-col gap-1.5 " + wrapperClass}>
        <FieldLabel field={field} />
        <div className="flex items-center justify-between gap-3 rounded-md border-2 border-on-surface/20 bg-surface-container-lowest px-3 py-3">
          <p className="min-w-0 text-body-sm text-on-surface-variant">
            Written in the Essay Assistant.
          </p>
          <Link
            to="/essay"
            search={{ conceptKey: field.conceptKey } as never}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
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

  const inputClass =
    "w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";

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
    <div className="space-y-4">
      {indexes.map((index) => (
        <div
          key={index}
          className="rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-4"
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          <Plus className="h-4 w-4 text-primary" />
          Add another {group.itemLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}

function CommonAppLoginCard() {
  const creds = useCommonAppCredentials();
  const saveCreds = useSetCommonAppCredentials();
  const removeCreds = useRemoveCommonAppCredentials();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const has = creds?.hasCredentials ?? false;

  async function onSave() {
    if (saving) return;
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setSaving(true);
    try {
      await saveCreds(email.trim(), password);
      setEmail("");
      setPassword("");
      toast.success("Saved — we'll sign you in automatically.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save login");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove() {
    if (removing) return;
    if (!confirm("Remove your saved Common App login?")) return;
    setRemoving(true);
    try {
      await removeCreds();
      toast.success("Login removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove login");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-on-surface/20 bg-surface-container-lowest text-on-surface">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            Common App login
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            We use this to sign into your Common App account during auto-apply.
          </p>

          {creds === undefined ? (
            <div className="mt-4 flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : has ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-tertiary/40 bg-tertiary/10 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
                <p className="min-w-0 truncate text-body-sm text-on-surface">
                  Saved for{" "}
                  <span className="font-semibold">
                    {creds.loginEmail ?? "your Common App account"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onRemove}
                disabled={removing}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <label className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
                  Common App email
                </label>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save login
              </button>
            </div>
          )}

          <p className="mt-3 inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            <Lock className="h-3 w-3" />
            Stored encrypted; used only to sign you into Common App during auto-apply. We never
            show it back to you.
          </p>
        </div>
      </div>
    </section>
  );
}
