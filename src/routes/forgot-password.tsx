import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { auth } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — QuestCampus" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t("forgotPassword.errorEmail"));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await auth.requestPasswordReset(normalizedEmail);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgotPassword.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPage>
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-5 font-display text-display-md text-on-surface">
            {t("forgotPassword.successTitle")}
          </h1>
          <p className="mt-3 text-body-md text-on-surface-variant">
            {t("forgotPassword.successBody")}
          </p>
          <SignInLink label={t("forgotPassword.signinLink")} />
        </div>
      ) : (
        <>
          <h1 className="font-display text-display-md text-on-surface">
            {t("forgotPassword.title")}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {t("forgotPassword.subtitle")}
          </p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-label-sm font-medium text-on-surface">
                {t("forgotPassword.emailLabel")}
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("forgotPassword.emailPlaceholder")}
                maxLength={254}
                className={inputClassName}
              />
            </label>
            {error && (
              <p role="alert" className={errorClassName}>
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className={primaryButtonClassName}>
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t("forgotPassword.submit")
              )}
            </button>
          </form>
          <SignInLink label={t("forgotPassword.signinLink")} />
        </>
      )}
    </AuthPage>
  );
}

function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center px-5 pb-16 pt-28"
    >
      <section className="w-full max-w-[460px] rounded-3xl border border-on-surface/8 bg-surface-container-lowest p-7 qc-soft-shadow sm:p-9">
        {children}
      </section>
    </main>
  );
}

function SignInLink({ label }: { label: string }) {
  return (
    <Link
      to="/signin"
      search={{ mode: "signin" }}
      className="mt-6 inline-block text-body-sm font-medium text-primary hover:underline"
    >
      {label}
    </Link>
  );
}

export const inputClassName =
  "block min-h-[52px] w-full rounded-2xl border border-outline-variant bg-surface px-4 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
export const primaryButtonClassName =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-primary px-7 font-display text-label-lg font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
export const errorClassName =
  "rounded-md bg-error-container/40 px-3 py-2 text-body-sm text-on-error-container";
