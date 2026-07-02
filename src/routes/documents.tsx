import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  DOC_KIND_OPTIONS,
  useCreateDocument,
  useDocSpec,
  useDocuments,
  useRemoveDocument,
  type DocKind,
} from "@/lib/documents";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Your documents — QuestCampus" },
      {
        name: "description",
        content:
          "Write your application documents once. QuestCampus auto-formats each one to the portal's exact spec.",
      },
    ],
  }),
  component: DocumentsHubPage,
});

function DocumentsHubPage() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated)
    return <Navigate to="/signin" search={{ redirect: "/documents" } as never} />;

  const docs = useDocuments();
  const remove = useRemoveDocument();
  const [picker, setPicker] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <DashboardShell>
      <LivingBackground />
      <main className="relative mx-auto w-full max-w-(--container-content) px-5 py-10 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-headline-lg font-extrabold text-on-surface">
              Your documents
            </h1>
            <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
              Write here once. We auto-format every document to each portal's exact spec.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-white">
              <Plus className="h-3 w-3" />
            </span>
            New document
          </button>
        </header>

        <section className="mt-8">
          {docs === undefined ? (
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : docs.length === 0 ? (
            <EmptyState onNew={() => setPicker(true)} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((d) => (
                <li key={d.id}>
                  <DocCard
                    doc={d}
                    onRemoveRequest={() => setConfirmId(d.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-10 text-label-sm text-on-surface-variant">
          Writing a personal statement or supplemental essay?{" "}
          <Link to="/essay" className="font-semibold text-on-surface underline underline-offset-4">
            Head to the Essay Assistant
          </Link>
          .
        </p>
      </main>

      {picker && <NewDocPicker onClose={() => setPicker(false)} />}
      {confirmId && (
        <ConfirmDelete
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            const id = confirmId;
            setConfirmId(null);
            try {
              await remove(id);
              toast.success("Document deleted");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Delete failed");
            }
          }}
        />
      )}
    </DashboardShell>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-on-surface/25 bg-surface/60 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-on-surface bg-surface qc-hard-shadow-sm">
        <FileText className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-title-lg font-bold text-on-surface">
        No documents yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-body-sm text-on-surface-variant">
        Start with your resume or a statement of purpose — we'll shape it to fit every portal.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 border-on-surface bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
      >
        <span className="h-2 w-2 rounded-full bg-primary" /> New document
      </button>
    </div>
  );
}

function DocCard({
  doc,
  onRemoveRequest,
}: {
  doc: {
    id: string;
    docKind: string;
    title: string;
    targetName?: string;
    wordCount: number;
    ok: boolean;
    updatedAt: number;
  };
  onRemoveRequest: () => void;
}) {
  const kindLabel =
    DOC_KIND_OPTIONS.find((o) => o.kind === doc.docKind)?.label ?? doc.docKind;
  return (
    <div className="group relative flex h-full flex-col rounded-2xl border-2 border-on-surface bg-surface p-4 qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none">
      <Link
        to="/documents/$id"
        params={{ id: doc.id }}
        className="absolute inset-0 z-10"
        aria-label={`Open ${doc.title}`}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            {kindLabel}
          </p>
          <h3 className="mt-1 truncate font-display text-title-md font-bold text-on-surface">
            {doc.title || "Untitled"}
          </h3>
          {doc.targetName && (
            <p className="mt-0.5 truncate text-label-sm text-on-surface-variant">
              for {doc.targetName}
            </p>
          )}
        </div>
        <FormatBadge ok={doc.ok} />
      </div>
      <div className="mt-4 flex items-center justify-between text-label-sm text-on-surface-variant">
        <span>{doc.wordCount} words</span>
        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemoveRequest();
        }}
        className="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-md text-on-surface-variant opacity-0 transition-opacity hover:bg-on-surface/5 hover:text-on-surface group-hover:opacity-100"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function FormatBadge({ ok }: { ok: boolean }) {
  if (ok)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-on-surface/20 bg-surface px-2 py-0.5 text-label-sm text-on-surface">
        <CheckCircle2 className="h-3 w-3 text-tertiary" /> OK
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-on-surface/20 bg-surface px-2 py-0.5 text-label-sm text-on-surface">
      <AlertTriangle className="h-3 w-3 text-error" /> Check
    </span>
  );
}

function ConfirmDelete({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-on-surface bg-surface p-5 qc-hard-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-title-md font-bold text-on-surface">
          Delete this document?
        </h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          This can't be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border-2 border-on-surface/25 bg-surface px-3 py-1.5 text-label-md font-semibold text-on-surface hover:border-on-surface"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md border-2 border-on-surface bg-error px-3 py-1.5 text-label-md font-semibold text-on-error qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function NewDocPicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateDocument();
  const [kind, setKind] = useState<DocKind | null>(null);
  const [targetKey, setTargetKey] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const { saved } = useSavedUniversities();

  const targetsList = useMemo(
    () =>
      (saved ?? []).map((s) => ({
        key: `${s.source}::${s.externalId}`,
        system: s.source,
        externalId: s.externalId,
        name: s.name,
      })),
    [saved],
  );

  async function submit(k: DocKind) {
    if (busy) return;
    setBusy(true);
    try {
      const t = targetsList.find((x) => x.key === targetKey);
      const id = await create({
        docKind: k,
        system: t?.system,
        externalId: t?.externalId,
        targetName: t?.name,
      });
      onClose();
      await navigate({ to: "/documents/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border-2 border-on-surface bg-surface p-6 qc-hard-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-headline-sm font-bold text-on-surface">
              New document
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Pick a document type. Optionally target a saved university so we match its spec.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-on-surface/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {targetsList.length > 0 && (
          <label className="mt-4 block">
            <span className="text-label-sm font-semibold text-on-surface">
              For university (optional)
            </span>
            <select
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-on-surface/25 bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-on-surface focus:outline-none"
            >
              <option value="">General (no specific portal)</option>
              {targetsList.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {DOC_KIND_OPTIONS.map((o) => (
            <li key={o.kind}>
              <KindTile
                kind={o.kind}
                label={o.label}
                system={targetsList.find((t) => t.key === targetKey)?.system}
                selected={kind === o.kind}
                onSelect={() => setKind(o.kind)}
                onPick={() => submit(o.kind)}
                busy={busy && kind === o.kind}
              />
            </li>
          ))}
        </ul>

        <p className="mt-5 text-label-sm text-on-surface-variant">
          Writing an essay?{" "}
          <Link
            to="/essay"
            onClick={onClose}
            className="font-semibold text-on-surface underline underline-offset-4"
          >
            Use the Essay Assistant →
          </Link>
        </p>
      </div>
    </div>
  );
}

function KindTile({
  kind,
  label,
  system,
  selected,
  onSelect,
  onPick,
  busy,
}: {
  kind: DocKind;
  label: string;
  system?: string;
  selected: boolean;
  onSelect: () => void;
  onPick: () => void;
  busy: boolean;
}) {
  const spec = useDocSpec(kind, system);
  return (
    <button
      type="button"
      onClick={() => {
        onSelect();
        onPick();
      }}
      disabled={busy}
      className={`flex h-full w-full flex-col rounded-xl border-2 bg-surface p-4 text-left transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 qc-hard-shadow-sm hover:shadow-none disabled:opacity-70 ${
        selected ? "border-on-surface" : "border-on-surface/25 hover:border-on-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-title-sm font-bold text-on-surface">
          {spec?.label ?? label}
        </span>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
        ) : (
          <ArrowRight className="h-4 w-4 text-on-surface-variant" />
        )}
      </div>
      <p className="mt-1 line-clamp-3 text-label-sm text-on-surface-variant">
        {spec?.rule ?? "Loading spec…"}
      </p>
    </button>
  );
}
