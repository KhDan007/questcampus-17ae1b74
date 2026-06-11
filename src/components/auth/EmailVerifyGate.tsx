"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { auth, VERIFY_EMAIL_EVENT } from "@/lib/auth/client";

/**
 * Global email-verification gate. Auto-opens whenever the signed-in user has
 * `emailVerified === false`, OR when any module dispatches the
 * `qc:verify-email` event (e.g. a 403 `email_not_verified` from checkout).
 *
 * Google users — and already-verified password users — never see this.
 */
export function EmailVerifyGate() {
  const { user, token } = useAuth();
  const unverified = !!user && user.emailVerified === false;

  // Manual trigger (event-driven). Once shown, it stays open until verified
  // or the user dismisses.
  const [forceOpen, setForceOpen] = useState(false);
  useEffect(() => {
    const on = () => setForceOpen(true);
    window.addEventListener(VERIFY_EMAIL_EVENT, on);
    return () => window.removeEventListener(VERIFY_EMAIL_EVENT, on);
  }, []);

  // Verified users never see the modal.
  const open = !!token && (unverified || forceOpen);
  if (!open || !token) return null;
  return (
    <Modal
      token={token}
      email={user?.email ?? ""}
      dismissible={!unverified}
      onClose={() => setForceOpen(false)}
    />
  );
}

function Modal({
  token,
  email,
  dismissible,
  onClose,
}: {
  token: string;
  email: string;
  dismissible: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Backend already sent the first code on sign-up → start cooldown immediately.
  const [cooldown, setCooldown] = useState(60);
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) {
        window.clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
      return;
    }
    if (cooldownRef.current) return;
    cooldownRef.current = window.setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (cooldownRef.current) {
        window.clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [cooldown]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!/^\d{6}$/.test(code)) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    const res = await auth.confirmVerifyEmail(token, code);
    setSubmitting(false);
    if (res.ok) {
      auth.updateUser(res.user);
      onClose();
      return;
    }
    if (res.locked || res.expired) {
      setCode("");
    }
    const suffix =
      typeof res.attemptsLeft === "number" ? ` (${res.attemptsLeft} left)` : "";
    setErr(res.error + suffix);
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setErr(null);
    setInfo(null);
    setResending(true);
    const r = await auth.sendVerifyEmail(token);
    setResending(false);
    if (r.alreadyVerified) {
      // Refresh user — assume verified and close.
      const session = auth.getSession();
      if (session) auth.updateUser({ ...session.user, emailVerified: true });
      onClose();
      return;
    }
    if (typeof r.retryAfter === "number") {
      setCooldown(r.retryAfter);
      setErr(r.error ?? "Please wait before requesting another code.");
      return;
    }
    if (r.sent === false) {
      setErr("Couldn't send the email — please try again in a moment.");
      return;
    }
    setCooldown(60);
    setInfo("A new code is on the way.");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-email-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[440px] rounded-3xl border-2 border-on-surface bg-surface p-7 qc-hard-shadow sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container">
            <MailCheck className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 id="verify-email-title" className="font-display text-display-sm text-on-surface">
              Verify your email to continue
            </h2>
            <p className="mt-1.5 text-body-sm text-on-surface-variant">
              We sent a 6-digit code to <span className="font-medium text-on-surface">{email}</span>.
              Enter it below to unlock your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="mt-6 flex flex-col gap-3" noValidate>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            aria-label="6-digit verification code"
            className="block w-full min-h-[56px] rounded-2xl border border-outline-variant bg-surface px-4 text-center text-2xl font-semibold tracking-[0.5em] text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {err && (
            <p role="alert" className="rounded-md bg-error-container/40 px-3 py-2 text-body-sm text-on-error-container">
              {err}
            </p>
          )}
          {info && !err && (
            <p className="rounded-md bg-primary-container/30 px-3 py-2 text-body-sm text-on-surface">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="mt-1 inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary-container px-7 text-label-md text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-body-sm text-primary hover:underline disabled:cursor-not-allowed disabled:text-on-surface-variant disabled:no-underline"
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
          </button>
        </form>

        <p className="mt-5 text-center text-label-sm text-on-surface-variant">
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => {
              auth.signOut();
              onClose();
            }}
            className="font-medium text-primary hover:underline"
          >
            Sign out
          </button>
        </p>

        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
