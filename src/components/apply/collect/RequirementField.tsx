"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Upload, FileText, Loader2 } from "lucide-react";
import type { IntakeItem } from "@/lib/apply/intake";
import { useApplicationDocuments, type DocType } from "@/lib/applyQueue/client";

type Props = {
  item: IntakeItem;
  /** Called for field/essay only (kind !== document/video). Value is always a string. */
  onChange: (value: string) => void;
};

function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function IntakeItemField({ item, onChange }: Props) {
  const [value, setValue] = useState<string>(item.value ?? "");

  useEffect(() => {
    setValue(item.value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.conceptKey, item.key]);

  function update(v: string) {
    setValue(v);
    onChange(v);
  }

  const answered = item.answered || (value?.trim().length ?? 0) > 0;
  const askedBy =
    item.targetNames.length === 0
      ? null
      : item.targetNames.length <= 2
        ? `Asked by ${item.targetNames.join(", ")}`
        : `Asked by ${item.targetNames.slice(0, 1).join(", ")} +${item.targetNames.length - 1}`;

  return (
    <div className="rounded-xl border border-on-surface/8 bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
            {item.label}
            {item.required && <span className="ml-1 text-primary">*</span>}
          </label>
          {askedBy && (
            <p className="mt-0.5 text-label-sm text-on-surface-variant">{askedBy}</p>
          )}
        </div>
        {answered && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-tertiary-fixed px-2 py-0.5 text-label-sm text-on-tertiary-fixed-variant">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      {item.kind === "document" || item.kind === "video" ? (
        <DocumentUploadSlot item={item} />
      ) : item.kind === "essay" ? (
        <EssayInput item={item} value={value} onChange={update} />
      ) : item.type === "select" ? (
        <select
          value={value}
          onChange={(e) => update(e.target.value)}
          className="mt-3 w-full rounded-lg border border-on-surface/15 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">Select…</option>
          {(item.enumOptions ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : item.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => update(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-on-surface/15 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          type={item.type === "date" ? "date" : item.type === "number" ? "number" : item.type === "email" ? "email" : item.type === "tel" ? "tel" : "text"}
          value={value}
          onChange={(e) => update(e.target.value)}
          className="mt-3 w-full rounded-lg border border-on-surface/15 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
}

function EssayInput({ item, value, onChange }: { item: IntakeItem; value: string; onChange: (v: string) => void }) {
  const wc = wordCount(value);
  const over = item.wordLimit ? wc > item.wordLimit : false;
  return (
    <>
      {item.prompt && (
        <p className="mt-2 rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
          {item.prompt}
        </p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-3 w-full rounded-lg border border-on-surface/15 bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
      />
      {item.wordLimit && (
        <p className={`mt-1 text-label-sm ${over ? "text-on-error-container" : "text-on-surface-variant"}`}>
          {wc} / {item.wordLimit} words
        </p>
      )}
    </>
  );
}

function DocumentUploadSlot({ item }: { item: IntakeItem }) {
  const { docs, upload, getDownloadUrl, remove } = useApplicationDocuments();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const docType = (item.docType ?? "other") as DocType;
  const existing = (docs ?? []).find((d) => d.docType === docType);
  // A row can exist without bytes (an upload that didn't finish). `hasFile`
  // false ⇒ show a re-upload warning, not the green "saved" state. `undefined`
  // (older cached payloads) is treated as fine, exactly as before.
  const missingBytes = existing?.hasFile === false;

  async function onPick(file: File | null | undefined) {
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

  async function viewFile() {
    if (!existing) return;
    setError(null);
    try {
      const url = await getDownloadUrl(existing.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setError("File is no longer available.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open file");
    }
  }

  async function removeFile() {
    if (!existing) return;
    if (!confirm(`Remove ${existing.fileName}?`)) return;
    setError(null);
    try {
      await remove(existing.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  return (
    <div className="mt-3">
      {existing && missingBytes ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary-fixed/40 px-3 py-2">
          <FileText className="h-4 w-4 text-on-surface-variant" />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-on-surface">Needs re-upload</p>
            <p className="text-label-sm text-on-surface-variant">
              The file didn&rsquo;t finish uploading — add it again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={removeFile}
            className="text-label-sm text-on-error-container underline underline-offset-2 hover:opacity-80"
          >
            Remove
          </button>
        </div>
      ) : existing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-tertiary-fixed/30 px-3 py-2">
          <FileText className="h-4 w-4 text-on-surface" />
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">{existing.fileName}</span>
          <button
            type="button"
            onClick={viewFile}
            className="text-label-sm font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-label-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={removeFile}
            className="text-label-sm text-on-error-container underline underline-offset-2 hover:opacity-80"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-on-surface/20 bg-surface px-3 py-3 font-[var(--font-label)] text-label-md text-on-surface transition-colors hover:bg-on-surface/5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : `Upload ${item.label.toLowerCase()}`}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-label-sm text-on-error-container">{error}</p>}
    </div>
  );
}
