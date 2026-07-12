"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  MessageCircle,
  X,
  Send,
  Plus,
  Sparkles,
  Check,
  Loader2,
  History,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  PanelRightClose,
  Paperclip,
} from "lucide-react";

import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";
import { ASSISTANT_ASK_EVENT } from "@/lib/assistant";
import { Markdown } from "@/components/common/Markdown";
import {
  useChatThreads,
  useThreadMessages,
  useSendChat,
  useSetActionStatus,
  useAgentJobsForThread,
  useStartAgentJob,
  useDeleteThread,
  type ChatAction,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat";
import { AgentJobCard } from "@/components/chat/AgentJobCard";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";

import { useSetAnswer, useAnswerEligibility } from "@/lib/apply/intake";
import { useAutoApplyGate } from "@/lib/apply/autoApplyGate";
import { useApplicationDocuments } from "@/lib/applyQueue/client";
import { useSavedUniversities } from "@/lib/universities/savedClient";
import {
  useChatDock,
  DOCK_RAIL_W,
  DOCK_MIN_W,
  DOCK_MAX_W,
} from "@/lib/chat/ChatDock";
import {
  assistantRouteToastLabel,
  normalizeAssistantRoute,
} from "@/lib/chat/navigationRoutes";
import { userVisibleChatContent } from "@/lib/chat/pageContext";
import { friendlyStepLabels } from "@/lib/chat/stepLabels";

const SUGGESTIONS = [
  "What is my safest next action?",
  "Find scholarship-friendly schools for my profile",
  "What can the extension safely do now?",
];

/** DocTypes the composer's attach picker offers. The backend accepts any
 * docType string on requestUploadTicket, so this list drives only the UI. */
const ATTACH_DOC_TYPES = [
  { value: "resume", label: "Resume" },
  { value: "activities", label: "Activities" },
  { value: "sop", label: "Statement of purpose" },
  { value: "financial", label: "Financial" },
  { value: "transcript", label: "Transcript" },
  { value: "recommendation", label: "Recommendation" },
  { value: "other", label: "Other" },
] as const;

/** A finished attachment the user will reference in their next message. */
type Attachment = { fileName: string; docType: string };

const SKIP_DELETE_CONFIRM_KEY = "qc.chat.skipDeleteConfirm";
const BYPASS_KEY = "qc.chat.bypass";

/** When true, proposed action cards auto-confirm without a human tap. */
export const BypassContext = createContext(false);

export function AssistantSidebar() {
  const { isAuthenticated } = useAuth();
  const { open, setOpen } = useChatDock();
  // A monotonic id makes each ask distinct (repeat asks about the same school
  // still fire; the panel dedups on id so a dev double-invoke can't double-send).
  const [pending, setPending] = useState<{ prompt: string; id: number } | null>(null);
  const askIdRef = useRef(0);

  // Any component can open the assistant with a seeded question (e.g. "Ask AI"
  // on a match card) by dispatching the ASSISTANT_ASK_EVENT window event.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (typeof prompt === "string" && prompt.trim()) {
        askIdRef.current += 1;
        setPending({ prompt: prompt.trim(), id: askIdRef.current });
        setOpen(true);
      }
    };
    window.addEventListener(ASSISTANT_ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASSISTANT_ASK_EVENT, onAsk);
  }, []);

  if (!isAuthenticated) return null;
  return (
    <>
      <Toaster position="bottom-left" richColors />
      <AnimatePresence initial={false}>
        {!open && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open assistant"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-full border border-on-surface/10 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-soft-shadow transition-colors hover:bg-on-surface/5"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <SidebarPanel
            key="panel"
            onClose={() => setOpen(false)}
            initialPrompt={pending}
            onConsumed={() => setPending(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}


function SidebarPanel({
  onClose,
  initialPrompt,
  onConsumed,
}: {
  onClose: () => void;
  initialPrompt?: { prompt: string; id: number } | null;
  onConsumed?: () => void;
}) {
  const { width, collapsed, setCollapsed, setWidth, isDesktop } = useChatDock();
  const threads = useChatThreads();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [forceNew, setForceNew] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const activeThreadId = forceNew ? undefined : (selectedId ?? threads?.[0]?._id);
  const messages = useThreadMessages(activeThreadId);
  const send = useSendChat();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── File attach (composer) ────────────────────────────────────────────────
  const { upload } = useApplicationDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A file chosen but awaiting a docType pick (picker menu open).
  const [pickerFile, setPickerFile] = useState<File | null>(null);
  // In-flight upload label, e.g. "transcript.pdf".
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  // Completed attachment (chip) to reference on the next send.
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    // Reset the input so choosing the same file again re-fires change.
    e.target.value = "";
    if (f) setPickerFile(f);
  }

  async function doUpload(docType: string) {
    const file = pickerFile;
    setPickerFile(null);
    if (!file) return;
    setAttachment(null);
    setUploadingName(file.name);
    try {
      await upload(file, docType as never);
      setAttachment({ fileName: file.name, docType });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingName(null);
    }
  }

  const seededIdRef = useRef<number>(-1);
  const deleteThread = useDeleteThread();
  // Bypass mode (auto-approve action cards). Persisted, OFF by default.
  const [bypass, setBypass] = useState(false);
  const [bypassDialogOpen, setBypassDialogOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setBypass(window.localStorage.getItem(BYPASS_KEY) === "1");
  }, []);

  function enableBypass() {
    setBypass(true);
    setBypassDialogOpen(false);
    if (typeof window !== "undefined") window.localStorage.setItem(BYPASS_KEY, "1");
  }
  function disableBypass() {
    setBypass(false);
    if (typeof window !== "undefined") window.localStorage.setItem(BYPASS_KEY, "0");
  }

  async function removeThread(id: string) {
    try {
      await deleteThread(id);
      // If we just deleted the active thread, fall back to a fresh chat.
      if (id === activeThreadId) newChat();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove chat");
    }
  }

  const { token } = useAuth();
  const credits = useQuery(
    api.agentCredits.credits,
    token ? { token } : "skip",
  ) as { remaining: number; grant: number; resetsAt: number; tier: string } | undefined;


  const latestAssistant = useMemo(
    () => (messages ?? []).slice().reverse().find((m) => m.role === "assistant"),
    [messages],
  );
  const streaming = !!latestAssistant?.streaming;
  const disabled = sending || streaming;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function submit(text: string) {
    const t = text.trim();
    // Allow sending an attachment note with no typed text.
    if ((!t && !attachment) || disabled) return;
    // The upload already wrote to Convex; send a hidden hint so the agent reads it as saved data.
    const outbound = attachment
      ? `[Attached file saved to documents: ${attachment.fileName} as ${attachment.docType}]\n${t}`
      : t;
    setInput("");
    setAttachment(null);
    setSending(true);
    try {
    const res = await send(outbound, activeThreadId);
      setForceNew(false);
      setSelectedId(res.threadId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  // Auto-send a seeded prompt (from an "Ask AI" card action) exactly once per ask.
  useEffect(() => {
    if (initialPrompt && seededIdRef.current !== initialPrompt.id) {
      seededIdRef.current = initialPrompt.id;
      void submit(initialPrompt.prompt);
      onConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  function newChat() {
    setForceNew(true);
    setSelectedId(undefined);
    setHistoryOpen(false);
  }

  function pickThread(id: string) {
    setSelectedId(id);
    setForceNew(false);
    setHistoryOpen(false);
  }


  const showEmpty = !activeThreadId || messages?.length === 0;

  // Drag-to-resize: dragging the left edge leftward widens the dock. setWidth
  // clamps to [DOCK_MIN_W, DOCK_MAX_W]; pointer capture keeps the drag alive
  // even if the cursor briefly leaves the 6px handle.
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  function onResizeDown(e: React.PointerEvent<HTMLDivElement>) {
    resizeRef.current = { startX: e.clientX, startW: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = resizeRef.current;
    if (!s) return;
    setWidth(s.startW + (s.startX - e.clientX));
  }
  function onResizeUp(e: React.PointerEvent<HTMLDivElement>) {
    resizeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const railMode = isDesktop && collapsed;
  const hasMessages = !!messages && messages.length > 0;

  if (railMode) {
    return (
      <motion.aside
        role="complementary"
        aria-label="AI assistant"
        initial={{ x: "100%", opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: DOCK_RAIL_W }}
        className="fixed right-0 top-16 z-[80] flex h-[calc(100dvh-4rem)] flex-col items-center border-l border-on-surface/10 bg-surface qc-soft-shadow sm:transition-[width] sm:duration-200 sm:ease-out"
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand assistant"
          title="Expand assistant"
          className="relative mt-4 grid h-10 w-10 place-items-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4" />
          {(streaming || hasMessages) && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary" />
          )}
        </button>
        {credits && (
          <span
            title={`${credits.remaining} agent credits left (${credits.tier})`}
            className="mt-2 rounded-full bg-primary-fixed/70 px-1.5 py-0.5 text-label-sm font-semibold text-primary"
          >
            {credits.remaining}
          </span>
        )}
      </motion.aside>
    );
  }

  return (
    <motion.aside
      role="complementary"
      aria-label="AI assistant"
      initial={{ x: "100%", opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: isDesktop ? width : undefined }}
      className="fixed inset-0 z-[80] flex h-dvh w-full flex-col border-on-surface/10 bg-surface qc-soft-shadow sm:inset-auto sm:right-0 sm:top-16 sm:h-[calc(100dvh-4rem)] sm:border-l sm:transition-[width] sm:duration-200 sm:ease-out"
    >
      {/* Resize handle (desktop only, expanded only) */}
      <div
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize assistant"
        className="absolute left-0 top-0 z-[1] hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none select-none hover:bg-primary/30 active:bg-primary/60 sm:block"
      />

      {/* Header — @container so labels/credits key off the PANEL width, not the
          viewport (the dock is resizable 320-560px independent of screen size). */}
      <header className="@container flex items-center gap-2 border-b border-on-surface/10 bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-fixed text-on-primary-fixed-variant">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="hidden truncate font-display text-label-md font-bold text-on-surface @[340px]:block">
            Assistant
          </p>
          {credits && (
            <span
              title={
                credits.remaining <= 0
                  ? `Agent credits used — resets ${new Date(credits.resetsAt).toLocaleDateString()}`
                  : `${credits.remaining} of ${credits.grant} left (${credits.tier}) — resets ${new Date(credits.resetsAt).toLocaleDateString()}`
              }
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold ${
                credits.remaining <= 0
                  ? "bg-surface-container text-on-surface-variant"
                  : "bg-primary-fixed/70 text-primary"
              }`}
            >
              <span>{credits.remaining}</span>
              <span className="hidden @[360px]:inline">/ {credits.grant}</span>
              <span className="hidden @[420px]:inline capitalize opacity-70">{credits.tier}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-pressed={historyOpen}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold transition-colors ${
            historyOpen
              ? "bg-primary-fixed/70 text-primary"
              : "border border-on-surface/15 bg-surface text-on-surface hover:bg-on-surface/5"
          }`}
          title="Previous chats"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden @[440px]:inline">
            History
            {threads && threads.length > 0 && (
              <span className="opacity-60"> ({threads.length})</span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={newChat}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-on-surface/15 bg-surface px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
          title="Start a new chat"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden @[440px]:inline">New</span>
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse assistant"
          title="Collapse"
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-md border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5 sm:inline-flex sm:place-items-center"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-surface-container-lowest px-3 py-4"
      >
        {historyOpen ? (
          <HistoryPanel
            threads={threads}
            activeId={activeThreadId}
            onPick={pickThread}
            onNew={newChat}
            onBack={() => setHistoryOpen(false)}
            onRemove={removeThread}
          />
        ) : sending && showEmpty ? (
          <PendingFirstReply />
        ) : showEmpty ? (
          <EmptyState onPick={submit} disabled={disabled} />
        ) : messages === undefined ? (
          <div className="flex items-center justify-center py-8 text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <BypassContext.Provider value={bypass}>
            {messages.map((m) => (
              <MessageRow key={m._id} message={m} activeThreadId={activeThreadId} />
            ))}
            <AgentJobList threadId={activeThreadId} />
          </BypassContext.Provider>
        )}
      </div>



      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
        className="border-t border-on-surface/10 bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onPickFile}
        />

        {/* Attachment status: docType picker → uploading chip → done chip */}
        {pickerFile && (
          <div className="mb-2 rounded-lg border border-on-surface/10 bg-surface-container p-2">
            <p className="mb-1.5 truncate font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
              Attach “{pickerFile.name}” as:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATTACH_DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => void doUpload(d.value)}
                  className="rounded-full border border-on-surface/15 bg-surface px-2.5 py-0.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPickerFile(null)}
                className="rounded-full px-2 py-0.5 font-[var(--font-label)] text-label-sm text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {uploadingName && (
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-on-surface/15 bg-surface px-2.5 py-0.5 text-label-sm text-on-surface-variant">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            <span className="truncate">Uploading {uploadingName}…</span>
          </div>
        )}
        {attachment && !uploadingName && (
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-0.5 text-label-sm font-semibold text-on-secondary-fixed-variant">
            <span className="truncate">
              📎 {attachment.fileName} → {attachment.docType}
            </span>
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setAttachment(null)}
              className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadingName || !!pickerFile}
            aria-label="Attach a file"
            title="Attach a file"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-on-surface/15 bg-surface text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            rows={2}
            placeholder="Ask anything about your applications..."
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-on-surface/15 bg-surface px-2.5 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label={sending || streaming ? "Sending message" : "Send message"}
            disabled={disabled || (!input.trim() && !attachment)}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending || streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (bypass) disableBypass();
              else setBypassDialogOpen(true);
            }}
            aria-pressed={bypass}
            title={
              bypass
                ? "Bypass on - actions run automatically. Tap to turn off."
                : "Turn on bypass - actions run without confirming each time."
            }
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-[var(--font-label)] text-label-sm font-semibold transition-colors ${
              bypass
                ? "bg-primary-fixed/70 text-primary"
                : "border border-on-surface/15 bg-surface text-on-surface-variant hover:bg-on-surface/5"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Bypass
          </button>
        </div>
        {bypass && (
          <p className="mt-1 text-label-sm text-primary">
            Bypass on - actions run automatically.
          </p>
        )}
      </form>

      <ConfirmDialog
        open={bypassDialogOpen}
        title="Turn on bypass mode?"
        body="The assistant will take actions for you — navigate you around the app, fill in fields, save schools, and start applications — WITHOUT asking each time. It can never pay or submit an application. You can turn this off anytime."
        confirmLabel="Turn on bypass"
        destructive
        onCancel={() => setBypassDialogOpen(false)}
        onConfirm={enableBypass}
      />
    </motion.aside>
  );
}

function HistoryPanel({
  threads,
  activeId,
  onPick,
  onNew,
  onBack,
  onRemove,
}: {
  threads: ChatThread[] | undefined;
  activeId?: string;
  onPick: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
  onRemove: (id: string) => void;
}) {
  // Which thread is pending a remove confirmation (null = dialog closed).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function requestRemove(id: string) {
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === "1"
    ) {
      onRemove(id);
      return;
    }
    setConfirmId(id);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-md border border-on-surface/15 bg-surface px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-[var(--font-label)] text-label-sm font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
      </div>
      {threads === undefined ? (
        <div className="flex items-center justify-center py-6 text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : threads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-on-surface/20 bg-surface p-4 text-center text-body-sm text-on-surface-variant">
          No previous chats yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {threads.map((t) => {
            const isActive = t._id === activeId;
            return (
              <li key={t._id}>
                <div
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                    isActive
                      ? "border-transparent bg-primary-fixed/70 text-primary"
                      : "border-on-surface/10 bg-surface text-on-surface hover:bg-on-surface/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPick(t._id)}
                    className="min-w-0 flex-1 px-1 py-0.5 text-left"
                  >
                    <p className="truncate font-[var(--font-label)] text-label-md font-semibold">
                      {t.title?.trim() || "Untitled chat"}
                    </p>
                    <p className="mt-0.5 text-label-sm text-on-surface-variant">
                      {new Date(t.updatedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove chat"
                    title="Remove chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestRemove(t._id);
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-transparent text-on-surface-variant transition-colors hover:bg-error/10 hover:text-on-error-container"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Remove this chat?"
        body="This permanently deletes the conversation."
        confirmLabel="Remove"
        destructive
        showDontAskAgain
        onCancel={() => setConfirmId(null)}
        onConfirm={(dontAskAgain) => {
          const id = confirmId;
          setConfirmId(null);
          if (dontAskAgain && typeof window !== "undefined") {
            window.localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, "1");
          }
          if (id) onRemove(id);
        }}
      />
    </div>
  );
}

/**
 * Context-aware chips derived from the student's saved-schools state.
 * Falls back to the static SUGGESTIONS while state is still loading, so the
 * empty state never renders blank. Kept to 3-4 chips, mobile-safe.
 */
function useQuickActionChips(): string[] {
  const { saved } = useSavedUniversities();
  return useMemo(() => {
    // Still loading — use the static defaults.
    if (saved === undefined) return SUGGESTIONS;
    const chips: string[] = [];
    if (saved.length === 0) {
      chips.push("Recommend schools I should save");
    } else {
      chips.push("What's my safest next action?");
    }
    chips.push("How strong is my app?");
    chips.push("Open my applications");
    chips.push("Draft my activities list");
    return chips.slice(0, 4);
  }, [saved]);
}

function EmptyState({

  onPick,
  disabled,
}: {
  onPick: (t: string) => void;
  disabled: boolean;
}) {
  const chips = useQuickActionChips();
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-on-surface/8 bg-surface-container p-4">
        <p className="font-display text-label-md font-bold text-on-surface">
          Hi - how can I help?
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          I can answer questions about your saved schools, requirements, and next steps - and take
          actions for you when you confirm.
        </p>
      </div>
      <SafetyStrip />
      <div className="space-y-2">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="w-full rounded-lg border border-on-surface/15 bg-surface px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-on-surface/5 disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function SafetyStrip() {
  const rails = [
    "No hidden prompts or tokens",
    "Official-source checks for money and URLs",
    "No auto-submit without confirmation",
  ];
  return (
    <div className="rounded-xl border border-on-surface/8 bg-secondary-fixed/40 p-3">
      <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface/70">
        Guardrails active
      </p>
      <ul className="mt-2 space-y-1">
        {rails.map((rail) => (
          <li key={rail} className="flex items-start gap-2 text-label-sm text-on-surface/80">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{rail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingFirstReply() {
  return (
    <div className="mt-4 rounded-xl border border-on-surface/8 bg-surface-container p-4">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-display text-label-md font-bold text-on-surface">Checking live context</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Reading your application state and safety rails before replying.
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentJobList({ threadId }: { threadId: string | undefined }) {
  const jobs = useAgentJobsForThread(threadId);
  if (!jobs || jobs.length === 0) return null;
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <AgentJobCard key={job._id} job={job} />
      ))}
    </div>
  );
}

function MessageRow({
  message,
  activeThreadId,
}: {
  message: ChatMessage;
  activeThreadId: string | undefined;
}) {
  const isUser = message.role === "user";
  const friendlySteps = isUser ? [] : friendlyStepLabels(message.steps ?? []);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-body-sm ${
          isUser
            ? "bg-on-surface text-surface"
            : "border border-on-surface/8 bg-surface-container text-on-surface"
        }`}
      >
        {isUser ? (
          <p data-i18n-skip="true" className="whitespace-pre-wrap break-words">
            {userVisibleChatContent(message.content)}
          </p>
        ) : (
          <div data-i18n-skip="true" className="break-words">
            {friendlySteps.length ? (
              <p className="mb-1 truncate font-[var(--font-label)] text-label-sm text-on-surface-variant">
                {friendlySteps.join(" · ")}
              </p>
            ) : null}
            <Markdown>{message.content ?? ""}</Markdown>
            {message.streaming && (
              <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-current align-middle" />
            )}
          </div>
        )}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.1em] text-on-surface/60">
              {message.actions.some((a) => a.status === "proposed" && a.tool !== "navigate")
                ? "Proposed action - review before confirming"
                : message.actions.some((a) => a.status === "proposed" && a.tool === "navigate")
                  ? "Opening page"
                  : "Action result"}
            </p>
            {message.actions.map((a) => (
              <ActionCard
                key={a.id}
                messageId={message._id}
                action={a}
                activeThreadId={activeThreadId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  messageId,
  action,
  activeThreadId,
}: {
  messageId: string;
  action: ChatAction;
  activeThreadId: string | undefined;
}) {
  const setStatus = useSetActionStatus();
  const setAnswer = useSetAnswer();
  const answerEligibility = useAnswerEligibility();
  const autoApplyGate = useAutoApplyGate();
  const startAgentJob = useStartAgentJob();
  const navigate = useNavigate();
  const convex = useConvex();
  const { upload } = useApplicationDocuments();
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bypass = useContext(BypassContext);
  const autoRuns = bypass || action.tool === "navigate";

  // Navigation is reversible, so it auto-opens. Bypass still auto-confirms all cards.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRuns && action.status === "proposed" && !busy && !autoRanRef.current) {
      autoRanRef.current = true;
      void confirmAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRuns, action.status]);

  if (action.status !== "proposed") {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${
          action.status === "done"
            ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            : "bg-surface-container text-on-surface-variant"
        }`}
      >
        {action.status === "done" && <Check className="h-3 w-3" />}
        {action.label} - {action.status}
      </div>
    );
  }

  async function dismiss() {
    setBusy(true);
    try {
      await setStatus(messageId, action.id, "dismissed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    setBusy(true);
    setErr(null);
    try {
      const result = await execute(action, {
        setAnswer,
        answerEligibility,
        autoApplyGate,
        navigate,
        startAgentJob,
        activeThreadId,
        convex,
        uploadDocument: upload,
        token,
      });
      await setStatus(messageId, action.id, "done");
      if (result !== "handled") toast.success("Done");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Action failed";
      const msg = friendlyActionError(raw);
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (action.tool === "navigate" && !err) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-[var(--font-label)] text-label-sm text-on-surface-variant">
        <Loader2 className="h-3 w-3 animate-spin" />
        {busy ? "Opening..." : action.label}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-on-surface/10 bg-surface-container p-2">
      <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
        {action.label}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={confirmAction}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Confirm
        </button>
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="rounded-lg border border-on-surface/15 bg-surface px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
      {err && (
        <p className="mt-1 rounded bg-error/10 px-1.5 py-0.5 text-label-sm text-on-error-container">
          {err}
        </p>
      )}
    </div>
  );
}

type Executors = {
  setAnswer: ReturnType<typeof useSetAnswer>;
  answerEligibility: ReturnType<typeof useAnswerEligibility>;
  autoApplyGate: ReturnType<typeof useAutoApplyGate>;
  navigate: ReturnType<typeof useNavigate>;
  startAgentJob: ReturnType<typeof useStartAgentJob>;
  activeThreadId: string | undefined;
  convex: ReturnType<typeof useConvex>;
  uploadDocument: ReturnType<typeof useApplicationDocuments>["upload"];
  token: string | null | undefined;
};

/** Return "handled" when the branch already gave the user specific feedback
 * (a toast, a targeted redirect) so confirmAction skips its generic "Done". */
async function execute(action: ChatAction, ex: Executors): Promise<"handled" | void> {
  const args = (action.args ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
  switch (action.tool) {
    case "answer_field": {
      const conceptKey = str("conceptKey");
      const value = str("value") ?? "";
      if (!conceptKey) throw new Error("Missing conceptKey");
      ex.setAnswer(conceptKey, value);
      return;
    }
    case "answer_eligibility": {
      const askKey = str("askKey");
      const value = str("value") ?? "";
      if (!askKey) throw new Error("Missing askKey");
      ex.answerEligibility(askKey, value);
      return;
    }
    case "start_apply": {
      const system = str("system");
      const externalId = str("externalId");
      if (!system || !externalId) throw new Error("Missing system/externalId");
      // Auto-apply fills happen in the user's own browser via the extension —
      // there's nothing to enqueue server-side. Route to whatever's next.
      switch (ex.autoApplyGate.evaluate()) {
        case "signin_required": {
          const redirect =
            typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
          await ex.navigate({ to: "/signin", search: { redirect } as never });
          return "handled";
        }
        case "extension_required":
          toast.message("You'll need the QuestCampus extension for this — it fills the form from your own browser.");
          await ex.navigate({ to: "/extension", search: { system, externalId } as never });
          return "handled";
        case "profile_incomplete":
          toast.message("Almost there - finish the missing application details first.");
          await ex.navigate({ to: "/apply" });
          return "handled";
        case "ready":
          await ex.navigate({ to: "/application/$system/$externalId", params: { system, externalId } });
          toast.success("Open the extension's side panel here to start filling.");
          return "handled";
      }
      return;
    }
    case "start_agent_job": {
      const goal = str("goal");
      const rawTodos = args.todos;
      const todos = Array.isArray(rawTodos)
        ? rawTodos.filter((t): t is string => typeof t === "string")
        : [];
      if (!goal) throw new Error("Missing goal");
      if (!ex.activeThreadId) throw new Error("No active thread");
      try {
        await ex.startAgentJob(ex.activeThreadId, goal, todos);
        // No navigation — the live job card appears in this thread reactively.
      } catch (e) {
        const raw = e instanceof Error ? e.message : "";
        if (raw.includes("one_at_a_time")) {
          toast.message("One job at a time — the current one is still running.");
          return "handled";
        }
        throw e;
      }
      return "handled";
    }
    case "upload_document": {
      await ex.navigate({ to: "/apply" });
      return;
    }
    case "attach_document": {
      // Agent drafted a document and wants it filed against a docType. Read the
      // draft's text, wrap it in a plain-text File, and run the normal upload
      // pipeline (requestUploadTicket → PUT → record) via useApplicationDocuments.
      const draftId = str("draftId");
      const docType = str("docType") ?? "other";
      if (!draftId) {
        throw new Error("No draft to attach — create the document first.");
      }
      if (!ex.token) throw new Error("Sign in required");
      const draft = (await ex.convex.query(api.documents.get, {
        token: ex.token,
        id: draftId,
      } as never)) as { content?: string; title?: string } | null;
      if (!draft || typeof draft.content !== "string" || !draft.content.trim()) {
        throw new Error("That draft is empty — nothing to attach yet.");
      }
      const safeTitle = (draft.title ?? docType).replace(/[^\w.-]+/g, "_") || docType;
      const fileName = `${safeTitle}.txt`;
      const file = new File([draft.content], fileName, { type: "text/plain" });
      await ex.uploadDocument(file, docType as never);
      toast.success(`Attached ${docType}`);
      return "handled";
    }
    case "navigate": {
      const route = str("route");
      if (!route) throw new Error("Missing route");
      const normalized = normalizeAssistantRoute(route);
      if (!normalized) throw new Error(`Route not allowed: ${route}`);
      toast.message(assistantRouteToastLabel(normalized), {
        action: {
          label: "Open",
          onClick: () => void navigateInternal(normalized, ex.navigate),
        },
      });
      await navigateInternal(normalized, ex.navigate);
      return "handled";
    }
    default:
      throw new Error(`Unknown action: ${action.tool}`);
  }
}

/** Never surface a raw backend error to the user — translate what we
 * recognize, and fall back to a calm, generic nudge for everything else. */
function friendlyActionError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("common app profile")) {
    return "Finish your Common App profile first — a few required answers are still missing.";
  }
  if (msg.includes("not ready") || msg.includes("not_ready") || msg.includes("requirement")) {
    return "This one isn't ready yet — some requirements still need your input.";
  }
  if (msg.includes("paid") || msg.includes("payment") || msg.includes("entitle")) {
    return "This needs your plan to be active first.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Connection hiccup — try that again in a moment.";
  }
  return "Couldn't do that just now — try again in a moment.";
}

async function navigateInternal(
  route: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  const normalized = normalizeAssistantRoute(route);
  if (!normalized) throw new Error(`Route not allowed: ${route}`);
  // Parse query
  const [pathPart, queryPart] = normalized.split("?");
  const search: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) search[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  const segs = pathPart.split("/").filter(Boolean);

  // /application/<system>/<externalId>
  if (segs[0] === "application" && segs[1] && segs[2]) {
    await navigate({
      to: "/application/$system/$externalId",
      params: { system: segs[0 + 1], externalId: segs[2] },
    });
    return;
  }
  // /apply/strength
  if (segs[0] === "apply" && segs[1] === "strength") {
    await navigate({ to: "/apply/strength" as never });
    return;
  }
  // /apply/<jobId>
  if (segs[0] === "apply" && segs[1]) {
    await navigate({ to: "/apply/$jobId", params: { jobId: segs[1] } });
    return;
  }
  // /universities (optionally with ?q=)
  if (segs[0] === "universities") {
    await navigate({
      to: "/universities",
      search: search.q ? ({ q: search.q } as never) : (undefined as never),
    });
    return;
  }
  // Plain top-level routes the agent is allowed to send the user to. Mirrors the
  // routes named in the agent prompt (prompt.py "Take the student to the right
  // screen") so every proposed navigate card actually resolves.
  const known = new Set([
    "dashboard",
    "apply",
    "feedback",
    "extension",
    "plan",
    "agent",
    "unlock",
  ]);
  if (segs.length === 1 && known.has(segs[0])) {
    await navigate({
      to: `/${segs[0]}` as never,
      ...(search.source ? { search: { source: search.source } as never } : {}),
    });
    return;
  }
  throw new Error(`Route not allowed: ${normalized}`);
}
