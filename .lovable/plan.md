# Onboarding v2 + Live Match Cards

The spec replaces the placeholder "Refine now" → waitlist flow on the dashboard with a real **single-page onboarding** that saves to Convex and produces **much more accurate matches**. Match cards already have a dropdown that calls `enrich.onOpen` — they just need a few small additions to match the spec exactly.

## 1. New route: `/onboarding` (single-page form, signed-in only)

Create `src/routes/onboarding.tsx`:

- **Auth-gated**: in `beforeLoad` / on mount, if `!isAuthenticated`, redirect to `/signin?redirect=/onboarding`. Anonymous users hitting the URL never see the form.
- Hero header matching landing2 style ("Tell us more — we'll re-rank your matches.")
- One scrollable page, visually grouped into 4 sections:
  1. **You** — `firstName`, `home.country`, `lifeStage.choice`
  2. **Where & what you want to study** — `targetCountries.selected` (★), `fields.selected` (★), `subjects.selected`
  3. **Academics** — `grades` (with optional exact GPA + scale), `tests` (sat/act/none, score band or exact)
  4. **Money, fit & future** — `financialNeed`, `budget`, `uniSize`, `campusVibe`, `priorities` (max 3), `futureSelf`
- Send values **verbatim** as listed in the spec (e.g. `hs-junior`, `engineering`, `under_10k`, etc.).
- Auto-save (debounced ~600 ms) via `api.onboarding.saveProgress({ sessionId, token, answers, currentStep })` where `currentStep` = count of filled fields.
- Prefill via `useQuery(api.onboarding.getActive, { sessionId, token })`.
- "Anywhere / open" target-countries pill sends `{ selected: [] }`.
- Submit button: `api.onboarding.complete({ sessionId, token, answers, completedAt })` → navigate to `/dashboard?refresh=1`.

## 2. Dashboard wiring

`src/routes/dashboard.tsx`:
- "Refine now" button → `<Link to="/onboarding">` instead of opening the waitlist popup. (If somehow shown to an anonymous user, the route guard handles redirect.)
- After landing from `/onboarding` (presence of `?refresh=1`), call `api.rag.recommend.recommend({ sessionId, token, plan: "free", force: true })` and render results inline with `UniversityCard` (replacing the old "Your university matches" stored in localStorage). Keep the existing localStorage card view as a fallback when no Convex data exists.

## 3. Match-card additions (small)

`src/components/profile/UniversityCard.tsx`:
- Extend `RecCard` with `id`, `source`, `region`, `globalRank`, `languageOfInstruction`, `intlTuition`, `intlTuitionCurrency`, `ieltsOverall`, `toeflIbt`, `fields` (all optional).
- Pass `id` (preferred) to `EnrichmentDetails`.
- Always show the **Official website** link when `website` is present (already done).

`src/components/profile/EnrichmentDetails.tsx`:
- Add `insights: Array<{ category, text, sourceUrl }>` to the type and render them grouped at the bottom of the dropdown. Each insight: verbatim text + small "source" link. Fallback "Not listed — check official site" already exists.

## 4. Cleanup

- Remove the dashboard's "Refined recommendations" upcoming-waitlist tile — onboarding is now live.
- Keep the existing `linkOnLogin` call unchanged.

## Out of scope

- No backend changes (spec says backend is already deployed).
- No payment-flow changes — `recommend({ plan: "paid" })` keeps the existing unlock gate.
- The landing-page mini-quiz (`HeroQuiz`) stays as-is — it's the lightweight funnel; `/onboarding` is the deep, signed-in-only one.

## Technical notes

- Auth gate uses the existing `useAuth()` hook + `<Navigate to="/signin" />`, mirroring the pattern already used elsewhere (no new `_authenticated` layout needed for one route).
- Convex calls via `useMutation` / `useAction` / `useQuery` from `convex/react` (already wired via `ConvexClientProvider`).
- Form state stored in a single `answers` object so save/load is one shape.
- Country list reused from `HeroQuiz` (extract to `src/lib/onboarding/countries-v2.ts`).
