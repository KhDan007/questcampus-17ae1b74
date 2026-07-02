# Mock / Placeholder / Hardcoded Data Inventory

Grouped by area. "Real backend?" = whether a Convex query already exists we can wire in.

---

## 1. Application workspace — `src/routes/application.$system.$externalId.tsx`

This is the biggest offender. There's even a `<MockNoticeCard/>` and reusable `<MockBadge/>` (lines 303, 782) so the UI already advertises which sections are fake.

| Section | Line | Faked fields | Should show | Real backend? |
|---|---|---|---|---|
| `GeneralInfoCard` | 414–437 | Type = "Private research university", Founded = "1885", Undergraduate enrollment = "~7,600", Acceptance rate = "~4%", Tuition = "$62,000 / yr", Setting hardcoded | Real per-university enrichment: control (public/private), founded year, enrollment, acceptance rate, tuition/fees, campus setting | **No dedicated query.** `useSavedUniversities` returns basic saved fields (name, city, country, source, externalId, website) — no facts. Needs a new `api.universities.enrichment` / `api.universities.getFacts` (backend enrichment pipeline). |
| `DeadlinesCard` | 450–481 | 4 hardcoded rows: Early Action Nov 1 2026, Regular Decision Jan 5 2027, CSS Profile Feb 15 2027, Decision late March 2027 — identical for every school | Per-university deadline list from the same deep-research pass that populates the intake plan | **Partial.** `useIntakePlan` already runs research per target — but doesn't currently return a `deadlines[]` array. Backend needs to expose deadlines on the intake result (or a sibling query). |
| `ScholarshipsCard` | 656–701 | 3 hardcoded scholarships: "Need-based aid up to full tuition", "International Merit $5k–$20k", "STEM Excellence $10k / yr, Dec 15" | Per-school aid programs (name, award, notes, deadline, applyUrl) | **No.** Needs new backend query — probably `api.universities.scholarships` fed by the same research worker. |
| `MockBadge` component | 303 | Renders literal text "Mock" | Should be deleted once the three sections above have real data | — |
| `MockNoticeCard` | 782 | Amber banner announcing which sections are placeholder | Delete alongside `MockBadge` | — |

Sections on this route that are **already real** and should stay wired:
- `EligibilityCardSection` (verdict/blockers/warnings/unknowns) — from `useEligibility`
- `RequirementsList` (essays / documents / questions / recs) — from `useIntakePlan → items`
- `ReadinessCard` — from `useChecklist`
- `QuickLinks` — uses saved uni `website`

---

## 2. Essay — `src/routes/essay.tsx` + `src/components/essay/EssayReview.tsx`

| Section | Line | Faked | Should show | Real backend? |
|---|---|---|---|---|
| `mockStories.ts` — `MOCK_SENTENCES` | 4–17 | 12 fake vignettes ("smell of stale chalk…", "grandmother's hands…") | Real user memories — either the user writes them, or the essay-generation backend proposes them | **Yes for real generation** (Convex `api.essays.*` returns real essay text with `[ADD: …]` placeholders). The mock-story feature is an *intentional* teaser fallback — decide if it stays as a UX gimmick or is removed. |
| Autofill mock stories button | essay.tsx 1611–1615, EssayReview.tsx 729–746 | Uses `fillPlaceholdersWithMocks` to auto-fill blanks with the 12 canned lines | If mocks are removed from the product, delete these buttons | — |
| `FreeTrialScoreBanner` — `scoreFor` / `weakAreasFor` | 2205–2245 | Deterministic pseudo-score (62–78) from a hash of the essayId + 3 canned "weak areas" (Hook / Specificity / Ending / Voice / Reflection) | Real essay-review score + AI-generated weak areas | **Partial.** There's a real review path (`EssayReview` uses backend review), but this teaser banner shown to *free-trial* users is entirely synthetic. Wire to a lightweight backend "score preview" or gate the real review behind it. |

---

## 3. Dashboard — `src/routes/dashboard.tsx`

| Section | Line | Faked | Should show | Real backend? |
|---|---|---|---|---|
| `COMING_SOON` tiles | 84–103 | 3 hardcoded "Deadline tracker", "Auto-Apply", "Scholarship matcher" — Auto-Apply is now LIVE, so this is misleading | Real feature status. Remove Auto-Apply. Deadline tracker + Scholarship matcher can stay as roadmap tiles | Auto-Apply already exists (`useActiveApplyJob`, `useApplyActions`). |
| `qc.landing.matches` localStorage | 108, 155, essay.tsx 233 | Reads/writes matches to localStorage as a cache | Should read `saved` shortlist + recommendations directly from backend on every mount; localStorage is a leftover from the guest-onboarding path | `useSavedUniversities` + `api.rag.recommend.recommend` already exist. |
| `ToolTile` "Coming soon" badge | 565 | Static badge | Same as above | — |
| Waitlist "30% off monthly" copy | 428, 461 | Hardcoded pricing/discount string | Read from `WAITLIST_BASE_DISCOUNT` (already in `src/lib/config.ts`) instead of hardcoding "30%" inline | Already exported constant. |

---

## 4. Profile — `src/routes/profile.tsx`

| Section | Line | Faked | Should show | Real backend? |
|---|---|---|---|---|
| Hero `Stat` cards | 203–208 | "Account = Active/Guest", **"Waitlist discount = 30% off"** hardcoded, "Your matches = recs.length" (real) | Waitlist stat should read `WAITLIST_BASE_DISCOUNT` from config, not a literal | Constant already exists. |
| "Coming soon" tiles (`UpcomingTile`, section 322–362) | 322–362 | "Bookmark & compare" tile marked coming-soon; badges hardcoded to "Coming soon" | Real roadmap flags OR delete once shipped | No roadmap-status query. |
| Copy: "30% off monthly access" | 184, 328, 380 | Hardcoded | Use config constant | — |

---

## 5. Apply flow — `src/routes/apply.tsx`, `apply.$jobId.tsx`, `apply.prep.tsx`, subcomponents

Mostly real. Remaining stubs:

| File | Line | Faked | Should show | Real backend? |
|---|---|---|---|---|
| `apply.prep.tsx` | 1–5 | Entire route is a `<Navigate to="/dashboard" />` stub — no prep UI | A real prep screen (documents + eligibility + readiness overview) OR delete the route and remove all links to `/apply/prep` (dashboard TaskRail line 851 still links to it) | Existing components (`CollectWorkspace`, `DocumentManager`, `ReadinessRail`) can compose this. |
| `NextProductiveAction.tsx` | 21–47 | Hardcoded action ladder (profile → docs → essay). Links point to `/apply/prep` which is the stub route above | Real "next best action" driven by `useApplicantProfile` (already used) + real doc/essay counts | Signals are all real; the branching text just needs the target route to exist. |
| `ResearchProgressModal.tsx` `SIDE_ACTIONS` | 25–47 | 3 hardcoded side tiles pointing to /dashboard, /essay, /apply | Fine as static shortcuts, but "Upload your transcript" should be gated on real doc state (`useApplicationDocuments`) rather than static | Docs query exists. |

Sections that are **fully real**: `ResearchDock`, `ResumeBanner`, `SelectableUniCard`, `BatchActionBar`, `LiveCanvas`, `LaunchBar`, `CollectWorkspace`, `EligibilityCard`, `DocumentManager`, `ApplyStepper`.

---

## 6. Onboarding & Profile inputs — `src/lib/apply/profile.ts`, `src/lib/onboarding/steps.ts`

Not mocks — these are legitimate **input placeholders** (empty-field hints like "Sofia", "3.8 / 4.0", "SAT 1480, TOEFL 108"). Keep as-is. Flagging so you can ignore them in the sweep.

---

## 7. Landing pages — `src/components/landing/*` and `src/components/landing2/*`

Marketing content — mostly intentional showcase copy, not app data. Flag list only:

| File | Line | Content | Verdict |
|---|---|---|---|
| `landing2/ResultsReveal.tsx` | 41–58 | `LOCKED_MATCHES` — 2 canned Trinity/NUS teaser cards behind the paywall | Intentional teaser. Keep OR pull 2 real cards from `recommend` with names blurred. |
| `landing2/ResultsReveal.tsx` | 78–84 | `THINKING_STEPS` — 5 canned "Indexing… / Cross-referencing…" lines | Cosmetic loader copy. Keep. |
| `landing2/ResultsReveal.tsx` | 244 | Inline `match: 82` in a demo card | Same as above. |
| `landing2/ParallaxShowcase.tsx` | 7–9 | `ROW_A/B/C` hardcoded university names for the marquee | Cosmetic. Keep. |
| `landing2/LivingBackground.tsx` | 16 | `UNIVERSITIES` decorative background list | Cosmetic. Keep. |
| `landing2/HeroQuiz.tsx` | 16 | `COUNTRY_OPTIONS` for the quiz | Shared onboarding options — real UI data. Keep. |
| `landing2/RoadmapV2.tsx` | 6–32 | `FEATURES` roadmap tiles all `badge: "Coming soon"` | Marketing roadmap — decide per row whether it's still coming soon (Auto-Apply is live). |
| `landing2/HowItWorks.tsx`, `landing/HowItWorks.tsx`, `landing/ProblemSection.tsx`, `landing/PricingSection.tsx` | — | `STEPS`, `PAINS`, `FREE_KEYS`, `PAID_KEYS` | Marketing copy driven by i18n. Keep. |
| `landing/PricingSection.tsx` + others | — | "30% off", "11,000+ universities", "First draft free" | Marketing constants. Use `WAITLIST_BASE_DISCOUNT` / config where present. |
| `RecommendationsSection.tsx` | 32–40 | `TEASER` — 3 blurred fake cards behind the paid paywall | Intentional teaser. Keep. |

---

## 8. Universities / Search — `src/routes/universities.tsx`, `src/components/universities/*`

Fully backed by real backend (`useSavedUniversities`, `api.universities.search`, `SaveToggle`). No mocks. The only strings are UI placeholder text ("e.g. Stanford, ETH…").

---

## 9. Cross-cutting hardcoded numbers to remove

| Value | Files | Real source |
|---|---|---|
| `"11,000+"` universities | `UniversitySearchSection.tsx:29`, `dashboard.tsx:342`, `index.tsx:27`, `__root.tsx:101–102`, `tos.tsx:74`, `ParallaxShowcase.tsx:144`, `ResultsReveal.tsx:79`, `HeroOnboarding.tsx:55`, `HowItWorks.tsx:10` | Should be a single constant (or a `api.universities.count` query) — currently repeated ~9 times. |
| `"30% off"` waitlist discount | dashboard, profile, signin | `WAITLIST_BASE_DISCOUNT` already exists in `src/lib/config.ts` — replace literals. |

---

# Sections already backed by real data (green — nothing to do)

- **Auth / user**: `useAuth`, sign-in, email verify.
- **Recommendations**: `RecommendationsSection`, `MyUniversitiesSection` — all via `api.rag.recommend.recommend`.
- **Saved universities**: `useSavedUniversities`, `SaveToggle`.
- **University search**: `UniversitySearchSection`, `universities` route.
- **Application intake**: `useIntakePlan`, `useEligibility`, `useChecklist`, `useListAnswers`, `useAnswerEligibility`, `setAnswer`.
- **Auto-apply queue**: `useApplyJob`, `useActiveApplyJob`, `useApplyActions`, `useApplicationDocuments`, `fetchLiveTicket`, live WebSocket canvas.
- **Payments/entitlement**: `api.payments.entitlement`, `UnlockButton`.
- **Waitlist / referrals**: `lib/waitlist/api.ts`, `lib/referral/client.ts`.
- **Essay generation & review**: real `api.essays.*` (only the free-trial *score banner* and the mock-story autofill are synthetic).
- **Task rail, ResumeBanner, StatBar** on dashboard.

---

# Suggested prioritization for wiring

1. **`application.$system.$externalId.tsx`** — 3 fake sections (General info, Deadlines, Scholarships) + delete `MockBadge`/`MockNoticeCard`. Blocked on backend exposing university enrichment + per-target deadlines + scholarships.
2. **`apply.prep.tsx`** — decide: build it or delete it. Currently dashboard TaskRail links to a `<Navigate>` stub.
3. **`FreeTrialScoreBanner`** in `essay.tsx` — replace synthetic score with real (or gate behind paid review).
4. **`mockStories.ts` autofill** — remove if you don't want fake user memories being pasted into real essays.
5. **`COMING_SOON` on dashboard** — remove Auto-Apply tile (it's live).
6. **Constants sweep** — replace hardcoded "30% off" and "11,000+" with config values.
