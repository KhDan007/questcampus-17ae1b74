import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getSessionId } from "@/lib/onboarding/session";
import { loadProfileFromLocal } from "@/lib/onboarding/storage";
import { CHAPTERS, STEPS, getStep, type ChapterId } from "@/lib/onboarding/steps";
import { personalize } from "@/lib/onboarding/personalize";
import type { Answers } from "@/lib/onboarding/types";
import { RecommendationsSection } from "@/components/profile/RecommendationsSection";
import { NavBar } from "@/components/landing/NavBar";
import { InviteFriendsPanel } from "@/components/referrals/InviteFriendsPanel";
import { auth } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localizeStepWith } from "@/lib/i18n/steps";
import { useAutoTranslate } from "@/lib/i18n/useAutoTranslate";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "QuestCampus — Your Profile" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const reduce = !!useReducedMotion();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const token = auth.getSession()?.token;

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const convexProfile = useQuery(
    api.onboarding.getActive,
    sessionId ? { sessionId, token } : "skip",
  );

  const localProfile = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (token) return null; // logged-in users rely solely on their Convex doc — never the shared browser mirror
    return loadProfileFromLocal();
  }, [token]);

  const answers: Answers | null =
    (convexProfile?.answers as Answers) || localProfile?.answers || null;

  const completed = !!(convexProfile?.completed) || localProfile != null;
  const firstName = typeof answers?.firstName === "string" ? answers.firstName : undefined;

  useEffect(() => {
    if (sessionId && !convexProfile && !localProfile) {
      const t = setTimeout(() => navigate({ to: "/onboarding" }), 2000);
      return () => clearTimeout(t);
    }
  }, [sessionId, convexProfile, localProfile, navigate]);

  if (!sessionId || convexProfile === undefined) {
    return (
      <>
        <NavBar variant="minimal" />
        <Splash />
      </>
    );
  }

  if (!answers) {
    return (
      <>
        <NavBar variant="minimal" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <NavBar variant="minimal" />
      <div className="min-h-screen bg-surface">
        <ProfileHero
          firstName={firstName}
          answers={answers}
          completed={completed}
          sessionId={sessionId ?? undefined}
          token={token}
          cachedSummary={(convexProfile as { aiSummary?: string } | null | undefined)?.aiSummary}
        />

        <div className="mx-auto max-w-[960px] px-4 pb-24 sm:px-6">
          {sessionId && (
            <RecommendationsSection sessionId={sessionId} token={token} reduce={reduce} firstName={firstName} />
          )}

          {token && (
            <div className="mt-12">
              <InviteFriendsPanel token={token} />
            </div>
          )}

          <ProfileChapters answers={answers} reduce={reduce} />

          <div className="mt-16 text-center">
            <EditProfileLink onClick={() => navigate({ to: "/onboarding" })} />
          </div>
        </div>
      </div>
    </>
  );
}

function EditProfileLink({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
    >
      {t("profile.edit")}
    </button>
  );
}

function ProfileHero({
  firstName,
  answers,
  completed,
  sessionId,
  token,
  cachedSummary,
}: {
  firstName?: string;
  answers: Answers;
  completed: boolean;
  sessionId?: string;
  token?: string;
  cachedSummary?: string;
}) {
  const { t } = useI18n();
  const stage = (answers.lifeStage as { choice?: string } | undefined)?.choice;
  const home = answers.home as { country: string; city?: string; eduSystem?: string } | undefined;

  const [summary, setSummary] = useState<string | null>(cachedSummary ?? null);
  const [summaryLoading, setSummaryLoading] = useState(!cachedSummary);
  const generateSummary = useAction(api.profileSummary.generate);

  useEffect(() => {
    if (cachedSummary && cachedSummary.trim().length > 0) {
      setSummary(cachedSummary);
      setSummaryLoading(false);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    (async () => {
      try {
        const result = await generateSummary({ answers, sessionId, token });
        if (!cancelled) setSummary((result as string)?.trim() || null);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [answers, generateSummary, cachedSummary, sessionId, token]);

  // Translate the AI-written summary on the fly into the user's language.
  const translatedSummary = useAutoTranslate(summary);

  const stageLabel = stage ? t(`profile.stage.${stage}`) : null;

  return (
    <section className="relative isolate overflow-hidden bg-surface-container-low px-4 pb-14 pt-24 sm:px-8 sm:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          style={{ background: "rgba(79,70,229,0.06)" }}
        />
      </div>

      <div className="mx-auto max-w-[680px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-block rounded-full bg-primary-fixed px-3 py-1 text-label-sm font-medium uppercase text-primary">
            {completed ? t("profile.complete") : t("profile.inprogress")}
          </span>

          <h1 className="mt-6 text-display-lg-mobile text-on-background sm:text-display-lg">
            {firstName
              ? t("profile.hello.named", { name: firstName })
              : t("profile.hello.anon")}
            <span className="ml-2 inline-block">🎓</span>
          </h1>

          {summaryLoading ? (
            <div className="mx-auto mt-4 flex max-w-[520px] flex-col items-center gap-2">
              <motion.div
                className="h-4 w-full rounded-full bg-surface-container-high"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-4 w-3/4 rounded-full bg-surface-container-high"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </div>
          ) : (
            <p className="mt-4 text-body-lg text-on-surface-variant">
              {translatedSummary ?? summary ?? t("profile.subtitle.fallback")}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {stageLabel && (
              <span className="rounded-full bg-surface-container-high px-4 py-1.5 text-label-md text-on-surface-variant">
                {stageLabel}
              </span>
            )}
            {home?.country && (
              <span className="rounded-full bg-surface-container-high px-4 py-1.5 text-label-md text-on-surface-variant">
                📍 {home.city ? `${home.city}, ` : ""}{home.country}
              </span>
            )}
            {home?.eduSystem && (
              <span className="rounded-full bg-surface-container-high px-4 py-1.5 text-label-md text-on-surface-variant">
                {home.eduSystem}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ProfileChapters({ answers, reduce }: { answers: Answers; reduce: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const firstName = typeof answers.firstName === "string" ? answers.firstName : undefined;

  return (
    <section className="mt-14">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
      >
        <div>
          <h2 className="text-headline-sm text-on-background">{t("profile.breakdown.title")}</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {t("profile.breakdown.body")}
          </p>
        </div>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-on-surface-variant"
        >
          ▾
        </motion.span>
      </button>

      {open && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {CHAPTERS.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.04 }}
              className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5"
            >
              <h3 className="text-label-md font-semibold text-primary">
                {ch.emoji} {t("profile.breakdown.chapter")} {ch.id} — {t(`chapter.${ch.id}.title`)}
              </h3>

              <ul className="mt-3 space-y-2.5">
                {getChapterFields(ch.id).map((field) => {
                  const step = STEPS.find((s) => s.field === field);
                  const localStep = step ? localizeStepWith(t, step) : undefined;
                  const display = formatAnswer(field, answers[field], localStep);
                  if (!display) return null;

                  const isKey = ["firstName", "lifeStage", "grades", "financialNeed", "home"].includes(field);
                  const label = localStep?.title
                    ? personalize(localStep.title, firstName).split("—")[0].split("?")[0].trim()
                    : field;
                  return (
                    <li key={field} className="flex items-start gap-2.5">
                      <span aria-hidden className="flex h-6 shrink-0 items-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isKey ? "bg-secondary-container" : "bg-outline-variant"
                          }`}
                        />
                      </span>
                      <div>
                        <span className="text-label-sm font-medium text-on-surface-variant">
                          {label}:
                        </span>{" "}
                        <span className="text-body-md text-on-surface">{display}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <motion.div
        className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-2xl">
          📝
        </span>
        <h1 className="mt-6 text-display-lg-mobile text-on-background">{t("profile.empty.title")}</h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          {t("profile.empty.body")}
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding" })}
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary-container px-7 text-label-md text-on-primary shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)]"
        >
          {t("profile.empty.cta")}
        </button>
      </motion.div>
    </div>
  );
}

function getChapterFields(chapter: ChapterId): string[] {
  return STEPS.filter((s) => s.chapter === chapter).map((s) => s.field);
}

function formatAnswer(field: string, value: unknown, step?: ReturnType<typeof getStep>): string | null {
  if (value == null) return null;

  if (field === "home") {
    const v = value as { country: string; city?: string; eduSystem?: string };
    if (!v.country) return null;
    return v.city ? `${v.city}, ${v.country}` : v.country;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  const singleVal = value as { choice?: string; detail?: string; detailScale?: string };
  if (singleVal.choice && step && "options" in step) {
    const opt = step.options.find((o) => o.value === singleVal.choice);
    let label = opt?.label ?? singleVal.choice;
    if (singleVal.detail) label += ` (${singleVal.detail}${singleVal.detailScale ? ` / ${singleVal.detailScale}` : ""})`;
    return label;
  }

  const multiVal = value as { selected?: string[] };
  if (multiVal.selected?.length && step && "options" in step) {
    return multiVal.selected
      .map((v) => step.options.find((o: { value: string }) => o.value === v)?.label ?? v)
      .join(", ");
  }

  const rankVal = value as { ranked?: string[] };
  if (rankVal.ranked?.length && step && "options" in step) {
    return rankVal.ranked
      .map((v, i) => `${i + 1}. ${step.options.find((o: { value: string }) => o.value === v)?.label ?? v}`)
      .join("; ");
  }

  const testVal = value as { selected?: string[]; scores?: Record<string, string> };
  if (testVal.selected?.length && step && "options" in step) {
    return testVal.selected
      .map((v) => {
        const label = step.options.find((o: { value: string }) => o.value === v)?.label ?? v;
        const score = testVal.scores?.[v];
        return score ? `${label} (${score})` : label;
      })
      .join(", ");
  }

  return null;
}
