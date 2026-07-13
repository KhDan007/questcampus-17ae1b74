import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Wand2,
  Sparkles,
  Copy,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  countWords,
  isEssayKind,
  useDocument,
  useGenerateDoc,
  useImproveDoc,
  useSaveDocument,
  type ImproveGoal,
} from "@/lib/documents";

export const Route = createFileRoute("/documents/$id")({
  head: () => ({ meta: [{ title: "Document — QuestCampus" }] }),
  component: DocumentEditorPage,
});

function DocumentEditorPage() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const { isAuthenticated, isHydrated } = useAuth();
  const navigate = useNavigate();
  const doc = useDocument(id);
  const { save, flushNow } = useSaveDocument(600);
  const generate = useGenerateDoc();
  const improve = useImproveDoc();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [improveBusy, setImproveBusy] = useState<ImproveGoal | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    if (hydratedId === doc.id) return;
    setTitle(doc.title ?? "");
    setContent(doc.content ?? "");
    setHydratedId(doc.id);
  }, [doc, hydratedId]);

  useEffect(() => {
    return () => {
      void flushNow(id);
    };
  }, [id, flushNow]);

  if (!isHydrated) {
    return (
      <DashboardShell>
        <main className="relative mx-auto max-w-(--container-content) px-6 py-10">
          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading document...
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: `/documents/${id}` } as never} />;
  }
  if (doc === undefined) {
    return (
      <DashboardShell>
        <main className="relative mx-auto max-w-(--container-content) px-6 py-10">
          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading document…
          </div>
        </main>
      </DashboardShell>
    );
  }

  const spec = doc.spec;
  const essay = isEssayKind(doc.docKind);
  const words = countWords(content);
  const chars = content.length;
  const violations = doc.format?.violations ?? [];
  const ok = doc.format?.ok ?? true;

  const overWords = spec.maxWords != null && words > spec.maxWords;
  const underWords = spec.minWords != null && words < spec.minWords;
  const overChars = spec.maxChars != null && chars > spec.maxChars;

  function onTitleChange(v: string) {
    setTitle(v);
    save(id, content, v);
  }
  function onContentChange(v: string) {
    setContent(v);
    save(id, v, title);
  }

  async function runGenerate() {
    if (genBusy) return;
    setGenBusy(true);
    try {
      await flushNow(id);
      const res = await generate(id, notes || undefined);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setContent(res.content);
        save(id, res.content, title);
        toast.success("Draft ready");
      }
    } finally {
      setGenBusy(false);
    }
  }

  async function runImprove(goal: ImproveGoal) {
    if (improveBusy) return;
    setImproveBusy(goal);
    try {
      await flushNow(id);
      const res = await improve(id, goal);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setContent(res.content);
        save(id, res.content, title);
        toast.success("Updated");
      }
    } finally {
      setImproveBusy(null);
    }
  }

  async function copyText() {
    const fmt = doc?.format;
    const text =
      (fmt && "formatted" in fmt ? fmt.formatted : null) ?? content;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste into the portal");
    } catch {
      toast.error("Copy failed");
    }
  }

  function printDoc() {
    window.print();
  }

  return (
    <DashboardShell>
      <main className="relative mx-auto w-full max-w-(--container-content) px-5 py-8 sm:px-8 lg:px-12 print:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: "/documents" })}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> All documents
        </button>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT — writing */}
          <section className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow sm:p-6">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled"
              className="w-full border-none bg-transparent font-display text-headline-sm font-bold text-on-surface placeholder:text-on-surface/40 focus:outline-none"
            />
            <p className="mt-1 text-label-sm text-on-surface-variant">{spec.rule}</p>

            {essay ? (
              <div className="mt-6 rounded-xl border border-on-surface/10 bg-surface-container/50 p-5 text-center">
                <h3 className="font-display text-title-md font-bold text-on-surface">
                  Essays live in the Essay Assistant
                </h3>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Personal statements and supplemental essays have their own workspace.
                </p>
                <Link
                  to="/essay"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                >
                  Open Essay Assistant <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                {doc.docKind === "activities" && (
                  <p className="mt-4 rounded-md border border-on-surface/15 bg-surface-container-lowest px-3 py-2 text-label-sm text-on-surface-variant">
                    One activity per line
                    {spec.perItemMaxChars ? t("audit.documents.charLimit", { count: spec.perItemMaxChars }) : ""}.
                  </p>
                )}
                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  spellCheck
                  placeholder="Start writing…"
                  className="mt-4 min-h-[50vh] w-full resize-y rounded-xl border border-on-surface/15 bg-surface-container/40 p-4 font-[var(--font-body)] text-body-md leading-relaxed text-on-surface focus:border-on-surface/30 focus:outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm">
                  <CounterRow
                    words={words}
                    chars={chars}
                    maxWords={spec.maxWords}
                    minWords={spec.minWords}
                    maxChars={spec.maxChars}
                    count={spec.count}
                    overWords={overWords}
                    underWords={underWords}
                    overChars={overChars}
                  />
                  <FormatStatus ok={ok} violations={violations} label={spec.label} />
                </div>
              </>
            )}
          </section>

          {/* RIGHT — assist */}
          {!essay && (
            <aside className="flex flex-col gap-5">
              <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow">
                <h3 className="flex items-center gap-2 font-display text-title-sm font-bold text-on-surface">
                  <Wand2 className="h-4 w-4 text-primary" /> Draft with AI
                </h3>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Give a nudge — the AI will draft a version matching this format.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything to include? (optional)"
                  className="mt-2 w-full resize-y rounded-lg border border-on-surface/15 bg-surface-container/40 p-2.5 text-body-sm text-on-surface focus:border-on-surface/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={runGenerate}
                  disabled={genBusy}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {genBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Draft with AI
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow">
                <h3 className="font-display text-title-sm font-bold text-on-surface">
                  Improve
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["tighten", "Tighten"],
                      ["fix_grammar", "Fix grammar"],
                      ["more_impact", "More impact"],
                      ["match_format", "Match format"],
                      ["professional_tone", "Professional"],
                    ] as [ImproveGoal, string][]
                  ).map(([g, label]) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => runImprove(g)}
                      disabled={improveBusy !== null}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-2.5 py-2 text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {improveBusy === g ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-5 qc-soft-shadow">
                <h3 className="font-display text-title-sm font-bold text-on-surface">
                  Export
                </h3>
                <div className="mt-3">
                  {spec.plainText ? (
                    <button
                      type="button"
                      onClick={copyText}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                    >
                      <Copy className="h-4 w-4" /> Copy text
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={printDoc}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                    >
                      <Printer className="h-4 w-4" /> Print / Save as PDF
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-on-surface/8 bg-surface-container/50 p-4">
                <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                  Format rule
                </p>
                <p className="mt-1 text-body-sm text-on-surface">{spec.rule}</p>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Print-only view */}
      <PrintView title={title} content={content} />
    </DashboardShell>
  );
}

function CounterRow({
  words,
  chars,
  maxWords,
  minWords,
  maxChars,
  count,
  overWords,
  underWords,
  overChars,
}: {
  words: number;
  chars: number;
  maxWords?: number;
  minWords?: number;
  maxChars?: number;
  count?: number;
  overWords: boolean;
  underWords: boolean;
  overChars: boolean;
}) {
  const bits: React.ReactNode[] = [];
  if (maxWords != null) {
    bits.push(
      <span key="w" className={overWords ? "text-error font-semibold" : "text-on-surface-variant"}>
        {words} / {maxWords} words
      </span>,
    );
  } else if (minWords != null) {
    bits.push(
      <span key="wmin" className={underWords ? "text-error font-semibold" : "text-on-surface-variant"}>
        {words} / min {minWords} words
      </span>,
    );
  } else {
    bits.push(
      <span key="w" className="text-on-surface-variant">
        {words} words
      </span>,
    );
  }
  if (maxChars != null) {
    bits.push(
      <span key="c" className={overChars ? "text-error font-semibold" : "text-on-surface-variant"}>
        {chars} / {maxChars} chars
      </span>,
    );
  }
  if (count != null) {
    bits.push(
      <span key="n" className="text-on-surface-variant">
        target items: {count}
      </span>,
    );
  }
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{bits}</div>;
}

function FormatStatus({
  ok,
  violations,
  label,
}: {
  ok: boolean;
  violations: string[];
  label: string;
}) {
  if (ok)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-tertiary-fixed px-2 py-1 font-semibold text-on-tertiary-fixed-variant">
        <CheckCircle2 className="h-3.5 w-3.5" /> Ready for {label}
      </span>
    );
  return (
    <div className="w-full rounded-md border border-on-surface/8 bg-surface-container/50 px-3 py-2">
      <p className="flex items-center gap-1 font-semibold text-on-surface">
        <AlertTriangle className="h-3.5 w-3.5 text-error" /> Needs fixes
      </p>
      <ul className="mt-1 list-disc pl-5 text-on-surface-variant">
        {violations.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </div>
  );
}

function PrintView({ title, content }: { title: string; content: string }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qc-print-root, .qc-print-root * { visibility: visible !important; }
          .qc-print-root { position: absolute; inset: 0; padding: 0.75in; background: #fff; color: #000; }
          .qc-print-root h1 { font-size: 22pt; margin: 0 0 18pt 0; font-weight: 700; }
          .qc-print-root pre { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
        }
        .qc-print-root { display: none; }
        @media print { .qc-print-root { display: block; } }
      `}</style>
      <div className="qc-print-root">
        <h1>{title || "Untitled"}</h1>
        <pre>{content}</pre>
      </div>
    </>
  );
}
