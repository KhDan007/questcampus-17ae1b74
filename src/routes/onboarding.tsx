import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { useAuth } from "@/lib/auth/useAuth";
import { getSessionId } from "@/lib/onboarding/session";
import { useApplyActions } from "@/lib/applyQueue/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Refine your matches — QuestCampus" },
      {
        name: "description",
        content:
          "Tell us a bit more about your goals, grades, and budget — we'll re-rank your university matches with much more precision.",
      },
    ],
  }),
  component: OnboardingPage,
});

// ── Spec-mandated option lists (values sent verbatim) ────────────────────────
const TARGET_COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Ireland", label: "Ireland" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "Sweden", label: "Sweden" },
  { value: "Italy", label: "Italy" },
  { value: "Spain", label: "Spain" },
  { value: "Denmark", label: "Denmark" },
  { value: "Finland", label: "Finland" },
  { value: "Belgium", label: "Belgium" },
  { value: "Austria", label: "Austria" },
  { value: "Japan", label: "Japan" },
  { value: "China", label: "China" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

const LIFE_STAGES = [
  { value: "hs-junior", label: "High school junior" },
  { value: "hs-senior", label: "High school senior" },
  { value: "gap", label: "Gap year" },
  { value: "transfer", label: "Transferring" },
  { value: "postgrad", label: "Postgrad" },
];

const FIELDS = [
  { value: "engineering", label: "Engineering" },
  { value: "science", label: "Sciences" },
  { value: "cs", label: "Computer science" },
  { value: "business", label: "Business" },
  { value: "arts", label: "Arts & design" },
  { value: "medicine", label: "Medicine & health" },
  { value: "law", label: "Law" },
  { value: "social", label: "Social sciences" },
  { value: "education", label: "Education" },
  { value: "media", label: "Media & communication" },
  { value: "humanities", label: "Humanities" },
  { value: "math", label: "Mathematics" },
  { value: "performing", label: "Performing arts" },
  { value: "hospitality", label: "Hospitality" },
  { value: "unsure", label: "Not sure yet" },
];

const GRADES = [
  { value: "top", label: "Top of class" },
  { value: "strong", label: "Strong" },
  { value: "middle", label: "Middle" },
  { value: "mixed", label: "Mixed" },
  { value: "improving", label: "Improving" },
  { value: "exact", label: "I'll enter my exact GPA" },
];

const GRADE_SCALES = ["4.0", "5.0", "10", "100"] as const;

const SAT_BANDS = ["<1200", "1200-1350", "1350-1450", "1450-1550", "1550+"] as const;
const ACT_BANDS = ["<24", "24-28", "28-31", "31-34", "34-36"] as const;
const IELTS_BANDS = ["<6.0", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5+"] as const;

const FINANCIAL_NEED = [
  { value: "critical", label: "Critical — aid decides where I can go" },
  { value: "very", label: "Very important" },
  { value: "helpful", label: "Helpful but not required" },
  { value: "self_funded", label: "Self-funded" },
  { value: "open", label: "Open / not sure" },
];

const BUDGETS = [
  { value: "under_10k", label: "Under $10k / year" },
  { value: "10_25k", label: "$10k – $25k" },
  { value: "25_45k", label: "$25k – $45k" },
  { value: "45_70k", label: "$45k – $70k" },
  { value: "over_70k", label: "Over $70k" },
  { value: "no_limit", label: "No real limit" },
];

const UNI_SIZES = [
  { value: "small", label: "Small (<5k)" },
  { value: "medium", label: "Medium (5–15k)" },
  { value: "large", label: "Large (15k+)" },
  { value: "no_pref", label: "No preference" },
];

const CAMPUS_VIBES = [
  "urban",
  "suburban",
  "rural",
  "big_sports",
  "artsy",
  "research_intensive",
  "close_knit",
  "diverse",
  "entrepreneurial",
  "social_impact",
  "quiet",
  "lively",
  "no_pref",
];

const PRIORITIES = [
  { value: "affordability", label: "Affordability" },
  { value: "prestige", label: "Prestige" },
  { value: "career", label: "Career outcomes" },
  { value: "research", label: "Research strength" },
  { value: "community", label: "Community & vibe" },
  { value: "location", label: "Location" },
];

// "Your basics" — identity + contact fields the auto-apply demo and Common App
// intake need. Values are sent verbatim; enum labels match the backend Common
// App profile options exactly so prefill maps cleanly.
const CITIZENSHIP_STATUSES = [
  { value: "U.S. Citizen or National", label: "US citizen or national" },
  { value: "U.S. Dual Citizen", label: "US dual citizen" },
  { value: "U.S. Permanent Resident", label: "US permanent resident" },
  { value: "Other (non-U.S.)", label: "Other (non-US)" },
  { value: "Undocumented / DACA", label: "Undocumented / DACA" },
];

const SEX_OPTIONS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "X or another legal sex", label: "X or another legal sex" },
];

// ── Types matching the backend contract ──────────────────────────────────────
type Answers = {
  firstName?: string;
  home?: { country: string };
  lifeStage?: { choice: string };
  targetCountries?: { selected: string[] };
  fields?: { selected: string[] };
  subjects?: { selected: string[] };
  grades?: { choice: string; detail?: string; detailScale?: string };
  tests?: { selected: string[]; scores?: { sat?: string; act?: string; ielts?: string } };
  financialNeed?: { choice: string };
  budget?: { choice: string };
  uniSize?: { choice: string };
  campusVibe?: { selected: string[] };
  priorities?: { selected: string[] };
  futureSelf?: { choice: string };
  // "Your basics" — identity + contact. Keys line up with the backend
  // onboardingKey mappings so the Common App profile prefills from them.
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPostal?: string;
  nationality?: string;
  citizenshipStatus?: { choice: string };
  graduationDate?: string;
  sexAssignedBirth?: { choice: string };
  highSchoolName?: string;
};

function countFilled(a: Answers): number {
  let n = 0;
  if (a.firstName?.trim()) n++;
  if (a.home?.country) n++;
  if (a.lifeStage?.choice) n++;
  if (a.targetCountries) n++; // selecting "anywhere" still counts
  if (a.fields?.selected?.length) n++;
  if (a.subjects?.selected?.length) n++;
  if (a.grades?.choice) n++;
  if (a.tests?.selected?.length) n++;
  if (a.financialNeed?.choice) n++;
  if (a.budget?.choice) n++;
  if (a.uniSize?.choice) n++;
  if (a.campusVibe?.selected?.length) n++;
  if (a.priorities?.selected?.length) n++;
  if (a.futureSelf?.choice) n++;
  return n;
}

function OnboardingPage() {
  const { isAuthenticated, token, session } = useAuth();
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  // Auth gate — wait for hydration, then redirect anonymous users.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const sessionId = useMemo(() => getSessionId(), []);

  // Prefill from server (latest profile or anonymous draft for this browser).
  const profile = useQuery(
    api.onboarding.getActive,
    hydrated ? { sessionId, token: token ?? undefined } : "skip",
  ) as { answers?: Answers } | null | undefined;

  const [answers, setAnswers] = useState<Answers>({});
  const [hasPrefilled, setHasPrefilled] = useState(false);

  // Seed firstName from auth profile when no answers yet.
  useEffect(() => {
    if (hasPrefilled) return;
    if (profile?.answers && typeof profile === "object") {
      setAnswers(profile.answers);
      setHasPrefilled(true);
      return;
    }
    if (profile === null) {
      // No saved draft. Seed first name from the auth user if we have one.
      const n = session?.user?.name?.trim();
      if (n) setAnswers({ firstName: n.split(/\s+/)[0] });
      setHasPrefilled(true);
    }
  }, [profile, hasPrefilled, session]);

  // Debounced auto-save.
  const saveProgress = useMutation(api.onboarding.saveProgress);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!hasPrefilled) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProgress({
        sessionId,
        token: token ?? undefined,
        answers,
        currentStep: countFilled(answers),
      })
        .then(() => setSavedAt(Date.now()))
        .catch(() => {});
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, hasPrefilled, saveProgress, sessionId, token]);

  const complete = useMutation(api.onboarding.complete);
  const recommend = useAction(api.rag.recommend.recommend);
  const { startDemo } = useApplyActions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When arriving via a "run the demo" CTA (?next=demo), we bounce the user
  // straight into the live demo after they finish, instead of the dashboard.
  const wantsDemo = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("next") === "demo";
  }, []);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await complete({
        sessionId,
        token: token ?? undefined,
        answers,
        completedAt: Date.now(),
      });
      // Kick off a fresh recommendation (force) so the dashboard has it ready.
      void recommend({ sessionId, token: token ?? undefined, plan: "free", force: true });
      // Clear stale localStorage matches so dashboard shows the new ones.
      try {
        window.localStorage.removeItem("qc.landing.matches");
      } catch {
        // Stale local matches are harmless if storage is unavailable.
      }
      // Return-to-demo: now that we have their real answers, run the demo.
      if (wantsDemo) {
        try {
          const { jobId } = await startDemo(true);
          navigate({ to: "/apply/$jobId", params: { jobId } });
          return;
        } catch {
          // If the demo can't start, fall through to the dashboard gracefully.
        }
      }
      navigate({ to: "/dashboard", search: { refresh: 1 } as never });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  // ── Render guards ──
  if (hydrated && !isAuthenticated) {
    // Preserve ?next=demo (and any other query) through the sign-in round-trip.
    const redirect =
      typeof window !== "undefined" && window.location.search
        ? `/onboarding${window.location.search}`
        : "/onboarding";
    return <Navigate to="/signin" search={{ redirect } as never} />;
  }

  const canSubmit =
    !!answers.fields?.selected?.length && (countFilled(answers) >= 3);

  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto w-full max-w-3xl px-5 pb-24 pt-28 sm:px-8"
      >
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-[var(--font-label)] text-label-sm uppercase tracking-[0.18em] text-primary">
            Detailed onboarding
          </p>
          <h1 className="mt-3 text-display-md text-on-surface text-balance sm:text-display-lg">
            Tell us more.{" "}
            <span className="text-primary">We'll re-rank your matches.</span>
          </h1>
          <p className="mt-4 text-body-lg text-on-surface-variant">
            One page, fourteen quick questions. Auto-saved as you go — only{" "}
            <strong>study fields</strong> are required to generate matches.
          </p>
          {savedAt && (
            <p className="mt-2 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-sm text-on-surface-variant">
              <Check className="h-3.5 w-3.5 text-primary" /> Saved
            </p>
          )}
        </motion.section>

        <div className="mt-10 space-y-10">
          {/* SECTION 1 — Your basics (identity + contact; leads the flow) */}
          <Section
            title="Your basics"
            subtitle="The details every application needs. Fill in what you can — you can skip any of it and we'll ask again later."
          >
            <Field label="Legal name" hint="Exactly as it appears on your official documents.">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={answers.firstName ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, firstName: e.target.value }))}
                  placeholder="Legal first name"
                  className="w-full min-w-0 rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                />
                <input
                  type="text"
                  value={answers.lastName ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, lastName: e.target.value }))}
                  placeholder="Legal last name"
                  className="w-full min-w-0 rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                />
              </div>
            </Field>

            <Field label="Date of birth">
              <input
                type="date"
                value={answers.dateOfBirth ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, dateOfBirth: e.target.value }))}
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>

            <Field label="Phone number">
              <input
                type="tel"
                value={answers.phone ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, phone: e.target.value }))}
                placeholder="Include your country code"
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>

            <Field label="Home address" hint="Where you currently live.">
              <div className="space-y-3">
                <input
                  type="text"
                  value={answers.addressStreet ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, addressStreet: e.target.value }))}
                  placeholder="Street address"
                  className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={answers.addressCity ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, addressCity: e.target.value }))}
                    placeholder="City"
                    className="min-w-0 rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                  />
                  <input
                    type="text"
                    value={answers.addressState ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, addressState: e.target.value }))}
                    placeholder="State / province"
                    className="min-w-0 rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                  />
                  <input
                    type="text"
                    value={answers.addressPostal ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, addressPostal: e.target.value }))}
                    placeholder="ZIP / postal code"
                    className="min-w-0 rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </Field>

            <Field label="Country of citizenship">
              <input
                type="text"
                value={answers.nationality ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, nationality: e.target.value }))}
                placeholder="e.g. Kazakhstan"
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>

            <Field label="Citizenship status">
              <PillGroup
                options={CITIZENSHIP_STATUSES}
                value={answers.citizenshipStatus?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, citizenshipStatus: { choice: v } }))
                }
              />
            </Field>

            <Field label="Sex assigned at birth" hint="Some application forms require this.">
              <PillGroup
                options={SEX_OPTIONS}
                value={answers.sexAssignedBirth?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, sexAssignedBirth: { choice: v } }))
                }
              />
            </Field>

            <Field label="High school name">
              <input
                type="text"
                value={answers.highSchoolName ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, highSchoolName: e.target.value }))}
                placeholder="Your current or most recent school"
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>

            <Field label="Graduation date" hint="When you finished or will finish high school.">
              <input
                type="date"
                value={answers.graduationDate ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, graduationDate: e.target.value }))}
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>
          </Section>

          {/* SECTION 2 — You */}
          <Section title="About you" subtitle="A bit of context to ground your matches.">
            <Field label="Where are you applying from?">
              <input
                type="text"
                value={answers.home?.country ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, home: { country: e.target.value } }))
                }
                placeholder="Country, e.g. Kazakhstan"
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>

            <Field label="Where are you in your journey?">
              <PillGroup
                options={LIFE_STAGES}
                value={answers.lifeStage?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, lifeStage: { choice: v } }))
                }
              />
            </Field>
          </Section>

          {/* SECTION 2 — Where & what */}
          <Section
            title="Where & what you want to study"
            subtitle="These two questions drive accuracy the hardest."
            required
          >
            <Field
              label="Target countries"
              hint='Pick one or more, or choose "Anywhere" to search all.'
            >
              <div className="flex flex-wrap gap-2">
                <Pill
                  selected={
                    answers.targetCountries != null &&
                    answers.targetCountries.selected.length === 0
                  }
                  onClick={() =>
                    setAnswers((a) => ({ ...a, targetCountries: { selected: [] } }))
                  }
                >
                  ✨ Anywhere / open
                </Pill>
                {TARGET_COUNTRIES.map((c) => {
                  const cur = answers.targetCountries?.selected ?? [];
                  const sel = cur.includes(c.value);
                  return (
                    <Pill
                      key={c.value}
                      selected={sel}
                      onClick={() => {
                        const next = sel
                          ? cur.filter((v) => v !== c.value)
                          : [...cur, c.value];
                        setAnswers((a) => ({
                          ...a,
                          targetCountries: { selected: next },
                        }));
                      }}
                    >
                      {c.label}
                    </Pill>
                  );
                })}
              </div>
            </Field>

            <Field label="Study fields" hint="Required — pick all that interest you.">
              <div className="flex flex-wrap gap-2">
                {FIELDS.map((f) => {
                  const cur = answers.fields?.selected ?? [];
                  const sel = cur.includes(f.value);
                  return (
                    <Pill
                      key={f.value}
                      selected={sel}
                      onClick={() => {
                        const next = sel
                          ? cur.filter((v) => v !== f.value)
                          : [...cur, f.value];
                        setAnswers((a) => ({ ...a, fields: { selected: next } }));
                      }}
                    >
                      {f.label}
                    </Pill>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Specific subjects you enjoy"
              hint="Free text — comma-separated. E.g. Physics, Economics, Studio Art."
            >
              <CsvField
                selected={answers.subjects?.selected ?? []}
                onChange={(list) => setAnswers((a) => ({ ...a, subjects: { selected: list } }))}
                placeholder="Physics, Economics, Studio Art"
              />
            </Field>
          </Section>

          {/* SECTION 3 — Academics */}
          <Section title="Academics" subtitle="Honest answers get honest matches.">
            <Field label="How are your grades?">
              <PillGroup
                options={GRADES}
                value={answers.grades?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({
                    ...a,
                    grades: { ...(a.grades ?? {}), choice: v },
                  }))
                }
              />
              {answers.grades?.choice === "exact" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={answers.grades?.detail ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({
                        ...a,
                        grades: { ...(a.grades ?? { choice: "exact" }), detail: e.target.value },
                      }))
                    }
                    placeholder="GPA e.g. 3.8"
                    className="rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                  />
                  <select
                    value={answers.grades?.detailScale ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({
                        ...a,
                        grades: {
                          ...(a.grades ?? { choice: "exact" }),
                          detailScale: e.target.value,
                        },
                      }))
                    }
                    className="rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
                  >
                    <option value="">Scale…</option>
                    {GRADE_SCALES.map((s) => (
                      <option key={s} value={s}>
                        out of {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Field>

            <Field label="Standardized tests" hint="Optional — what have you taken?">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "ielts", label: "IELTS" },
                  { value: "sat", label: "SAT" },
                  { value: "act", label: "ACT" },
                  { value: "none", label: "None" },
                ].map((t) => {
                  const cur = answers.tests?.selected ?? [];
                  const sel = cur.includes(t.value);
                  return (
                    <Pill
                      key={t.value}
                      selected={sel}
                      onClick={() => {
                        let next: string[];
                        if (t.value === "none") {
                          next = sel ? [] : ["none"];
                        } else {
                          next = sel
                            ? cur.filter((v) => v !== t.value)
                            : [...cur.filter((v) => v !== "none"), t.value];
                        }
                        setAnswers((a) => ({
                          ...a,
                          tests: { ...(a.tests ?? {}), selected: next },
                        }));
                      }}
                    >
                      {t.label}
                    </Pill>
                  );
                })}
              </div>

              {answers.tests?.selected?.includes("ielts") && (
                <ScorePicker
                  label="IELTS band"
                  bands={IELTS_BANDS as unknown as string[]}
                  value={answers.tests?.scores?.ielts}
                  onChange={(v) =>
                    setAnswers((a) => ({
                      ...a,
                      tests: {
                        ...(a.tests ?? { selected: [] }),
                        scores: { ...(a.tests?.scores ?? {}), ielts: v },
                      },
                    }))
                  }
                />
              )}
              {answers.tests?.selected?.includes("sat") && (
                <ScorePicker
                  label="SAT score"
                  bands={SAT_BANDS as unknown as string[]}
                  value={answers.tests?.scores?.sat}
                  onChange={(v) =>
                    setAnswers((a) => ({
                      ...a,
                      tests: {
                        ...(a.tests ?? { selected: [] }),
                        scores: { ...(a.tests?.scores ?? {}), sat: v },
                      },
                    }))
                  }
                />
              )}
              {answers.tests?.selected?.includes("act") && (
                <ScorePicker
                  label="ACT score"
                  bands={ACT_BANDS as unknown as string[]}
                  value={answers.tests?.scores?.act}
                  onChange={(v) =>
                    setAnswers((a) => ({
                      ...a,
                      tests: {
                        ...(a.tests ?? { selected: [] }),
                        scores: { ...(a.tests?.scores ?? {}), act: v },
                      },
                    }))
                  }
                />
              )}
            </Field>
          </Section>

          {/* SECTION 4 — Money / fit / future */}
          <Section
            title="Money, fit & future"
            subtitle="These re-weight the ranking and sharpen the cost-fit."
          >
            <Field label="How important is financial aid?">
              <PillGroup
                options={FINANCIAL_NEED}
                value={answers.financialNeed?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, financialNeed: { choice: v } }))
                }
              />
            </Field>

            <Field label="Yearly all-in budget your family can support">
              <PillGroup
                options={BUDGETS}
                value={answers.budget?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, budget: { choice: v } }))
                }
              />
            </Field>

            <Field label="Preferred university size">
              <PillGroup
                options={UNI_SIZES}
                value={answers.uniSize?.choice}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, uniSize: { choice: v } }))
                }
              />
            </Field>

            <Field label="Campus vibe" hint="Pick anything that feels right — or 'No preference'.">
              <div className="flex flex-wrap gap-2">
                {CAMPUS_VIBES.map((v) => {
                  const cur = answers.campusVibe?.selected ?? [];
                  const sel = cur.includes(v);
                  return (
                    <Pill
                      key={v}
                      selected={sel}
                      onClick={() => {
                        const next = sel
                          ? cur.filter((x) => x !== v)
                          : [...cur, v];
                        setAnswers((a) => ({
                          ...a,
                          campusVibe: { selected: next },
                        }));
                      }}
                    >
                      {v.replace(/_/g, " ")}
                    </Pill>
                  );
                })}
              </div>
            </Field>

            <Field
              label="What matters most?"
              hint="Pick up to 3 — these re-weight your ranking."
            >
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => {
                  const cur = answers.priorities?.selected ?? [];
                  const sel = cur.includes(p.value);
                  const atLimit = !sel && cur.length >= 3;
                  return (
                    <Pill
                      key={p.value}
                      selected={sel}
                      disabled={atLimit}
                      onClick={() => {
                        const next = sel
                          ? cur.filter((v) => v !== p.value)
                          : [...cur, p.value];
                        setAnswers((a) => ({
                          ...a,
                          priorities: { selected: next },
                        }));
                      }}
                    >
                      {p.label}
                    </Pill>
                  );
                })}
              </div>
            </Field>

            <Field label="Who do you want to become?" hint="A short phrase or career goal.">
              <input
                type="text"
                value={answers.futureSelf?.choice ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({
                    ...a,
                    futureSelf: { choice: e.target.value },
                  }))
                }
                placeholder="e.g. software engineer, doctor, founder, researcher"
                className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
              />
            </Field>
          </Section>

        </div>

        {/* Submit */}
        <div className="sticky bottom-4 z-20 mt-12">
          <div className="rounded-2xl border-2 border-on-surface bg-surface/95 p-4 backdrop-blur-md qc-hard-shadow sm:p-5">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-[var(--font-label)] text-label-md text-on-surface-variant">
                {countFilled(answers)} of 14 answered
                {!canSubmit && (
                  <span className="ml-1 text-primary">· pick at least one study field</span>
                )}
              </p>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={onSubmit}
                className="group inline-flex items-center justify-center gap-2 rounded-md border-2 border-on-surface bg-primary px-6 py-3.5 font-display text-headline-sm font-bold text-white qc-hard-shadow transition-all hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Re-rank my matches
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-body-sm text-error">{error}</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// ── Small UI primitives ──────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-on-surface bg-surface/85 p-6 backdrop-blur-md qc-hard-shadow sm:p-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-lg font-bold text-on-surface">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        {required && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-secondary-container px-2.5 py-1 font-[var(--font-label)] text-label-sm font-bold uppercase tracking-wider text-on-secondary-container">
            ★ Sharpens most
          </span>
        )}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-[var(--font-label)] text-label-md font-semibold text-on-surface">
        {label}
      </label>
      {hint && (
        <p className="mt-0.5 text-label-sm text-on-surface-variant">{hint}</p>
      )}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

// Free-text comma-separated input. The displayed value is the RAW text the user
// types — parsing to the array happens in the background. A previous version
// bound the input directly to `list.join(", ")`, so every keystroke was
// split/trim/filtered and the value snapped back, making spaces and commas
// impossible to type. Reseeds from `selected` only while unfocused (e.g. async
// answer load), so it never clobbers active typing.
function CsvField({
  selected,
  onChange,
  placeholder,
}: {
  selected: string[];
  onChange: (list: string[]) => void;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState(() => selected.join(", "));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setRaw(selected.join(", "));
  }, [selected, focused]);
  return (
    <input
      type="text"
      value={raw}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(
          e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
      placeholder={placeholder}
      className="w-full rounded-lg border-2 border-on-surface/15 bg-surface-container-lowest px-4 py-3 font-[var(--font-label)] text-label-lg text-on-surface focus:border-on-surface focus:outline-none"
    />
  );
}

function Pill({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-[var(--font-label)] text-label-md font-semibold capitalize transition-all ${
        selected
          ? "border-primary bg-primary-fixed text-on-primary-fixed"
          : "border-on-surface/15 bg-surface-container-lowest text-on-surface hover:border-on-surface hover:-translate-y-0.5"
      } ${disabled ? "cursor-not-allowed opacity-40 hover:translate-y-0" : ""}`}
    >
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Pill
          key={o.value}
          selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Pill>
      ))}
    </div>
  );
}

function ScorePicker({
  label,
  bands,
  value,
  onChange,
}: {
  label: string;
  bands: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 font-[var(--font-label)] text-label-sm font-semibold text-on-surface">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {bands.map((b) => (
          <Pill key={b} selected={value === b} onClick={() => onChange(b)}>
            {b}
          </Pill>
        ))}
        <input
          type="text"
          value={value && !bands.includes(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="or exact"
          className="w-32 rounded-full border-2 border-on-surface/15 bg-surface-container-lowest px-3 py-1.5 font-[var(--font-label)] text-label-md text-on-surface focus:border-on-surface focus:outline-none"
        />
      </div>
    </div>
  );
}
