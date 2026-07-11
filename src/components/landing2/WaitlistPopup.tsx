"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Loader2, Mail, Sparkles, X } from "lucide-react";
import { joinWaitlist } from "@/lib/waitlist/api";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
  feature?: string; // optional feature name to tag the signup with
};

/**
 * Reusable waitlist popup. Replaces the old dedicated /waitlist route.
 */
export function WaitlistPopup({
  open,
  onClose,
  title = "Join the waitlist",
  body = "Be first in line and lock in 30% off monthly access when this feature ships.",
  feature,
}: Props) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setDone(false);
    setAlreadyJoined(false);
    setLoading(false);
    setError("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    const result = await joinWaitlist(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAlreadyJoined(result.alreadyJoined);
    try {
      window.localStorage.setItem("qc.waitlist.email", email);
      const raw = window.localStorage.getItem("qc.waitlist.list");
      const list: { email: string; feature?: string; at: number }[] = raw ? JSON.parse(raw) : [];
      list.push({ email, feature, at: Date.now() });
      window.localStorage.setItem("qc.waitlist.list", JSON.stringify(list));
    } catch {
      // localStorage may be unavailable in private browsing.
    }
    setDone(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wlp-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-2xl border border-on-surface/10 bg-surface-container-lowest p-6 qc-soft-shadow"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/10 hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>

            {!done ? (
              <form onSubmit={onSubmit}>
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3
                  id="wlp-title"
                  className="mt-4 font-display text-headline-sm font-bold text-on-surface"
                >
                  {title}
                </h3>
                <p className="mt-2 text-body-md text-on-surface-variant">{body}</p>

                <label
                  htmlFor="wlp-email"
                  className="mt-5 block font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-surface"
                >
                  Your email
                </label>
                <div
                  className={`mt-2 flex items-center gap-2 rounded-lg border bg-surface px-3 transition-colors focus-within:border-primary ${error ? "border-error" : "border-on-surface/15"}`}
                >
                  <Mail className="h-4 w-4 text-on-surface-variant" />
                  <input
                    id="wlp-email"
                    type="email"
                    required
                    autoFocus
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@school.edu"
                    className="w-full bg-transparent py-2.5 font-[var(--font-label)] text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 disabled:opacity-50"
                  />
                </div>
                {error && <p className="mt-1.5 text-label-sm text-error">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-label-lg font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join the waitlist"}
                </button>
                <p className="mt-3 text-label-sm text-on-surface-variant">
                  No spam. One email when it ships.
                </p>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-2 text-center"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tertiary-container text-on-tertiary-container">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </div>
                <h3 className="mt-4 font-display text-headline-sm font-bold text-on-surface">
                  {alreadyJoined ? "You're already on the list." : "You're on the list!"}
                </h3>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  {alreadyJoined
                    ? "You're all set — we'll email you the moment it's ready."
                    : "Check your inbox for confirmation. We'll email you the moment it's ready — with your 30% monthly discount locked in."}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-on-surface/15 bg-surface px-5 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5"
                >
                  Close
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
