"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

import { useAuth } from "@/lib/auth/useAuth";
import { Markdown } from "@/components/common/Markdown";
import {
  useChatThreads,
  useThreadMessages,
  useSendChat,
  useSetActionStatus,
  type ChatAction,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat";

import { useSetAnswer, useAnswerEligibility } from "@/lib/apply/intake";
import { useApplyActions } from "@/lib/applyQueue/client";

const SUGGESTIONS = [
  "What is my safest next action?",
  "Find scholarship-friendly schools for my profile",
  "What can the extension safely do now?",
];

export function AssistantSidebar() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
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
            className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-full border-2 border-on-surface bg-surface px-4 py-3 font-[var(--font-label)] text-label-md font-bold text-on-surface qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && <SidebarPanel key="panel" onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}


function SidebarPanel({ onClose }: { onClose: () => void }) {
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
    if (!t || disabled) return;
    setInput("");
    setSending(true);
    try {
    const res = await send(t, activeThreadId);
      setForceNew(false);
      setSelectedId(res.threadId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

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

  return (
    <motion.aside
      role="complementary"
      aria-label="AI assistant"
      initial={{ x: "100%", opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-0 top-16 z-[80] flex h-[calc(100dvh-4rem)] w-full max-w-[380px] flex-col border-l-2 border-on-surface bg-surface qc-hard-shadow-sm"
    >

      {/* Header */}
      <header className="flex items-center gap-2 border-b-2 border-on-surface/15 bg-surface px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-label-md font-bold text-on-surface">Assistant</p>
          <p className="text-label-sm text-on-surface-variant">Grounded in your app data - actions confirm first</p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-pressed={historyOpen}
          className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold hover:border-on-surface ${
            historyOpen
              ? "border-on-surface bg-secondary-container text-on-surface"
              : "border-on-surface/25 bg-surface text-on-surface"
          }`}
          title="Previous chats"
        >
          <History className="h-3.5 w-3.5" /> History
          {threads && threads.length > 0 && (
            <span className="opacity-60">({threads.length})</span>
          )}
        </button>
        <button
          type="button"
          onClick={newChat}
          className="inline-flex items-center gap-1 rounded-md border-2 border-on-surface/25 bg-surface px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface"
          title="Start a new chat"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid h-8 w-8 place-items-center rounded-md border-2 border-on-surface/25 bg-surface text-on-surface hover:border-on-surface"
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
          messages.map((m) => <MessageRow key={m._id} message={m} />)
        )}
      </div>



      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
        className="border-t-2 border-on-surface/15 bg-surface p-3"
      >
        <div className="flex items-end gap-2">
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
            className="min-h-[44px] flex-1 resize-none rounded-md border-2 border-on-surface/25 bg-surface px-2.5 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-on-surface focus:outline-none"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-md border-2 border-on-surface bg-primary px-3 font-[var(--font-label)] text-label-md font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending || streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Enter to send - Shift+Enter for newline
        </p>
      </form>
    </motion.aside>
  );
}

function HistoryPanel({
  threads,
  activeId,
  onPick,
  onNew,
  onBack,
}: {
  threads: ChatThread[] | undefined;
  activeId?: string;
  onPick: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-md border-2 border-on-surface/25 bg-surface px-2 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-md border-2 border-on-surface bg-primary px-2 py-1 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
      </div>
      {threads === undefined ? (
        <div className="flex items-center justify-center py-6 text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : threads.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-on-surface/20 bg-surface p-4 text-center text-body-sm text-on-surface-variant">
          No previous chats yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {threads.map((t) => {
            const isActive = t._id === activeId;
            return (
              <li key={t._id}>
                <button
                  type="button"
                  onClick={() => onPick(t._id)}
                  className={`w-full rounded-md border-2 px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
                      : "border-on-surface/15 bg-surface text-on-surface hover:border-on-surface"
                  }`}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({

  onPick,
  disabled,
}: {
  onPick: (t: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border-2 border-on-surface/15 bg-surface p-4">
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
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="w-full rounded-md border-2 border-on-surface/25 bg-surface px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:border-on-surface disabled:opacity-60"
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
    <div className="rounded-xl border-2 border-on-surface/15 bg-secondary-container/45 p-3">
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
    <div className="mt-4 rounded-xl border-2 border-on-surface/15 bg-surface p-4">
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

function MessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg border-2 px-3 py-2 text-body-sm ${
          isUser
            ? "border-on-surface bg-on-surface text-surface qc-hard-shadow-sm"
            : "border-on-surface/15 bg-surface text-on-surface"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="break-words">
            <Markdown>{message.content}</Markdown>
            {message.streaming && (
              <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-current align-middle" />
            )}
          </div>
        )}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-[0.1em] text-on-surface/60">
              Proposed action - review before confirming
            </p>
            {message.actions.map((a) => (
              <ActionCard key={a.id} messageId={message._id} action={a} />
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
}: {
  messageId: string;
  action: ChatAction;
}) {
  const setStatus = useSetActionStatus();
  const setAnswer = useSetAnswer();
  const answerEligibility = useAnswerEligibility();
  const { startApply } = useApplyActions();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (action.status !== "proposed") {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-label-sm ${
          action.status === "done"
            ? "border-tertiary bg-tertiary/20 text-on-surface"
            : "border-on-surface/20 bg-surface text-on-surface-variant"
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
      await execute(action, { setAnswer, answerEligibility, startApply, navigate });
      await setStatus(messageId, action.id, "done");
      toast.success("Done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-on-surface/25 bg-surface p-2">
      <p className="font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
        {action.label}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={confirmAction}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border-2 border-on-surface bg-primary px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold text-white qc-hard-shadow-sm transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Confirm
        </button>
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="rounded-md border-2 border-on-surface/25 bg-surface px-2.5 py-1 font-[var(--font-label)] text-label-sm font-semibold text-on-surface hover:border-on-surface disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
      {err && (
        <p className="mt-1 rounded border-2 border-error/30 bg-error/10 px-1.5 py-0.5 text-label-sm text-on-error-container">
          {err}
        </p>
      )}
    </div>
  );
}

type Executors = {
  setAnswer: ReturnType<typeof useSetAnswer>;
  answerEligibility: ReturnType<typeof useAnswerEligibility>;
  startApply: ReturnType<typeof useApplyActions>["startApply"];
  navigate: ReturnType<typeof useNavigate>;
};

async function execute(action: ChatAction, ex: Executors) {
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
      const res = await ex.startApply({ system, externalId, targetName: str("targetName") });
      await ex.navigate({ to: "/apply/$jobId", params: { jobId: res.jobId } });
      return;
    }
    case "upload_document": {
      await ex.navigate({ to: "/apply" });
      return;
    }
    case "navigate": {
      const route = str("route");
      if (!route) throw new Error("Missing route");
      await navigateInternal(route, ex.navigate);
      return;
    }
    default:
      throw new Error(`Unknown action: ${action.tool}`);
  }
}

async function navigateInternal(
  route: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  // Guard: only internal absolute paths
  if (!route.startsWith("/") || route.startsWith("//")) {
    throw new Error("Blocked external route");
  }
  // Parse query
  const [pathPart, queryPart] = route.split("?");
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
  // Plain top-level routes
  const known = new Set(["dashboard", "apply", "essay", "profile"]);
  if (segs.length === 1 && known.has(segs[0])) {
    await navigate({ to: `/${segs[0]}` as never });
    return;
  }
  throw new Error(`Route not allowed: ${route}`);
}
