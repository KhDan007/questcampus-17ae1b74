"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Crown, X, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth/client";
import { resolveConvexSiteUrl } from "@/lib/backend";

function siteBase(): string {
  return resolveConvexSiteUrl();
}

async function cancelSubscription(
  token: string,
  reason: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${siteBase()}/api/payments/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) return { ok: true };
    let body: { error?: string } = {};
    try {
      body = await res.json();
    } catch {
      // A non-JSON error body falls back to the status message below.
    }
    return { ok: false, message: body.error ?? `Cancel failed (${res.status})` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Network error" };
  }
}

type Stage = "idle" | "warn" | "reason" | "done";

const CANCEL_REASONS = [
  "Too expensive",
  "Not using it enough",
  "Missing features I need",
  "Found a better alternative",
  "Just exploring / not ready yet",
  "Technical issues or bugs",
];

export function PlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");

  if (typeof document === "undefined") return null;

  const done = stage === "done";

  const resolvedReason = (): string => {
    if (selectedReason === "Other") return otherReason.trim();
    return selectedReason ?? "";
  };

  const canSubmit =
    selectedReason !== null &&
    (selectedReason !== "Other" || otherReason.trim().length > 0);

  const handleCancel = async () => {
    const token = auth.getSession()?.token;
    if (!token) {
      setMsg("You must be signed in.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const r = await cancelSubscription(token, resolvedReason());
    setLoading(false);
    if (r.ok) {
      setStage("done");
      setMsg("Your subscription is set to cancel at the end of the billing period.");
    } else {
      setMsg(r.message ?? "Could not cancel. Please contact support.");
    }
  };

  const close = () => {
    setStage("idle");
    setMsg(null);
    setLoading(false);
    setSelectedReason(null);
    setOtherReason("");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 h-full w-full bg-black/50"
            onClick={close}
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl border-2 border-on-surface bg-surface p-6 qc-hard-shadow-sm"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border-2 border-on-surface/15 bg-surface text-on-surface/70 hover:border-on-surface hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-on-surface bg-secondary-container text-on-surface">
                  <Crown className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface/70">
                    Your plan
                  </p>
                  <p className="font-display text-headline-sm font-bold text-on-surface">
                    QuestCampus Full Access
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border-2 border-on-surface/15 bg-secondary-container/40 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-display-sm font-bold text-on-surface">$15</p>
                  <p className="text-label-sm text-on-surface/70">per month</p>
                </div>
                <ul className="mt-3 space-y-1.5 text-label-sm text-on-surface/80">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-on-surface/60" /> Full ranked
                    university shortlist
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-on-surface/60" /> Polished essay drafts
                    & AI review
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-on-surface/60" /> Every premium
                    feature we ship
                  </li>
                </ul>
              </div>

              {msg && (
                <p
                  className={`mt-4 text-label-sm ${
                    done ? "text-on-surface/80" : "text-red-600"
                  }`}
                >
                  {msg}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {stage === "idle" && (
                  <button
                    type="button"
                    onClick={() => setStage("warn")}
                    className="rounded-lg border-2 border-on-surface bg-surface px-3 py-2 text-label-md font-semibold text-on-surface transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                  >
                    Cancel subscription
                  </button>
                )}

                {stage === "warn" && (
                  <div className="flex flex-col gap-3 rounded-lg border-2 border-red-500/40 bg-red-50/60 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      <div>
                        <p className="font-display text-title-sm font-bold text-on-surface">
                          You'll lose access to premium features
                        </p>
                        <p className="mt-1 text-label-sm text-on-surface/80">
                          Your full ranked shortlist, essay drafting & AI review, and every
                          premium feature will be turned off at the end of your current billing
                          period. You can keep using everything until then.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStage("idle")}
                        className="flex-1 rounded-lg border-2 border-on-surface bg-on-surface px-3 py-2 text-label-md font-semibold text-surface transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
                      >
                        Keep my plan
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage("reason")}
                        className="flex-1 rounded-lg border-2 border-on-surface/30 bg-surface px-3 py-2 text-label-md font-semibold text-on-surface/80 hover:border-on-surface hover:text-on-surface"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {stage === "reason" && (
                  <div className="flex flex-col gap-3 rounded-lg border-2 border-on-surface/15 bg-surface p-4">
                    <p className="font-display text-title-sm font-bold text-on-surface">
                      Before you go — what's the main reason?
                    </p>
                    <p className="text-label-sm text-on-surface/70">
                      This helps us improve QuestCampus. Pick one.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {[...CANCEL_REASONS, "Other"].map((reason) => {
                        const active = selectedReason === reason;
                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedReason(reason)}
                            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-label-sm transition-all ${
                              active
                                ? "border-on-surface bg-secondary-container text-on-surface qc-hard-shadow-sm"
                                : "border-on-surface/15 bg-surface text-on-surface/80 hover:border-on-surface/40"
                            }`}
                          >
                            <span
                              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                                active ? "border-on-surface bg-on-surface" : "border-on-surface/30"
                              }`}
                            >
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-surface" />
                              )}
                            </span>
                            {reason}
                          </button>
                        );
                      })}
                    </div>

                    {selectedReason === "Other" && (
                      <textarea
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Tell us what's missing or what went wrong…"
                        rows={3}
                        maxLength={500}
                        className="w-full resize-none rounded-lg border-2 border-on-surface/20 bg-surface px-3 py-2 text-label-sm text-on-surface placeholder:text-on-surface/40 focus:border-on-surface focus:outline-none"
                      />
                    )}

                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStage("warn")}
                        className="flex-1 rounded-lg border-2 border-on-surface/20 bg-surface px-3 py-2 text-label-md font-semibold text-on-surface/80 hover:border-on-surface hover:text-on-surface disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={loading || !canSubmit}
                        onClick={handleCancel}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-600 bg-red-600 px-3 py-2 text-label-md font-semibold text-white transition-all qc-hard-shadow-sm hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirm cancel
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg px-3 py-2 text-label-sm text-on-surface/70 hover:text-on-surface"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
