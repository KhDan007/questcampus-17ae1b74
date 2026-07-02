"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  useExplainItem,
  type ExplainArgs,
  type Guide,
} from "@/lib/apply/guidance";

type Props = {
  guide: Guide | null | undefined;
  explainArgs: ExplainArgs;
  compact?: boolean;
};

/**
 * Curated "how do I get this?" info + AI helper.
 * Guarded: if guide is null AND explainArgs makes no sense we still render
 * the AI button — user can always ask.
 */
export function GuideBlock({ guide, explainArgs, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const explain = useExplainItem();

  async function ask() {
    setAsking(true);
    setError(null);
    try {
      const res = await explain(explainArgs);
      setAnswer(res.answer ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach AI");
    } finally {
      setAsking(false);
    }
  }

  const hasGuide = !!guide;

  return (
    <div className={`mt-2 space-y-2 ${compact ? "text-label-sm" : "text-body-sm"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {hasGuide && (
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:border-on-surface"
            aria-expanded={open}
          >
            <BookOpen className="h-3.5 w-3.5" />
            How do I get this?
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
        <button
          type="button"
          onClick={ask}
          disabled={asking}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-secondary px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {asking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {answer ? "Ask again" : "Ask AI"}
        </button>
      </div>

      {hasGuide && open && guide && (
        <div className="rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest p-3">
          <p className="font-display text-label-md font-bold text-on-surface">
            {guide.title}
          </p>
          {guide.whatItIs && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {guide.whatItIs}
            </p>
          )}
          {Array.isArray(guide.howToGet) && guide.howToGet.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-on-surface">
              {guide.howToGet.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {guide.format && (
            <p className="mt-2 text-label-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">Format:</span>{" "}
              {guide.format}
            </p>
          )}
          {Array.isArray(guide.tips) && guide.tips.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-label-sm text-on-surface-variant">
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {answer && (
        <div className="rounded-lg border-2 border-secondary/60 bg-secondary/10 p-3">
          <div className="flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface">
            <Sparkles className="h-3.5 w-3.5" /> AI helper
          </div>
          <p className="mt-1 whitespace-pre-wrap text-body-sm text-on-surface">
            {answer}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md border-2 border-error/40 bg-error/10 px-2 py-1 text-label-sm text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}

/** Match a guide row for a given item from a batch result. */
export function findGuide(
  rows: import("@/lib/apply/guidance").GuideRow[] | undefined,
  item: {
    kind: string;
    docType?: string | null;
    conceptKey?: string | null;
    label?: string | null;
  },
): Guide | null {
  if (!rows) return null;
  const dt = item.docType ?? null;
  const ck = item.conceptKey ?? null;
  const lb = item.label ?? null;
  const hit = rows.find(
    (r) =>
      r.kind === item.kind &&
      (r.docType ?? null) === dt &&
      (r.conceptKey ?? null) === ck &&
      (r.label ?? null) === lb,
  );
  return hit?.guide ?? null;
}
