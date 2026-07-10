"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type ChatAction = {
  id: string;
  tool: string;
  label: string;
  args: Record<string, unknown>;
  status: string; // proposed|confirmed|dismissed|done
};

export type ChatMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  actions?: ChatAction[];
  steps?: string[];
  createdAt: number;
};

export type ChatThread = { _id: string; title?: string; updatedAt: number };

export type AgentJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export type AgentTodoStatus = "pending" | "in_progress" | "done" | "skipped";

export type AgentTodo = {
  id: string;
  text: string;
  status: AgentTodoStatus;
};

export type AgentJobLogEntry = {
  ts: number;
  kind: string; // step|write|verify|note
  text: string;
};

export type AgentJob = {
  _id: string;
  goal: string;
  status: AgentJobStatus;
  todos: AgentTodo[];
  log: AgentJobLogEntry[];
  resultSummary?: string;
  error?: string;
  createdAt: number;
  finishedAt?: number;
};

export function useChatThreads(): ChatThread[] | undefined {
  const { token } = useAuth();
  return useQuery(api.chat.listThreads, token ? ({ token } as never) : "skip") as
    | ChatThread[]
    | undefined;
}

export function useThreadMessages(threadId: string | undefined): ChatMessage[] | undefined {
  const { token } = useAuth();
  return useQuery(
    api.chat.threadMessages,
    token && threadId ? ({ token, threadId } as never) : "skip",
  ) as ChatMessage[] | undefined;
}

export function useSendChat() {
  const send = useAction(api.chat.send);
  const { token } = useAuth();
  return async (message: string, threadId?: string) => {
    if (!token) throw new Error("Sign in");
    return (await send({ token, threadId, message } as never)) as {
      threadId: string;
      assistantId: string;
    };
  };
}

export function useSetActionStatus() {
  const m = useMutation(api.chat.setActionStatus);
  const { token } = useAuth();
  return async (
    messageId: string,
    actionId: string,
    status: "confirmed" | "dismissed" | "done",
  ) => {
    if (!token) return;
    await m({ token, messageId, actionId, status } as never);
  };
}

/** Reactive: agent jobs for a thread (newest activity surfaces live). */
export function useAgentJobsForThread(threadId: string | undefined): AgentJob[] | undefined {
  const { token } = useAuth();
  return useQuery(
    api.agentJobs.forThread,
    token && threadId ? ({ token, threadId } as never) : "skip",
  ) as AgentJob[] | undefined;
}

/** Start a multi-step agent job. Throws "one_at_a_time" if one is active. */
export function useStartAgentJob() {
  const m = useMutation(api.agentJobs.start);
  const { token } = useAuth();
  return async (threadId: string, goal: string, todos: string[]) => {
    if (!token) throw new Error("Sign in");
    return (await m({ token, threadId, goal, todos } as never)) as { jobId: string };
  };
}

/** Cancel a queued/running agent job. */
export function useCancelAgentJob() {
  const m = useMutation(api.agentJobs.cancel);
  const { token } = useAuth();
  return async (jobId: string) => {
    if (!token) return;
    await m({ token, jobId } as never);
  };
}
