"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import type { EligibilityResult, EligQuestion } from "@/lib/apply/intake";

type Props = {
  eligibility: EligibilityResult;
  onAnswer: (askKey: string, value: string) => void;
  showQuestions?: boolean;
};

export function EligibilityCard({ eligibility, onAnswer, showQuestions = true }: Props) {
  const [open, setOpen] = useState(false);
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    // Preload local values from perTarget blockers' askKeys if any exist (usually not)
    setLocal({});
  }, [eligibility.questions.length]);

  if (eligibility.overall === "eligible") return null;

  const questions = eligibility.questions;
  const ineligible = eligibility.perTarget.filter((p) => p.verdict === "ineligible");

  function update(askKey: string, value: string) {
    setLocal((l) => ({ ...l, [askKey]: value }));
    onAnswer(askKey, value);
  }

  return (
    <section className="rounded-2xl border-2 border-on-surface/20 bg-surface/95 qc-hard-shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-headline-sm font-bold text-on-surface">
              A few eligibility questions
            </h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {questions.length > 0
                ? `${questions.length} quick ${questions.length === 1 ? "question" : "questions"} to confirm fit.`
                : "Confirm your fit for each university."}
              {ineligible.length > 0 && ` · ${ineligible.length} may not be a match.`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t-2 border-on-surface/10 p-5">
          {questions.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {questions.map((q) => (
                <EligibilityQuestionField
                  key={q.askKey}
                  q={q}
                  value={local[q.askKey] ?? ""}
                  onChange={(v) => update(q.askKey, v)}
                />
              ))}
            </div>
          )}

          {ineligible.length > 0 && (
            <div>
              <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                May not match
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ineligible.map((t) => {
                  const key = `${t.system}::${t.externalId}`;
                  const isOpen = openWhy === key;
                  return (
                    <div key={key} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenWhy(isOpen ? null : key)}
                        className="inline-flex items-center gap-1.5 rounded-full border-2 border-on-error-container bg-error-container/30 px-3 py-1 text-label-sm text-on-surface"
                      >
                        {t.name} · Why?
                      </button>
                      {isOpen && (
                        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border-2 border-on-surface bg-surface p-3 qc-hard-shadow-sm">
                          <ul className="space-y-2">
                            {t.blockers.map((b, i) => (
                              <li key={i} className="text-body-sm text-on-surface">
                                <p>{b.label}</p>
                                {b.evidenceUrl && (
                                  <a
                                    href={b.evidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-0.5 inline-flex items-center gap-1 text-label-sm text-primary underline underline-offset-2"
                                  >
                                    Source <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EligibilityQuestionField({
  q,
  value,
  onChange,
}: {
  q: EligQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-on-surface/15 bg-surface p-4">
      <label className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
        {q.label}
      </label>
      <div className="mt-3">
        {q.kind === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">Select…</option>
            {(q.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : q.kind === "boolean" ? (
          <div className="flex gap-2">
            {["yes", "no"].map((opt) => {
              const on = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`rounded-md border-2 px-3 py-1.5 text-label-sm capitalize ${on ? "border-on-surface bg-primary text-white" : "border-on-surface/25 bg-surface text-on-surface"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type={q.kind === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border-2 border-on-surface/20 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
