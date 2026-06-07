"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavBar } from "@/components/landing/NavBar";
import { getSessionId } from "@/lib/onboarding/session";
import { loadProfileFromLocal } from "@/lib/onboarding/storage";
import { WAITLIST_BASE_DISCOUNT, REFERRAL_EXTRA_DISCOUNT } from "@/lib/config";
import { ONBOARDING_PATH } from "@/lib/routes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "QuestCampus — Join the waitlist" },
      {
        name: "description",
        content:
          "Join the QuestCampus waitlist for 30% off at launch, +5% per referral, a Founding Member badge, and early access to every new tool.",
      },
    ],
  }),
  component: WaitlistPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type JoinResult = { ok: boolean; alreadyJoined: boolean; emailSent: boolean };

function WaitlistPage() {
  const reduce = !!useReducedMotion();
  const { t } = useI18n();
  const join = useAction(api.waitlist.join);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [why, setWhy] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [firstName, setFirstName] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSessionId(getSessionId());
    const local = loadProfileFromLocal();
    const n = local?.answers?.firstName;
    setFirstName(typeof n === "string" && n.trim() ? n.trim() : undefined);
  }, []);

  const PERKS: { icon: string; text: string }[] = [
    { icon: "🎟️", text: t("wait.perk1", { discount: WAITLIST_BASE_DISCOUNT }) },
    { icon: "🤝", text: t("wait.perk2", { refDiscount: REFERRAL_EXTRA_DISCOUNT }) },
    { icon: "🏅", text: t("wait.perk3") },
    { icon: "⚡", text: t("wait.perk4") },
  ];

  const FEATURES = [
    { title: t("wait.f1.title"), blurb: t("wait.f1.blurb") },
    { title: t("wait.f2.title"), blurb: t("wait.f2.blurb") },
    { title: t("wait.f3.title"), blurb: t("wait.f3.blurb") },
    { title: t("wait.f4.title"), blurb: t("wait.f4.blurb") },
    { title: t("wait.f5.title"), blurb: t("wait.f5.blurb") },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normEmail)) {
      setError(t("wait.errInvalid"));
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const res = (await join({
        email: normEmail,
        name: firstName,
        why: why.trim() || undefined,
        sessionId: sessionId ?? undefined,
      })) as JoinResult;
      setAlreadyJoined(res.alreadyJoined);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wait.errGeneric"));
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <NavBar variant="landing" />
      <section className="relative isolate overflow-hidden bg-surface-container-low px-4 pb-12 pt-24 sm:px-8 sm:pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
            style={{ background: "rgba(254,166,25,0.10)" }}
          />
        </div>

        <div className="mx-auto max-w-[640px] text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-block rounded-full bg-secondary-container px-3 py-1 text-label-sm font-medium uppercase text-on-secondary-container">
              {t("wait.badge")}
            </span>
            <h1 className="mt-6 text-display-lg-mobile text-on-background sm:text-display-lg">
              {firstName ? t("wait.title.named", { name: firstName }) : t("wait.title.anon")}
              <span className="ml-2 inline-block">🎓</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[480px] text-body-lg text-on-surface-variant">
              {t("wait.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[640px] px-4 pb-24 sm:px-6">
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {PERKS.map((p, i) => (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 * i }}
              className="flex items-start gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"
            >
              <span aria-hidden className="text-xl leading-none">
                {p.icon}
              </span>
              <span className="text-body-md text-on-surface">{p.text}</span>
            </motion.li>
          ))}
        </ul>

        {status === "done" ? (
          <SuccessCard reduce={reduce} alreadyJoined={alreadyJoined} firstName={firstName} />
        ) : (
          <motion.form
            onSubmit={onSubmit}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8"
          >
            <label htmlFor="wl-email" className="block text-label-md font-medium text-on-surface">
              {t("wait.emailLabel")}
            </label>
            <input
              id="wl-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("wait.emailPh")}
              className="mt-2 h-12 w-full rounded-full border border-outline-variant bg-surface px-5 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />

            <label htmlFor="wl-why" className="mt-5 block text-label-md font-medium text-on-surface">
              {t("wait.whyLabel")}{" "}
              <span className="font-normal text-on-surface-variant">{t("wait.whyOptional")}</span>
            </label>
            <textarea
              id="wl-why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={3}
              placeholder={t("wait.whyPh")}
              className="mt-2 w-full resize-none rounded-2xl border border-outline-variant bg-surface px-5 py-3 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />

            {error && (
              <p role="alert" className="mt-3 text-label-md text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-secondary-container px-7 text-label-md font-semibold text-on-secondary-container shadow-[0_8px_24px_-6px_rgba(254,166,25,0.45)] transition-[filter,transform] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block h-5 w-5 rounded-full border-2 border-on-secondary-container/40 border-t-on-secondary-container motion-safe:animate-spin"
                  />
                  {t("wait.submitting")}
                </>
              ) : (
                <>
                  {t("wait.submit")}
                  <span aria-hidden>→</span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-label-sm text-on-surface-variant">
              {t("wait.spamNote")}
            </p>
          </motion.form>
        )}

        <section className="mt-16">
          <h2 className="text-headline-sm text-on-background">{t("wait.features.title")}</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">{t("wait.features.subtitle")}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.title}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.04 * i }}
                className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5"
              >
                <h3 className="text-label-md font-semibold text-primary">{f.title}</h3>
                <p className="mt-1 text-body-md text-on-surface-variant">{f.blurb}</p>
              </motion.li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SuccessCard({
  reduce,
  alreadyJoined,
  firstName,
}: {
  reduce: boolean;
  alreadyJoined: boolean;
  firstName?: string;
}) {
  const { t } = useI18n();
  const title = alreadyJoined
    ? firstName
      ? t("wait.success.alreadyNamed", { name: firstName })
      : t("wait.success.already")
    : firstName
      ? t("wait.success.newNamed", { name: firstName })
      : t("wait.success.new");
  const body = alreadyJoined ? t("wait.success.bodyAlready") : t("wait.success.bodyNew");
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-8 overflow-hidden rounded-xl border border-secondary-container bg-surface-container-lowest p-8 text-center"
      style={{ background: "rgba(254,166,25,0.06)" }}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-2xl text-on-secondary-container shadow-[0_8px_24px_-6px_rgba(254,166,25,0.45)]">
        🎉
      </span>
      <h2 className="mt-5 text-headline-sm text-on-background">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-body-md text-on-surface-variant">{body}</p>
      <a
        href={ONBOARDING_PATH}
        className="mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary-container px-7 text-label-md font-semibold text-on-primary shadow-[0_8px_24px_-6px_rgba(53,37,205,0.45)] transition-transform hover:scale-[1.03]"
      >
        {t("wait.success.cta")}
        <span aria-hidden>→</span>
      </a>
    </motion.div>
  );
}
