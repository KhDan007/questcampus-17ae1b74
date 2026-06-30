# Apply Flow Redesign

The current Apply experience hides the primary CTA inside a small icon button on saved-uni cards, has no multi-select, no guided onboarding for the user's own data, and dumps the user on a waiting screen while deep research runs. We'll rebuild it as a four-stage flow with the same backend.

## The four stages

```text
1. Pick      →  2. Prep         →  3. Research          →  4. Apply
   Multi-      Guided profile +    Background w/        Live browser
   select      doc onboarding      productive work         + submit
```

The user moves linearly but can re-enter any stage from a left-rail stepper at the top of `/apply`.

## 1. Pick — intuitive Apply confirmation + multi-select

- On the saved-uni grid (`/apply` and `MyUniversitiesSection`), every card becomes a **selectable tile** with a visible checkbox in the top-right corner and a giant primary "Start application" pill across the bottom of each card. No more 12px "Apply" icon buttons.
- A persistent **bottom action bar** appears the moment ≥1 card is checked: "Apply to N universities" + secondary "Deep-research only". This is the multi-select confirm step.
- On `/universities` matches view: every match card gets the same checkbox + "Add to apply queue" action so the user can build the batch from anywhere.
- Hitting "Apply to N" goes to stage 2 with the selected IDs in route search params.

## 2. Prep — guided one-question-at-a-time onboarding

A new route `/apply/prep` shows a single-column wizard, one prompt per screen, with progress dots at top:

```text
Your name → Date of birth → Citizenship → High school → GPA →
Test scores → Activities → Documents (transcript, PS, recs, passport, resume) →
Review & confirm
```

Each step:
- One big question in display type, a clear input, "Continue" pill, "Back" link.
- Inline helper text ("This is what universities ask for. You can edit later.").
- Document steps wrap `DocumentManager` rows one at a time with skip option.
- Skipped or missing fields surface a small "3 fields still needed" chip on every later screen.
- The whole wizard auto-saves to the existing applicant-profile mutation after each step (no "save" button).

The same backend doc + profile mutations are reused; only the UI is new.

## 3. Research — kick off + redirect to productive work

When the user finishes prep (or clicks "Deep-research only" from stage 1):
- We enqueue an apply job **per selected uni** and immediately navigate to `/apply` hub showing a **Research dock** at the top: small live progress chips for each uni driven by `api.ingest.deepResearch.deepResearchProgress({ system, externalId })`.
- The hero of `/apply` switches to a **"While we research, do this"** card with 2–3 suggested productive actions ranked by progress signals: finish profile gaps, upload missing doc, draft personal statement (link to `/essay`), refine recommendations. Each is a single primary CTA, not a list.
- Status states render per spec: `researching_deep` → compact progress with stage/message, `ready` → green check + "Open application", `paywalled` → amber chip with copy, `error` → muted chip "Couldn't finish — public requirements still available". Never block the page.

## 4. Apply — already exists, only entry-point changes

When a uni flips to `ready`, the progress chip's CTA routes into the existing `/apply/$jobId` live-browser flow. No changes there.

## Files

New:
- `src/routes/apply.prep.tsx` — guided wizard route
- `src/components/apply/PrepWizard.tsx` — step engine + one-question-per-screen UI
- `src/components/apply/ApplyStepper.tsx` — Pick/Prep/Research/Apply rail used on apply screens
- `src/components/apply/SelectableUniCard.tsx` — checkbox + big CTA card used in saved + matches views
- `src/components/apply/BatchActionBar.tsx` — sticky bottom bar shown when selection > 0
- `src/components/apply/ResearchDock.tsx` — live progress chips for in-flight jobs
- `src/components/apply/NextProductiveAction.tsx` — single-CTA "while we research" card
- `src/lib/applyQueue/selection.ts` — small zustand-free hook (`useApplySelection`) for the cross-page selection set, persisted in `sessionStorage`
- `src/lib/applyQueue/deepResearch.ts` — `useDeepResearchProgress({ system, externalId })` wrapping the Convex query

Modified:
- `src/routes/apply.tsx` — new layout: stepper, Research dock, NextProductiveAction, then docs, then `SelectableUniCard` grid + `BatchActionBar`
- `src/routes/universities.tsx` — wrap each result/match card with selectable wrapper; show `BatchActionBar`
- `src/components/profile/MyUniversitiesSection.tsx` — use `SelectableUniCard`
- `src/components/apply/ApplyButton.tsx` — keep for single-uni quick-apply, restyle to match new visual weight (full-width primary inside card)
- `src/components/apply/DocumentManager.tsx` — expose a "compact step" variant the wizard reuses

Backend: zero changes. Reuses `enqueueApply`, `liveTicket`, `deepResearchProgress`, existing doc + profile mutations.

## Design register

Product UI (per Impeccable product register). Carry over the project's existing tokens (`bg-surface`, `border-on-surface`, `qc-hard-shadow`, primary/tertiary). Motion is restrained: one-question wizard slides horizontally with `motion` x-transition + opacity, progress chips animate the percent bar only. Reduced-motion fallback: crossfade.

## Out of scope this pass

- Backend changes
- Per-uni custom essays (different feature)
- Reordering the application queue (can add later if asked)
- Visual redesign of the existing `/apply/$jobId` live-browser page
