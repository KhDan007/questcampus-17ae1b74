"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/common/Markdown";
import { useGuides, useExplainItem, type Guide } from "@/lib/apply/guidance";
import { useCreateDocument } from "@/lib/documents";
import {
  useApplicationDocuments,
  type DocType,
} from "@/lib/applyQueue/client";
import type { PlanTask } from "@/lib/apply/plan";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: PlanTask;
  system: string;
  externalId: string;
  onDone?: () => void | Promise<void>;
};

export function TaskGuideDialog({
  open,
  onOpenChange,
  task,
  system,
  externalId,
  onDone,
}: Props) {
  const navigate = useNavigate();
  const createDoc = useCreateDocument();

  const guideItems = useMemo(
    () => [
      {
        kind: task.kind,
        docType: task.docType ?? null,
        conceptKey: task.conceptKey ?? null,
        label: task.title,
      },
    ],
    [task.kind, task.docType, task.conceptKey, task.title],
  );
  const guideRows = useGuides(open ? guideItems : []);
  const guide: Guide | null = guideRows?.[0]?.guide ?? null;
  const guideLoading = open && guideRows === undefined;

  const explain = useExplainItem();
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  async function ask() {
    setAsking(true);
    setAskError(null);
    try {
      const res = await explain({
        system,
        externalId,
        kind: task.kind,
        docType: task.docType ?? null,
        conceptKey: task.conceptKey ?? null,
        label: task.title,
        prompt: task.detail ?? null,
      });
      setAnswer(res.answer ?? "");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "Couldn't reach AI");
    } finally {
      setAsking(false);
    }
  }

  const [creating, setCreating] = useState(false);
  async function openWriteEditor() {
    if (task.kind === "essay" || task.editor === "essay") {
      void navigate({
        to: "/essay",
        search: {
          system,
          externalId,
          ...(task.conceptKey ? { conceptKey: task.conceptKey } : {}),
          ...(task.detail ? { prompt: task.detail } : {}),
          ...(task.wordLimit ? { wordLimit: task.wordLimit } : {}),
        },
      });
      return;
    }
    setCreating(true);
    try {
      const id = await createDoc({
        docKind: task.editorKind ?? task.docType ?? "other",
        system,
        externalId,
      });
      void navigate({ to: "/documents/$id", params: { id } });
    } finally {
      setCreating(false);
    }
  }

  const showWriteHere =
    task.editor === "essay" ||
    task.editor === "document" ||
    task.kind === "essay";
  const showUpload = !!task.upload || task.kind === "document";
  const showProfileLink = task.kind === "profile" && !showWriteHere && !showUpload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-on-surface bg-surface-container-lowest qc-hard-shadow">
        <DialogHeader>
          <DialogTitle className="font-display text-headline-sm font-bold text-on-surface">
            {task.title}
          </DialogTitle>
          {task.detail && (
            <DialogDescription className="text-body-sm text-on-surface-variant">
              {task.detail}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Guide */}
        <section className="mt-2">
          {guideLoading ? (
            <div className="flex items-center gap-2 rounded-lg border-2 border-on-surface/15 bg-surface p-4 text-body-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading step-by-step guide…
            </div>
          ) : guide ? (
            <GuideBody guide={guide} />
          ) : (
            <div className="rounded-lg border-2 border-on-surface/15 bg-surface p-4 text-body-sm text-on-surface-variant">
              We don&apos;t have a curated guide yet — ask the AI helper below for
              a personalized walkthrough.
            </div>
          )}
        </section>

        {/* AI helper */}
        <section className="mt-3">
          <button
            type="button"
            onClick={ask}
            disabled={asking}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:border-on-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {asking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            {answer ? "Ask AI again" : "Ask AI to explain further"}
          </button>
          {answer && (
            <div className="mt-2 rounded-lg border-2 border-secondary/60 bg-secondary/10 p-3">
              <div className="flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface">
                <Sparkles className="h-3.5 w-3.5" /> AI helper
              </div>
              <div className="mt-1">
                <Markdown>{answer}</Markdown>
              </div>
            </div>
          )}
          {askError && (
            <p className="mt-2 rounded-md border-2 border-error/40 bg-error/10 px-2 py-1 text-label-sm text-on-error-container">
              {askError}
            </p>
          )}
        </section>

        {/* Actions */}
        <section className="mt-4 border-t-2 border-on-surface/10 pt-4">
          <p className="mb-2 font-[var(--font-label)] text-label-sm uppercase tracking-[0.14em] text-on-surface-variant">
            Do it now
          </p>
          <div className="flex flex-col gap-3">
            {showUpload && (
              <UploadInline
                docType={(task.docType ?? "other") as DocType}
                label={task.title}
                onUploaded={() => void onDone?.()}
              />
            )}
            {showWriteHere && (
              <button
                type="button"
                onClick={() => void openWriteEditor()}
                disabled={creating}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                Write it here
              </button>
            )}
            {showProfileLink && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/apply" })}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                <ExternalLink className="h-4 w-4" />
                Open profile step
              </button>
            )}
            {onDone && (
              <button
                type="button"
                onClick={() => {
                  void onDone();
                  onOpenChange(false);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface/25 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface hover:border-on-surface"
              >
                <CheckCircle2 className="h-4 w-4 text-tertiary" />
                {task.done ? "Mark not done" : "Mark done"}
              </button>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function GuideBody({ guide }: { guide: Guide }) {
  return (
    <div className="rounded-lg border-2 border-on-surface/15 bg-surface p-4">
      <p className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold uppercase tracking-wide text-on-surface">
        <BookOpen className="h-3.5 w-3.5" /> How to get this
        {guide.timeEstimate && (
          <span className="inline-flex items-center gap-1 rounded-md border border-on-surface/15 px-1.5 py-0.5 text-label-sm text-on-surface-variant">
            <Clock className="h-3 w-3" />
            {guide.timeEstimate}
          </span>
        )}
      </p>
      {guide.whatItIs && (
        <p className="mt-2 text-body-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">What it is: </span>
          {guide.whatItIs}
        </p>
      )}
      {guide.whereExactly && (
        <p className="mt-1 text-body-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">Where: </span>
          {guide.whereExactly}
        </p>
      )}
      {Array.isArray(guide.howToGet) && guide.howToGet.length > 0 && (
        <>
          <p className="mt-3 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
            Step by step
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-body-sm text-on-surface">
            {guide.howToGet.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </>
      )}
      {guide.format && (
        <p className="mt-3 text-label-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">Format: </span>
          {guide.format}
        </p>
      )}
      {Array.isArray(guide.tips) && guide.tips.length > 0 && (
        <div className="mt-3">
          <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
            Tips
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-label-sm text-on-surface-variant">
            {guide.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(guide.commonMistakes) && guide.commonMistakes.length > 0 && (
        <div className="mt-3">
          <p className="inline-flex items-center gap-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
            <AlertTriangle className="h-3.5 w-3.5 text-error" />
            Common mistakes
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-label-sm text-on-surface-variant">
            {guide.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadInline({
  docType,
  label,
  onUploaded,
}: {
  docType: DocType;
  label: string;
  onUploaded?: () => void;
}) {
  const { docs, upload } = useApplicationDocuments();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (docs ?? []).find((d) => d.docType === docType);

  async function onPick(file: File | null | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await upload(file, docType);
      onUploaded?.();
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
          <FileText className="h-4 w-4 text-on-surface" />
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
            {existing.fileName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/25 px-2 py-0.5 text-label-sm text-on-surface">
            <Check className="h-3 w-3" /> Saved
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
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-on-surface/30 bg-surface px-3 py-4 font-[var(--font-label)] text-label-md text-on-surface hover:border-on-surface hover:bg-primary/5 disabled:opacity-60"
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
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-1 text-label-sm text-on-error-container">{error}</p>
      )}
    </div>
  );
}
