import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Bug,
  HelpCircle,
  Lightbulb,
  Heart,
  MessageSquare,
  ImagePlus,
  X,
  Check,
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
} from "lucide-react";

const SUPPORT_EMAIL = "feedback@questcampus.space";
const SUPPORT_PHONE_DISPLAY = "+7 777 270 11 33";
const SUPPORT_PHONE_TEL = "+77772701133";
import { api } from "@/convex/_generated/api";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth/useAuth";
import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";

type FeedbackSearch = { source?: string; category?: string };

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Send feedback — QuestCampus" }] }),
  validateSearch: (s: Record<string, unknown>): FeedbackSearch => ({
    source: typeof s.source === "string" ? s.source : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  component: FeedbackPage,
});

type Category = "bug" | "confusing" | "feature" | "praise" | "other";
type Severity = "minor" | "annoying" | "blocking";

const CATEGORIES: {
  key: Category;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "bug", label: "Bug", hint: "Something's broken", icon: Bug },
  { key: "confusing", label: "Confusing", hint: "I'm stuck or lost", icon: HelpCircle },
  { key: "feature", label: "Idea", hint: "I wish it could…", icon: Lightbulb },
  { key: "praise", label: "Praise", hint: "Something you love", icon: Heart },
  { key: "other", label: "Other", hint: "Anything else", icon: MessageSquare },
];

const SEVERITIES: { key: Severity; label: string }[] = [
  { key: "minor", label: "Minor annoyance" },
  { key: "annoying", label: "Slows me down" },
  { key: "blocking", label: "Blocks me completely" },
];

const PLACEHOLDER: Record<Category, string> = {
  bug: "What happened, and what did you expect instead? What were you trying to do?",
  confusing: "What were you trying to do, and where did it get confusing?",
  feature: "What would you like to be able to do? What problem would it solve for you?",
  praise: "What's working well for you? We'd love to hear it.",
  other: "Tell us what's on your mind.",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB client cap

function FeedbackPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const { user } = useAuth();

  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl);
  const submit = useMutation(api.feedback.submit);

  const [category, setCategory] = useState<Category | null>(
    (["bug", "confusing", "feature", "praise", "other"] as const).includes(
      search.category as Category,
    )
      ? (search.category as Category)
      : null,
  );
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill contact email once auth resolves.
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // The page the user came from — captured for the report so we know where the
  // issue happened without asking.
  const cameFromRef = useRef<string>("");
  useEffect(() => {
    if (typeof document !== "undefined") {
      const ref = document.referrer;
      try {
        cameFromRef.current = ref ? new URL(ref).pathname : "";
      } catch {
        cameFromRef.current = "";
      }
    }
  }, []);

  const attachFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please attach an image file.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("That image is over 8 MB — try a smaller screenshot.");
      return;
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setFile(f);
  }, []);

  const clearFile = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Paste-to-attach: a screenshot on the clipboard drops straight in.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const f = item?.getAsFile();
      if (f) {
        attachFile(f);
        toast.success("Screenshot attached from clipboard.");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attachFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSubmit = !!category && message.trim().length >= 2 && !submitting;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!category || message.trim().length < 2) return;
      setSubmitting(true);
      try {
        const token = auth.getSession()?.token;
        const sessionId = getSessionId();

        // Upload the screenshot first (optional).
        let screenshotStorageId: string | undefined;
        if (file) {
          const postUrl = await generateUploadUrl({ token, sessionId });
          const res = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error("upload failed");
          const json = (await res.json()) as { storageId: string };
          screenshotStorageId = json.storageId;
        }

        await submit({
          token,
          sessionId,
          category,
          message: message.trim(),
          severity: category === "bug" && severity ? severity : undefined,
          email: email.trim() || undefined,
          page: cameFromRef.current || undefined,
          source: search.source === "chatbot" ? "chatbot" : "sidebar",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
          screenshotStorageId: screenshotStorageId as never,
        });
        setDone(true);
      } catch (err) {
        toast.error(
          err instanceof Error && /recently/.test(err.message)
            ? err.message
            : "Couldn't send that — please try again in a moment.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [category, message, severity, email, file, generateUploadUrl, submit, search.source],
  );

  return (
    <DashboardShell>
      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <button
          type="button"
          onClick={() => router.history.back()}
          className="mb-5 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {done ? (
          <SuccessCard
            onAnother={() => {
              setDone(false);
              setCategory(null);
              setSeverity(null);
              setMessage("");
              clearFile();
            }}
            onHome={() => router.navigate({ to: "/dashboard" })}
          />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="font-display text-headline-md font-bold text-on-surface">
                Send feedback
              </h1>
              <p className="mt-1.5 text-body-md text-on-surface-variant">
                Found a bug or have an idea? Tell us — a real person reads every message, and it
                shapes what we build next.
              </p>
            </header>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Category */}
              <fieldset>
                <legend className="mb-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface">
                  What's this about?
                </legend>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        aria-pressed={active}
                        className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors ${
                          active
                            ? "border-primary/30 bg-primary-fixed/70 text-primary"
                            : "border-on-surface/10 bg-surface-container-lowest text-on-surface hover:bg-on-surface/5"
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-lg ${
                            active
                              ? "bg-primary-fixed text-on-primary-fixed-variant"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="mt-0.5 font-[var(--font-label)] text-label-md font-bold">
                          {c.label}
                        </span>
                        <span className="text-label-sm text-on-surface-variant">{c.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Severity — only for bugs */}
              {category === "bug" && (
                <fieldset>
                  <legend className="mb-2.5 font-[var(--font-label)] text-label-md font-bold text-on-surface">
                    How much does it get in your way?
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {SEVERITIES.map((s) => {
                      const active = severity === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setSeverity(active ? null : s.key)}
                          aria-pressed={active}
                          className={`rounded-full px-3.5 py-1.5 font-[var(--font-label)] text-label-sm font-semibold transition-colors ${
                            active
                              ? "bg-primary-fixed/70 text-primary"
                              : "border border-on-surface/15 bg-surface text-on-surface hover:bg-on-surface/5"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Details */}
              <div>
                <label
                  htmlFor="fb-message"
                  className="mb-2 block font-[var(--font-label)] text-label-md font-bold text-on-surface"
                >
                  Tell us more
                </label>
                <textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
                  rows={5}
                  placeholder={category ? PLACEHOLDER[category] : "Tell us what's on your mind."}
                  className="w-full resize-y rounded-2xl border border-on-surface/15 bg-surface-container-lowest px-3.5 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-right text-label-sm text-on-surface-variant/70">
                  {message.length}/5000
                </p>
              </div>

              {/* Screenshot */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-[var(--font-label)] text-label-md font-bold text-on-surface">
                    Screenshot
                  </span>
                  <span className="font-[var(--font-label)] text-label-sm font-semibold text-tertiary">
                    Optional · highly recommended
                  </span>
                </div>
                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-on-surface/10 qc-soft-shadow">
                    <img
                      src={previewUrl}
                      alt="Attached screenshot preview"
                      className="max-h-72 w-full object-contain bg-on-surface/[0.03]"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label="Remove screenshot"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      attachFile(e.dataTransfer.files?.[0] ?? null);
                    }}
                    className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-7 text-center transition-colors ${
                      dragOver
                        ? "border-primary/40 bg-primary-fixed/40"
                        : "border-on-surface/20 bg-surface-container-lowest hover:bg-on-surface/[0.03]"
                    }`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-container text-on-surface-variant">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <span className="mt-0.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface">
                      Add a screenshot
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      Click, drag an image in, or paste from your clipboard
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => attachFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Contact */}
              <div>
                <label
                  htmlFor="fb-email"
                  className="mb-2 block font-[var(--font-label)] text-label-md font-bold text-on-surface"
                >
                  Your email{" "}
                  <span className="font-normal text-on-surface-variant">
                    (so we can follow up)
                  </span>
                </label>
                <input
                  id="fb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-on-surface/15 bg-surface-container-lowest px-3.5 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send feedback"
                  )}
                </button>
              </div>
            </form>

            <ContactStrip />
          </>
        )}
      </main>
    </DashboardShell>
  );
}

function ContactStrip() {
  return (
    <div className="mt-8 rounded-2xl border border-on-surface/8 bg-surface-container/50 p-4">
      <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
        Prefer to reach us directly
      </p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface hover:underline"
        >
          <Mail className="h-4 w-4 shrink-0 text-on-surface-variant" />
          {SUPPORT_EMAIL}
        </a>
        <a
          href={`tel:${SUPPORT_PHONE_TEL}`}
          className="inline-flex items-center gap-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface hover:underline"
        >
          <Phone className="h-4 w-4 shrink-0 text-on-surface-variant" />
          {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}

function SuccessCard({ onAnother, onHome }: { onAnother: () => void; onHome: () => void }) {
  return (
    <div className="rounded-2xl border border-on-surface/8 bg-surface-container-lowest p-8 text-center qc-soft-shadow">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed-variant">
        <Check className="h-7 w-7" />
      </span>
      <h2 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
        Thank you — we got it
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-body-md text-on-surface-variant">
        A real person reads every message. If you left your email and it needs a reply, we'll get
        back to you.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="rounded-lg bg-primary px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
        >
          Back to dashboard
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          Send another
        </button>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-on-surface/8 pt-5 text-label-md text-on-surface-variant">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 font-semibold hover:text-on-surface hover:underline">
          <Mail className="h-4 w-4 shrink-0" /> {SUPPORT_EMAIL}
        </a>
        <a href={`tel:${SUPPORT_PHONE_TEL}`} className="inline-flex items-center gap-2 font-semibold hover:text-on-surface hover:underline">
          <Phone className="h-4 w-4 shrink-0" /> {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}
