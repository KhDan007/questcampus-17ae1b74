"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  Loader2,
  Lightbulb,
  Check,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import type { ProfileSection } from "@/lib/apply/commonAppProfile";
import { ScalarField } from "@/components/apply/CommonAppProfile";
import {
  useAssessActivity,
  useRewriteActivity,
  ACTIVITY_TIPS,
  ROLE_MAX,
  DESC_MAX,
  type Assessment,
  type Rewrite,
} from "@/lib/apply/activityCoach";
import { Card, IconTile, cx } from "@/components/ui/calm";

// Rich, guided editor for the Common App activities repeat group: the normal
// fields (incl. the new multi-selects) PLUS per-activity coaching — tips, an AI
// assessment scored against the best-written exemplars (RAG), and an AI rewrite
// grounded in that same craft.

export function GuidedActivitiesEditor({
  section,
  answers,
  setAnswer,
}: {
  section: ProfileSection;
  answers: Record<string, string>;
  setAnswer: (conceptKey: string, value: string) => void;
}) {
  const group = section.group;

  const filledIndexes = useMemo(() => {
    const set = new Set<number>();
    if (!group) return set;
    const prefix = `${group.groupKey}_`;
    Object.entries(answers).forEach(([k, v]) => {
      if (!k.startsWith(prefix) || !v) return;
      const idx = Number.parseInt(k.slice(prefix.length).split("_", 1)[0], 10);
      if (Number.isFinite(idx) && idx >= 1 && idx <= group.max) set.add(idx);
    });
    return set;
  }, [answers, group]);

  const [count, setCount] = useState(
    Math.min(group?.max ?? 1, Math.max(1, filledIndexes.size > 0 ? Math.max(...filledIndexes) + 1 : 1)),
  );
  useEffect(() => {
    if (filledIndexes.size === 0) return;
    setCount((c) => Math.max(c, Math.min(group?.max ?? c, Math.max(...filledIndexes) + 1)));
  }, [filledIndexes, group]);

  const [tipsOpen, setTipsOpen] = useState(false);

  if (!group) return null;
  const indexes = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-headline-sm font-bold text-on-surface">{section.title}</h2>
          {section.description && (
            <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">{section.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          aria-expanded={tipsOpen}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <Lightbulb className="h-4 w-4 text-secondary" /> Tips
          <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", tipsOpen && "rotate-180")} />
        </button>
      </div>

      {tipsOpen && (
        <ul className="mt-4 flex flex-col gap-2 rounded-xl bg-secondary-fixed/30 p-4">
          {ACTIVITY_TIPS.map((t) => (
            <li key={t} className="flex items-start gap-2 text-body-sm text-on-surface">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              {t}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {indexes.map((index) => (
          <ActivityItem key={index} group={group} index={index} answers={answers} setAnswer={setAnswer} />
        ))}
      </div>

      {count < group.max && (
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(group.max, c + 1))}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <Plus className="h-4 w-4 text-primary" /> Add another activity
        </button>
      )}
    </Card>
  );
}

function ActivityItem({
  group,
  index,
  answers,
  setAnswer,
}: {
  group: NonNullable<ProfileSection["group"]>;
  index: number;
  answers: Record<string, string>;
  setAnswer: (conceptKey: string, value: string) => void;
}) {
  const keyFor = (suffix: string) => `${group.groupKey}_${index}_${suffix}`;
  const category = answers[keyFor("type")] ?? "";
  const role = answers[keyFor("position")] ?? "";
  const description = answers[keyFor("description")] ?? "";

  const assess = useAssessActivity();
  const rewrite = useRewriteActivity();
  const [busy, setBusy] = useState<null | "assess" | "rewrite">(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [suggestion, setSuggestion] = useState<Rewrite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasContent = role.trim().length > 0 || description.trim().length > 0;

  async function runAssess() {
    if (busy) return;
    setBusy("assess");
    setError(null);
    setAssessment(null);
    const res = await assess({ category, role, description });
    if (res.ok) setAssessment(res.assessment);
    else setError(res.error);
    setBusy(null);
  }

  async function runRewrite() {
    if (busy) return;
    setBusy("rewrite");
    setError(null);
    setSuggestion(null);
    const res = await rewrite({ category, role, description });
    if (res.ok) setSuggestion(res.rewrite);
    else setError(res.error);
    setBusy(null);
  }

  function applySuggestion() {
    if (!suggestion) return;
    setAnswer(keyFor("position"), suggestion.role);
    setAnswer(keyFor("description"), suggestion.description);
    setSuggestion(null);
  }

  const clearItem = () => group.itemFields.forEach((f) => setAnswer(keyFor(f.conceptKey), ""));

  return (
    <div className="rounded-xl border border-on-surface/8 bg-surface-container/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          Activity {index}
        </p>
        <button
          type="button"
          onClick={clearItem}
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-error-container"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {group.itemFields.map((f) => {
          const k = keyFor(f.conceptKey);
          return (
            <ScalarField
              key={k}
              field={{ ...f, conceptKey: k }}
              value={answers[k] ?? ""}
              onChange={(v) => setAnswer(k, v)}
            />
          );
        })}
      </div>

      {/* Coaching */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-on-surface/8 pt-4">
        <button
          type="button"
          onClick={runAssess}
          disabled={!hasContent || busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "assess" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          Assess with AI
        </button>
        <button
          type="button"
          onClick={runRewrite}
          disabled={!hasContent || busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "rewrite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Rewrite with AI
        </button>
        {!hasContent && (
          <span className="text-label-sm text-on-surface-variant">Add a role or description to coach it.</span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-label-sm font-semibold text-on-error-container">
          {error}
        </p>
      )}

      {assessment && <AssessmentPanel assessment={assessment} onClose={() => setAssessment(null)} />}
      {suggestion && (
        <SuggestionPanel
          suggestion={suggestion}
          onApply={applySuggestion}
          onDismiss={() => setSuggestion(null)}
        />
      )}
    </div>
  );
}

function scoreTone(score: number): { text: string; bar: string; tile: "coral" | "amber" | "green" } {
  if (score >= 75) return { text: "text-tertiary", bar: "bg-tertiary", tile: "green" };
  if (score >= 50) return { text: "text-secondary", bar: "bg-secondary", tile: "amber" };
  return { text: "text-primary", bar: "bg-primary", tile: "coral" };
}

function AssessmentPanel({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const tone = scoreTone(assessment.score);
  return (
    <div className="mt-3 rounded-xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow">
      <div className="flex items-start gap-3">
        <IconTile icon={Sparkles} tone={tone.tile} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5">
            <span className={cx("font-display text-headline-md font-bold tabular-nums", tone.text)}>
              {assessment.score}
            </span>
            <span className="font-[var(--font-label)] text-label-sm text-on-surface-variant">/100</span>
          </p>
          {assessment.headline && (
            <p className="mt-0.5 text-body-sm text-on-surface">{assessment.headline}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 text-label-sm text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
        >
          Hide
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {assessment.dimensions.map((d) => {
          const dt = scoreTone(d.score);
          return (
            <div key={d.key} className="rounded-lg bg-surface-container/60 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">{d.label}</p>
                <span className={cx("font-display text-label-md font-bold tabular-nums", dt.text)}>{d.score}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-on-surface/10">
                <div className={cx("h-full", dt.bar)} style={{ width: `${Math.max(0, Math.min(100, d.score))}%` }} />
              </div>
              {d.note && <p className="mt-1 text-label-sm text-on-surface-variant">{d.note}</p>}
            </div>
          );
        })}
      </div>

      {assessment.strengths.length > 0 && (
        <div className="mt-3">
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
            Strengths
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {assessment.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-on-surface">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {assessment.fixes.length > 0 && (
        <div className="mt-3">
          <p className="font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Top fixes
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {assessment.fixes.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-on-surface">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuggestionPanel({
  suggestion,
  onApply,
  onDismiss,
}: {
  suggestion: Rewrite;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow">
      <div className="flex items-center gap-2">
        <IconTile icon={Wand2} tone="coral" size="sm" />
        <p className="font-display text-headline-sm font-bold text-on-surface">AI rewrite</p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <SuggestedField label={`Role (${suggestion.role.length}/${ROLE_MAX})`} value={suggestion.role} />
        <SuggestedField label={`Description (${suggestion.description.length}/${DESC_MAX})`} value={suggestion.description} />
      </div>

      {suggestion.changes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {suggestion.changes.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-label-sm text-on-surface-variant">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-on-surface/30" /> {c}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Check className="h-4 w-4" /> Use this
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function SuggestedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container/60 p-3">
      <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant">{label}</p>
      <p className="mt-1 text-body-sm text-on-surface">{value}</p>
    </div>
  );
}
