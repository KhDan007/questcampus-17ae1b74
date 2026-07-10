# Surface requirement `coverage` honestly on the intake view

## Goal
Stop presenting thin/empty requirement sets as complete. Read the backend's per-target `coverage` (`"full" | "partial" | "error" | undefined`) from the existing `applications.intakePlan` query and reflect it in the UI, with a way to re-scan.

## Where it plugs in

- Data source (unchanged): `useIntakePlan(targets)` → `api.applications.intakePlan` in `src/lib/apply/intake.ts`. No new query.
- Rendering: per-university card in `src/components/apply/collect/GuidedPrep.tsx` (`AllRequirements` → `RequirementsZone`) and the "researching…" fallback in `src/components/apply/collect/CollectWorkspace.tsx`.

## Type changes (`src/lib/apply/intake.ts`)

Extend the types to carry what the backend already sends:

- `IntakeTarget` → add `coverage?: "full" | "partial" | "error"` and (if backend exposes it) `status?: string`, `lastCrawledAt?: number`.
- `IntakePlan["specific"][number]` → same `coverage?` field, so the per-university group carries it alongside `items`.

No behavior change from the type edits alone — everything downstream is additive.

## UI: coverage badge + notice on each university card

In `RequirementsZone` (or a thin wrapper around it in `GuidedPrep.AllRequirements`), render next to the university title:

| Coverage        | Badge                        | Tone                    |
| --------------- | ---------------------------- | ----------------------- |
| `"full"`        | "Verified requirements"      | success / tertiary      |
| `"partial"`     | "Partial — may be incomplete"| warning / amber         |
| `"error"`       | "Not captured yet"           | error / muted           |
| `undefined`     | "Gathering…"                 | neutral + spinner       |

When coverage is anything other than `"full"`, show an inline notice block above the items list:

> "We haven't fully captured this university's requirements yet. The list below may be incomplete — don't treat it as the full application. [Re-scan requirements]"

For `"error"` / empty `items`, replace the list with an empty-state that says the same thing more strongly and hides the "X of Y answered" progress so an empty catalog can't read as "0/0 done → ready".

## LaunchBar / readiness guard

In `CollectWorkspace.tsx`, exclude any target whose `coverage !== "full"` from `readyTargets`. Even if `checklist.ready === true` for a thin set, we must not offer "Apply" for a university we haven't fully captured. Show a small helper line in `LaunchBar` explaining why the count is lower ("N university hidden — requirements not fully captured yet").

Progress percentage in the header should also be computed only over `full`-coverage targets, otherwise a 1-field partial catalog inflates the "answered %".

## Re-scan action

Add a "Re-scan requirements" button in the per-university card and the empty/error state. Wire it to whatever the corresponding Convex mutation is (candidates: `applications.rescanRequirements`, `universities.recrawl`, or the existing research/deep-crawl trigger — I'll grep for the actual name during implementation; if none exists yet, this becomes a backend follow-up and the button is disabled with a "we're re-crawling this university" note when `coverage === "error"`).

On success we rely on Convex reactivity to re-render `intakePlan`.

## Assumption to confirm

Backend exposes `coverage` on **both** `plan.targets[i]` and `plan.specific[i]` (the group the UI iterates). If it's only on `targets`, `AllRequirements` will join by `system+externalId`. Either way works; I'll match whatever `intakePlan` actually returns when I implement.

## Out of scope

- No changes to the intake Convex query itself.
- No changes to eligibility/checklist logic beyond the readiness-guard filter.
- No copy changes on unrelated pages.
