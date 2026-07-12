import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Trophy, Lightbulb, Lock } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SectionCard } from "@/components/apply/CommonAppProfile";
import { GuidedActivitiesEditor } from "@/components/apply/GuidedActivitiesEditor";
import { SilentErrorBoundary } from "@/components/SilentErrorBoundary";
import { Card, PageHeader, SectionHeading, IconTile, EmptyState } from "@/components/ui/calm";
import { useAuth } from "@/lib/auth/useAuth";
import {
  useCommonAppSchema,
  useCommonAppProfile,
  usePrefillFromOnboarding,
} from "@/lib/apply/commonAppProfile";
import { useActivitySuggestions, useRefreshSuggestions } from "@/lib/apply/activityCoach";
import { useSetAnswer } from "@/lib/apply/intake";

export const Route = createFileRoute("/activities")({
  head: () => ({
    meta: [
      { title: "Activities & honors - QuestCampus" },
      {
        name: "description",
        content:
          "List your extracurricular activities, leadership, and awards once — QuestCampus reuses them across every application.",
      },
    ],
  }),
  component: ActivitiesPage,
});

// Which universal-profile sections belong on this page: the real activities
// repeat group (group key "activity") + any honors/awards section. Matching the
// group key (not a loose title regex) avoids pulling in unrelated sections that
// merely contain "activity" in their title.
const HONORS_SECTION_RE = /honou?r|award/i;

function ActivitiesPage() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return (
      <DashboardShell>
        <main className="mx-auto w-full max-w-(--container-content) px-4 pt-20 sm:px-6 lg:px-8">
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-on-surface/8 bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface-variant qc-soft-shadow">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activities...
          </div>
        </main>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" search={{ redirect: "/activities" } as never} />;
  }

  return (
    <DashboardShell>
      <main
        id="main-content"
        className="mx-auto w-full max-w-(--container-content) px-4 pb-16 pt-20 sm:px-6 lg:px-8"
      >
        <Link
          to="/apply"
          className="inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface/70 hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" /> Applications
        </Link>

        <PageHeader
          className="mt-6"
          title="Activities & honors"
          subtitle="Your extracurriculars, leadership, and awards — filled once, reused across every application."
        />

        <div className="mt-6">
          <SilentErrorBoundary>
            <ActivitiesBody />
          </SilentErrorBoundary>
        </div>
      </main>
    </DashboardShell>
  );
}

function ActivitiesBody() {
  const schema = useCommonAppSchema();
  const profile = useCommonAppProfile();
  const setAnswer = useSetAnswer();
  const prefill = usePrefillFromOnboarding();
  const [prefilling, setPrefilling] = useState(false);

  const onPrefill = useCallback(async () => {
    if (prefilling) return;
    setPrefilling(true);
    try {
      const res = await prefill();
      toast[res.filled > 0 ? "success" : "message"](
        res.filled > 0
          ? `Prefilled ${res.filled} field${res.filled === 1 ? "" : "s"} from your onboarding.`
          : "Nothing new to prefill.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prefill failed");
    } finally {
      setPrefilling(false);
    }
  }, [prefill, prefilling]);

  const answers = profile?.answers ?? {};
  const sections = useMemo(
    () =>
      (schema ?? []).filter(
        (s) => s.group?.groupKey === "activity" || HONORS_SECTION_RE.test(`${s.key} ${s.title}`),
      ),
    [schema],
  );

  const statusByKey = useMemo(() => {
    const map = new Map<
      string,
      { complete: boolean; requiredDone: number; requiredTotal: number }
    >();
    profile?.completeness?.sections.forEach((s) =>
      map.set(s.key, {
        complete: s.complete,
        requiredDone: s.requiredDone,
        requiredTotal: s.requiredTotal,
      }),
    );
    return map;
  }, [profile]);

  if (profile === null) {
    return (
      <Card className="p-6 text-body-md text-on-surface-variant">
        Sign in to build your activities list.
      </Card>
    );
  }
  if (schema === undefined || profile === undefined) {
    return (
      <Card className="flex items-center justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-headline-sm font-bold text-on-surface">
              Two strength areas live here
            </h2>
            <p className="mt-1 max-w-xl text-body-sm text-on-surface-variant">
              Extracurricular depth and honors both come straight from this list. Fill it in to lift
              your application strength.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPrefill}
          disabled={prefilling}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {prefilling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          Prefill from onboarding
        </button>
      </Card>

      {sections.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nothing to fill yet"
          body="Your activities and honors sections will appear here once your profile is set up."
          action={
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-[var(--font-label)] text-label-md font-bold text-white transition-colors hover:bg-primary/90"
            >
              Open Applications <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        sections.map((section) =>
          section.group?.groupKey === "activity" ? (
            <GuidedActivitiesEditor
              key={section.key}
              section={section}
              answers={answers}
              setAnswer={setAnswer}
            />
          ) : (
            <SectionCard
              key={section.key}
              section={section}
              status={statusByKey.get(section.key)}
              answers={answers}
              setAnswer={setAnswer}
            />
          ),
        )
      )}

      <SilentErrorBoundary>
        <ActivitySuggestionsSection />
      </SilentErrorBoundary>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <p className="min-w-0 text-body-sm text-on-surface-variant">
          These feed every application. Manage the rest of your universal profile in Applications.
        </p>
        <Link
          to="/apply"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-4 py-2 font-[var(--font-label)] text-label-md font-bold text-on-surface transition-colors hover:bg-on-surface/5"
        >
          Open Applications <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}

// Gap-filling new-activity suggestions (the "suggest activities" half of the
// merged coach): a free ranked candidate list, with a paid AI-personalized
// pitch for why each fits this student.
function ActivitySuggestionsSection() {
  const data = useActivitySuggestions();
  const refresh = useRefreshSuggestions();
  const { hasPaidAccess } = useAuth();
  const [busy, setBusy] = useState(false);

  if (data === undefined || data.candidates.length === 0) return null;

  const anyPitch = data.candidates.some((c) => c.pitch);
  const canPersonalize = hasPaidAccess && (data.suggestionsStale || !anyPitch);

  async function personalize() {
    if (busy) return;
    setBusy(true);
    const ok = await refresh();
    if (!ok) toast.error("Couldn't personalize just now — try again.");
    setBusy(false);
  }

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeading
        title="Ideas to strengthen your list"
        subtitle="New activities that fill your current gaps, matched to your intended field."
        aside={
          canPersonalize ? (
            <button
              type="button"
              onClick={personalize}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-on-surface/15 bg-surface px-3 py-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
              Personalize
            </button>
          ) : undefined
        }
      />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.candidates.map((c) => (
          <li
            key={c.catalogId}
            className="flex flex-col gap-2 rounded-xl border border-on-surface/8 bg-surface-container-lowest p-4 qc-soft-shadow"
          >
            <div className="flex items-start gap-3">
              <IconTile icon={Lightbulb} tone="amber" size="sm" />
              <div className="min-w-0">
                <p className="font-[var(--font-label)] text-label-md font-bold text-on-surface">{c.title}</p>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{c.blurb}</p>
              </div>
            </div>
            {c.pitch ? (
              <div className="mt-1 rounded-lg bg-primary-fixed/30 p-3">
                <p className="text-body-sm text-on-surface">{c.pitch}</p>
                {c.whyItHelps && (
                  <p className="mt-1 text-label-sm text-on-surface-variant">{c.whyItHelps}</p>
                )}
              </div>
            ) : !hasPaidAccess ? (
              <Link
                to="/unlock"
                className="mt-auto inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm font-semibold text-primary hover:underline"
              >
                <Lock className="h-3.5 w-3.5" /> Unlock a personalized pitch
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
