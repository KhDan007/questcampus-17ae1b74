import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { errorClassName, inputClassName, primaryButtonClassName } from "./forgot-password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — QuestCampus" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(
    isValidResetToken(token) ? null : t("resetPassword.errorToken"),
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidResetToken(token)) {
      setError(t("resetPassword.errorToken"));
      return;
    }
    if (password.length < 8) {
      setError(t("resetPassword.errorPassword"));
      return;
    }
    if (password !== confirmation) {
      setError(t("resetPassword.errorMismatch"));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await auth.confirmPasswordReset(token, password);
      await navigate({ to: "/signin", search: { mode: "signin" }, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetPassword.errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center px-5 pb-16 pt-28"
    >
      <section className="w-full max-w-[460px] rounded-3xl border border-on-surface/8 bg-surface-container-lowest p-7 qc-soft-shadow sm:p-9">
        <h1 className="font-display text-display-md text-on-surface">{t("resetPassword.title")}</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{t("resetPassword.subtitle")}</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-label-sm font-medium text-on-surface">
              {t("resetPassword.newPassword")}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              minLength={8}
              maxLength={128}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-label-sm font-medium text-on-surface">
              {t("resetPassword.confirmPassword")}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClassName}
              minLength={8}
              maxLength={128}
            />
          </label>
          {error && (
            <p role="alert" className={errorClassName}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !isValidResetToken(token)}
            className={primaryButtonClassName}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t("resetPassword.submit")}
          </button>
        </form>
        <Link
          to="/signin"
          search={{ mode: "signin" }}
          className="mt-6 inline-block text-body-sm font-medium text-primary hover:underline"
        >
          {t("resetPassword.signinLink")}
        </Link>
      </section>
    </main>
  );
}

export function isValidResetToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
