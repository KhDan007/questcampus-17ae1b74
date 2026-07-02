"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Trash2, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useApplicationDocuments, type DocType, type ApplicationDocument } from "@/lib/applyQueue/client";

const DOC_TYPES: { value: DocType; label: string; hint: string }[] = [
  { value: "transcript", label: "Transcript", hint: "Latest official transcript (PDF)" },
  { value: "personal_statement", label: "Personal statement", hint: "Your main essay" },
  { value: "recommendation", label: "Recommendation letter", hint: "One per recommender" },
  { value: "passport", label: "Passport / ID", hint: "Photo page (PDF or image)" },
  { value: "resume", label: "Resume / CV", hint: "Activities, awards, experience" },
  { value: "other", label: "Other", hint: "Anything else portals may ask for" },
];

function fmtBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentManager() {
  const { docs, upload, remove, getDownloadUrl } = useApplicationDocuments();
  const [busy, setBusy] = useState<DocType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byType = new Map<string, ApplicationDocument[]>();
  for (const d of docs ?? []) {
    const list = byType.get(d.docType) ?? [];
    list.push(d);
    byType.set(d.docType, list);
  }

  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface/90 p-5 backdrop-blur-md qc-hard-shadow sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            Application documents
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Upload once — the agent reuses these across every portal.
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border-2 border-on-surface bg-surface px-3 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm sm:inline-flex">
          {docs?.length ?? 0} files
        </span>
      </header>

      {error && (
        <p className="mt-3 rounded-md border border-error/40 bg-error-container/40 px-3 py-2 text-label-sm text-on-error-container">
          {error}
        </p>
      )}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {DOC_TYPES.map((t) => {
          const list = byType.get(t.value) ?? [];
          const isBusy = busy === t.value;
          return (
            <li
              key={t.value}
              className="flex flex-col rounded-xl border-2 border-on-surface/15 bg-surface-container-lowest p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-label-lg font-bold text-on-surface">{t.label}</p>
                  <p className="text-label-sm text-on-surface-variant">{t.hint}</p>
                </div>
                {list.length > 0 && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-tertiary" aria-hidden />
                )}
              </div>

              <ul className="mt-2 space-y-1.5">
                {list.map((d) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    onRemove={async () => {
                      await remove(d.id);
                    }}
                    onDownload={async () => {
                      const url = await getDownloadUrl(d.id);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  />
                ))}
              </ul>

              <UploadButton
                busy={isBusy}
                hasExisting={list.length > 0}
                onSelect={async (file) => {
                  setError(null);
                  setBusy(t.value);
                  try {
                    await upload(file, t.value);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Upload failed");
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DocRow({
  doc,
  onRemove,
  onDownload,
}: {
  doc: ApplicationDocument;
  onRemove: () => Promise<void>;
  onDownload: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const hasFile = doc.hasFile !== false; // default true if backend omits
  return (
    <li className="flex items-center gap-2 rounded-md border border-on-surface/10 bg-surface px-2.5 py-1.5">
      <FileText className="h-4 w-4 shrink-0 text-on-surface/60" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-md text-on-surface">{doc.fileName}</p>
        <p className="text-label-sm text-on-surface-variant">
          {doc.size ? fmtBytes(doc.size) : ""}
          {!hasFile ? (doc.size ? " · " : "") + "Uploading…" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={!hasFile}
        title={hasFile ? "Download" : "File not yet available"}
        className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={working}
        onClick={async () => {
          setWorking(true);
          try {
            await onRemove();
          } finally {
            setWorking(false);
          }
        }}
        className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
        aria-label="Remove"
      >
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}

function UploadButton({
  busy,
  hasExisting,
  onSelect,
}: {
  busy: boolean;
  hasExisting?: boolean;
  onSelect: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          if (file) await onSelect(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" /> {hasExisting ? "Replace file" : "Upload file"}
          </>
        )}
      </button>
      {hasExisting && !busy && (
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Uploading a new file replaces the existing one.
        </p>
      )}
    </>
  );
}
