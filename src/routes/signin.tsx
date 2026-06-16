import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Sparkles, ShieldCheck, Bookmark } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { auth } from "@/lib/auth/client";
import { getSessionId } from "@/lib/onboarding/session";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — QuestCampus" },
      {
        name: "description",
        content: "Sign in to QuestCampus to save your matches and pick up where you left off.",
      },
    ],
  }),
  component: SignInPage,
});

type Mode = "signin" | "signup";

function SignInPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkOnLogin = useMutation(api.onboarding.linkOnLogin);
  const linkDraftOnLogin = useMutation(api.essays.linkDraftOnLogin);

  async function afterLogin(token: string) {
    let doc: { completed?: boolean; currentStep?: number } | null = null;
    const sessionId = getSessionId();
    try {
      doc = await linkOnLogin({ token, sessionId });
    } catch {
      /* non-fatal — fall through to onboarding */
    }
    try {
      await linkDraftOnLogin({ token, sessionId });
    } catch {
      /* non-fatal */
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("qc_profile");
      window.localStorage.removeItem("qc_resume_step");
    }
    if (doc?.completed) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    if (err) {
      setError(decodeURIComponent(err));
      window.history.replaceState({}, "", "/signin");
      return;
    }
    if (code && state) {
      setGoogleLoading(true);
      window.history.replaceState({}, "", "/signin");
      auth
        .exchangeGoogleCode(code, state)
        .then((session) => afterLogin(session.token))
        .catch((e: Error) => {
          setError(e.message);
          setGoogleLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t("signin.err.email"));
      return;
    }
    if (password.length < 8) {
      setError(t("signin.err.password"));
      return;
    }
    if (mode === "signup" && name.trim().length === 0) {
      setError(t("signin.err.name"));
      return;
    }

    setSubmitting(true);
    try {
      const session =
        mode === "signin"
          ? await auth.signIn(trimmedEmail, password)
          : await auth.signUp(trimmedEmail, password, name.trim());
      await afterLogin(session.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signin.err.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { authorizationUrl } = await auth.startGoogle(`${window.location.origin}/signin`);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signin.err.google"));
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto flex min-h-screen w-full max-w-(--container-content) items-center justify-center px-5 pb-16 pt-28 sm:px-8 lg:px-12"
      >
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Brand / pitch column */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
              QuestCampus account
            </p>
            <h2 className="mt-3 text-display-lg text-on-surface text-balance">
              {mode === "signin" ? "Welcome back." : "One account.\nEvery match, saved."}
            </h2>
            <p className="mt-5 max-w-md text-body-lg text-on-surface-variant">
              Pick up where you left off across devices, save universities you love, and unlock
              waitlist pricing on everything coming next.
            </p>
            <ul className="mt-8 space-y-4">
              <Perk icon={<Sparkles className="h-4 w-4" />} title="20 ranked matches">
                Safety, Target, and Reach universities tuned to your profile.
              </Perk>
              <Perk icon={<Bookmark className="h-4 w-4" />} title="Save & compare">
                Bookmark schools, track deadlines, and never re-do your answers.
              </Perk>
              <Perk icon={<ShieldCheck className="h-4 w-4" />} title="Waitlist pricing">
                30% off monthly access on the Essay Assistant, Tracker, and Auto-Apply.
              </Perk>
            </ul>
          </motion.aside>

          {/* Auth card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="mx-auto w-full max-w-[460px] rounded-3xl border-2 border-on-surface bg-surface/85 p-7 backdrop-blur-xl qc-hard-shadow sm:p-9"
          >
            <h1 className="font-display text-display-md text-on-surface text-balance">
              {mode === "signin" ? t("signin.title.signin") : t("signin.title.signup")}
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {mode === "signin" ? t("signin.subtitle.signin") : t("signin.subtitle.signup")}
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || submitting}
              className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-outline-variant bg-surface px-6 text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
              {t("signin.google")}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="text-label-sm uppercase text-on-surface-variant">
                {t("signin.or")}
              </span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {mode === "signup" && (
                <Field label={t("signin.field.name")}>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    className={inputCls}
                    placeholder={t("signin.placeholder.name")}
                  />
                </Field>
              )}

              <Field label={t("signin.field.email")}>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  className={inputCls}
                  placeholder={t("signin.placeholder.email")}
                />
              </Field>

              <Field label={t("signin.field.password")}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    className={`${inputCls} pr-12`}
                    placeholder={t("signin.placeholder.password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("signin.hide") : t("signin.show")}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-on-surface-variant hover:text-on-surface"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-error-container/40 px-3 py-2 text-body-sm text-on-error-container"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="mt-2 inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary-container px-7 text-label-md text-on-primary shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)] transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "signin" ? (
                  t("signin.cta.signin")
                ) : (
                  t("signin.cta.signup")
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-body-sm text-on-surface-variant">
              {mode === "signin" ? t("signin.toggle.toSignup") : t("signin.toggle.toSignin")}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                  setError(null);
                }}
                className="font-medium text-primary hover:underline"
              >
                {mode === "signin"
                  ? t("signin.toggle.createAccount")
                  : t("signin.toggle.signinLink")}
              </button>
            </p>
          </motion.div>
        </div>
      </main>
    </>
  );
}

function Perk({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-on-surface bg-primary-container text-on-primary-container qc-hard-shadow-sm">
        {icon}
      </span>
      <div>
        <p className="font-[var(--font-label)] text-label-md font-semibold text-on-surface">
          {title}
        </p>
        <p className="text-body-sm text-on-surface-variant">{children}</p>
      </div>
    </li>
  );
}

const inputCls =
  "block w-full min-h-[52px] rounded-2xl border border-outline-variant bg-surface px-4 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label-sm font-medium text-on-surface">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
