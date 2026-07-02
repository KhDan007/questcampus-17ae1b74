
## Goal
Replace the fixed-step `PrepWizard` with a **Collect workspace** whose entire content is derived from Convex (`intakePlan`, `eligibilityForTargets`, `checklistForTargets`, `autoApplyEntitlement`). No hardcoded field or document lists. Calm by default: everything collapsed, progressive disclosure, one clear next action.

## Data flow

```text
useApplySelection() ──► targets[]
        │
        ├─► useIntakePlan(targets)          → { shared, specific, manualNotes, summary, targets }
        ├─► useEligibility(targets)         → { overall, questions, perTarget }
        ├─► useChecklist(targets)           → { perTarget, overallReady }
        └─► useAutoApplyEntitlement(targets)→ gate for Launch

Mutations:
  useSetAnswer()           .setAnswer({conceptKey, value})   [debounced 500ms, optimistic]
  useAnswerEligibility()   .answerEligibility({answers})     [batch, then refetch eligibility]
  useApplicationDocuments() upload → satisfies kind=document|video via item.docType
  useApplyActions().startApply()   Launch (per target)
```

All queries live in a new `src/lib/apply/intake.ts` — thin wrappers around `useQuery(api.applications.*)` with `{ token }` from `useAuth`, mirroring `applyQueue/client.ts` style. Debounce/optimism handled in `useSetAnswer` via a local `Map<conceptKey,value>` overlay merged over server data before render.

## Component structure

New files under `src/components/apply/collect/`:

```text
CollectWorkspace.tsx        ← page-level container, replaces <PrepWizard/>
├─ CollectHeader.tsx        ← progress ring/bar + "N left" + primary "Continue" (jump-to-next)
├─ EligibilityCard.tsx      ← slim, collapsible; only rendered if overall !== "eligible"
│   ├─ EligibilityQuestion.tsx     (select|number|text|boolean)
│   └─ IneligibleChip.tsx           (chip + Popover "Why?" with blocker label + evidence link)
├─ SharedRequirements.tsx   ← "Fill once" zone
│   └─ RequirementGroup.tsx        (one per kind: Profile / Essays / Documents / Video)
│       ├─ Accordion header: label + mini progress + "N left"
│       ├─ RequirementRow.tsx      (renders IntakeItem)
│       │   ├─ FieldInput          (text/email/date/number/tel/select/textarea+wordLimit)
│       │   ├─ EssayInput          (textarea + wordLimit counter, uses same setAnswer)
│       │   └─ DocumentSlot        (reuses DocumentManager filtered by docType)
│       └─ "Show N completed" toggle → reveals collapsed ✓ rows
├─ SpecificRequirements.tsx ← Accordion per uni, collapsed by default
│   └─ RequirementGroup     (reused)
├─ ManualNotesStrip.tsx     ← inline info banner (fee / recommender) — non-interactive
├─ ReadinessRail.tsx        ← right rail on lg+, stacks below on mobile
│   └─ UniReadinessCard.tsx (checklist bar + eligibility badge + "N left" + expand)
└─ LaunchBar.tsx            ← sticky bottom; enabled when overallReady && eligible
                              gated by autoApplyEntitlement; triggers existing startApply loop
```

Reused as-is: `DocumentManager`, `useApplicationDocuments`, `useApplySelection`, `applyQueue/client`, `ApplyStepper`, `LiveCanvas`, ui/{accordion,collapsible,progress,popover,badge,input,textarea,select}.

## "Not overloading" mechanics
- **Default state = collapsed.** Only the header + eligibility (if needed) + first incomplete group are open on mount.
- **Auto-collapse** a group the moment it hits 100%.
- **Completed rows hide** behind a "Show N completed" toggle inside each group.
- **Compact ✓ summary** for answered rows: `✓ Date of birth — 2004-05-12`.
- **One primary action** at a time: header "Continue" scrolls+focuses the next unanswered `conceptKey` (computed from merged shared+specific ordered list, respecting eligibility-first).
- **Specific-to-one-uni** items live in a separate accordion so the shared list stays short.
- **`manualNotes`** rendered as a passive strip, never as inputs.
- **Ineligible unis** are visually muted in the ReadinessRail with a badge + Popover; excluded from Launch loop unless resolved.

## Rendering rules per IntakeItem
| kind      | input                                                            | save                            |
|-----------|------------------------------------------------------------------|---------------------------------|
| field     | switch on `type` (text/email/date/number/tel/select/textarea)    | `setAnswer(conceptKey, value)`  |
| essay     | textarea + live word counter vs `wordLimit`                      | `setAnswer(conceptKey, value)`  |
| document  | DocumentSlot filtered by `docType`; ✓ when any file of that type | upload via useApplicationDocuments |
| video     | same as document                                                 | same                            |

`targetNames` shown as a muted caption: "Asked by Oxford +2" (Popover lists all on hover).

## State
- No global store. Local `useState` in `CollectWorkspace` for: openGroups Set, showCompleted per group, ineligibility card open, pending optimistic overlay.
- Server data via Convex `useQuery` (live). Debounced writes: `useSetAnswer` keeps a ref of pending values, flushes 500 ms after last edit per key, and merges over the server value until the server echo matches.
- `focusNext()` computed selector: eligibility questions first, then shared groups in kind order (Profile → Essays → Documents → Video), then specific by uni order.

## Route wiring
- `src/routes/apply.prep.tsx`: swap `<PrepWizard />` for `<CollectWorkspace />`. Header/subhead copy updated to match dynamic nature.
- `src/components/apply/PrepWizard.tsx`: **delete** after migration.
- `src/lib/apply/profile.ts` (`PROFILE_FIELDS`): **delete** if nothing else imports it (grep first; if referenced elsewhere, remove only the export used here and keep the file for other uses).

## Files created
- `src/lib/apply/intake.ts` (hooks: `useIntakePlan`, `useEligibility`, `useSetAnswer`, `useAnswerEligibility`, `useChecklist`, `useAutoApplyEntitlement`)
- `src/components/apply/collect/*` (all files listed above)

## Files edited
- `src/routes/apply.prep.tsx` (render `CollectWorkspace`, tweak header copy)

## Files removed
- `src/components/apply/PrepWizard.tsx`
- `src/lib/apply/profile.ts` (conditional on grep)

## Out of scope
- No changes to `LiveCanvas`, `apply.$jobId.tsx`, apply queue backend, selection store, or design tokens.
- No new Convex functions (backend already exposes everything listed).

## Open assumption (flag)
- Assuming `api.applications.*` exists on the deployed Convex as specified. Since `_generated/api.ts` is an `anyApi` stub, we won't get compile-time checks — we'll defensively guard `useQuery` results (undefined/null → skeleton) and surface errors via existing `SilentErrorBoundary` pattern.
