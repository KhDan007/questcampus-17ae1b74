"use client";

import { useCallback, useEffect, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/useAuth";

export type DocType =
  | "transcript"
  | "passport"
  | "personal_statement"
  | "recommendation"
  | "resume"
  | "other";

export type ApplicationDocument = {
  id: string;
  docType: DocType | string;
  fileName: string;
  mime?: string;
  size?: number;
  uploadedAt?: number;
  hasFile?: boolean;
};

/** Backend upload cap. Files above this are rejected before requesting a ticket. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type ApplyJobStatus =
  | "queued"
  | "claimed"
  | "awaiting_login"
  | "filling"
  | "awaiting_submit"
  | "done"
  | "cancelled"
  | "error";

export type ApplyJobCheckpoint =
  | {
      kind: "login";
      payload?: Record<string, unknown>;
    }
  | {
      kind: "submit";
      payload?: {
        filled?: Array<{ field: string; value?: string }>;
        unmatched?: Array<{ field: string; reason?: string }>;
        [k: string]: unknown;
      };
    };

export type ApplyJobActivity = {
  ts: number;
  level?: "info" | "warn" | "error";
  message: string;
};

export type ApplyJob = {
  _id: string;
  jobId: string;
  status: ApplyJobStatus;
  system?: string;
  externalId?: string;
  targetName?: string;
  progress?: { stage?: string; message?: string; percent?: number };
  activity?: ApplyJobActivity[];
  wsEndpoint?: string;
  checkpoint?: ApplyJobCheckpoint | null;
  createdAt?: number;
  updatedAt?: number;
  error?: string;
};

export function useApplyJob(jobId: string | undefined) {
  const { token } = useAuth();
  return useQuery(
    api.applyQueue.getApplyJob,
    token && jobId ? { token, jobId } : "skip",
  ) as ApplyJob | undefined;
}

export function useActiveApplyJob() {
  const { token } = useAuth();
  const client = useConvex();
  const [job, setJob] = useState<ApplyJob | null | undefined>(undefined);

  useEffect(() => {
    if (!token) {
      setJob(null);
      return;
    }

    let cancelled = false;
    setJob(undefined);

    client
      .query(api.applyQueue.myActiveJob, { token })
      .then((result) => {
        if (!cancelled) setJob((result as ApplyJob | null | undefined) ?? null);
      })
      .catch((error) => {
        console.warn("Unable to load active application job", error);
        if (!cancelled) setJob(null);
      });

    return () => {
      cancelled = true;
    };
  }, [client, token]);

  return job;
}

export function useApplicationDocuments() {
  const { token } = useAuth();
  const docs = useQuery(
    api.applicationDocuments.list,
    token ? { token } : "skip",
  ) as ApplicationDocument[] | undefined;
  const requestTicket = useMutation(api.applicationDocuments.requestUploadTicket);
  const recordDoc = useMutation(api.applicationDocuments.record);
  const removeDoc = useMutation(api.applicationDocuments.remove);
  const convex = useConvex();

  const upload = useCallback(
    async (file: File, docType: DocType) => {
      if (!token) throw new Error("Sign in required");
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("File is too large. Max size is 25 MB.");
      }
      const { uploadUrl, oracleKey, ticket } = (await requestTicket({
        token,
        docType,
      })) as { uploadUrl: string; oracleKey: string; ticket: string };

      const res = await fetch(`${uploadUrl}?ticket=${encodeURIComponent(ticket)}`, {
        method: "POST",
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      await recordDoc({
        token,
        docType,
        oracleKey,
        fileName: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
      });
    },
    [token, requestTicket, recordDoc],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token) return;
      await removeDoc({ token, id });
    },
    [token, removeDoc],
  );

  const getDownloadUrl = useCallback(
    async (id: string): Promise<string | null> => {
      if (!token) return null;
      // downloadUrl is a QUERY that returns a bare URL string or null.
      const res = (await convex.query(api.applicationDocuments.downloadUrl, {
        token,
        id,
      })) as string | null;
      return res ?? null;
    },
    [token, convex],
  );

  return { docs, upload, remove, getDownloadUrl };
}

export function useApplyActions() {
  const { token } = useAuth();
  const enqueue = useMutation(api.applyQueue.enqueueApply);
  const cancel = useMutation(api.applyQueue.cancelApply);
  const confirmCheckpoint = useMutation(api.applyQueue.confirmCheckpoint);

  const startApply = useCallback(
    async (args: { system: string; externalId: string; targetName?: string }) => {
      if (!token) throw new Error("Sign in required");
      const res = (await enqueue({ token, ...args })) as { jobId: string; reused?: boolean };
      return { jobId: res.jobId, reused: res.reused ?? false };
    },
    [token, enqueue],
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      if (!token) return;
      await cancel({ token, jobId });
    },
    [token, cancel],
  );

  const confirm = useCallback(
    async (jobId: string, kind: string, value?: unknown) => {
      if (!token) return;
      await confirmCheckpoint({ token, jobId, kind, value });
    },
    [token, confirmCheckpoint],
  );

  return { startApply, cancelJob, confirm };
}

export async function fetchLiveTicket(
  client: { query: (q: unknown, args: unknown) => Promise<unknown> },
  token: string,
  jobId: string,
): Promise<{ wsUrl: string; ticket: string }> {
  return (await client.query(api.applyQueue.liveTicket, { token, jobId })) as {
    wsUrl: string;
    ticket: string;
  };
}
