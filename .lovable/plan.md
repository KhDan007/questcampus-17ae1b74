# Diagnosis — dashboard white-screens after filling application info

No code changes. Findings below map to your numbered questions.

## 1. Where the mutation fires

The only place the user can fill "application info" that reaches the dashboard is `DashboardPrepSection` → `CollectWorkspace` (`src/routes/dashboard.tsx:281–283` → `src/components/apply/collect/CollectWorkspace.tsx`).

- `RequirementField` (`RequirementsZone.tsx:80`) → `onChange` → `CollectWorkspace.tsx:144, 182` → `setAnswer(conceptKey, value)` from `useSetAnswer` (`src/lib/apply/intake.ts:130–158`), debounced 400 ms → `api.applications.setAnswer` (`intake.ts:150`). Writes to `applicationAnswers`.
- `EligibilityCard` (`EligibilityCard.tsx:29`) → `onChange` → `CollectWorkspace.tsx:135` → `answerEligibility(askKey, value)` from `useAnswerEligibility` (`intake.ts:164–190`), debounced 400 ms → `api.applications.answerEligibility` (`intake.ts:170`). Buffer never cleared (`intake.ts:181`) — sends the *accumulated* answers object every subsequent call. Rewrites the onboarding profile → `profileHash` moves.

## 2. Reactive dashboard queries that depend on those writes

All args are `{ token, targets }` where each `target = { system, externalId, name }` (only 3 fields; no extras leak — verified at `dashboard.tsx:605–613, 632–640, 726–734, 799–807` and `intake.ts:9–11` `selectionToTargets`). So hypothesis 3(a) — strict arg validator throw — is **not** the cause.

Subscribed on the dashboard (all inside `SilentErrorBoundary`, so a throw here disappears the *section* silently and looks like "the dashboard broke"):

| Component | Query | Depends on |
| --- | --- | --- |
| `StatBar` (`dashboard.tsx:735`) | `api.applications.intakePlan` | answers |
| `YourPicksSection` (`dashboard.tsx:641`) | `api.applications.intakePlan` | answers |
| `TaskRail` (`dashboard.tsx:808`) | `api.applications.intakePlan` | answers |
| `DashboardPrepSection` → `CollectWorkspace` (`CollectWorkspace.tsx:35–38`) | `intakePlan`, `eligibilityForTargets`, `checklistForTargets`, `autoApplyEntitlement` | answers + onboarding profile |
| `NextProductiveAction` (unused on dashboard now, but wired via `useApplicationDocuments`) | `api.applicationDocuments.list` | not affected |

Not reactive: `useActiveApplyJob` (one-shot `client.query` in `useEffect`, `applyQueue/client.ts:96–121`) and the recommendations action (`dashboard.tsx:144, 160`) — a `useAction` in a `useEffect` gated on `[sessionId, isAuthenticated, token, ...]`, not on profileHash. So hypothesis (4) — the dashboard reactively consuming a nulled `recommendations` cache — is **not** the cause. Recommendations only refetch on `?refresh=1` or first mount.

## 3. What actually throws — most-likely root cause

**`src/components/apply/collect/CollectWorkspace.tsx:57–67` — the `readyTargets` `useMemo`, specifically line 65:**

```ts
return (c?.checklist.ready ?? false) && e?.verdict !== "ineligible";
```

`c` is a `checklist.perTarget[i]` entry. The `ChecklistResult` type in `intake.ts:98–107` declares `checklist: { ready: boolean; [k]: unknown }`, but backend `checklistForTargets` returns per-target entries for **still-researching** targets where `found: false` and `checklist` is `undefined` (there is no requirements set to evaluate yet). Before the first `setAnswer` / `answerEligibility` fires, `checklist` is `undefined` (still loading) → `c` is `undefined` via optional chaining → the expression short-circuits to `false` → no throw.

The moment `setAnswer` (or `answerEligibility`) resolves, Convex reactively re-runs `checklistForTargets`. Now it returns a populated `perTarget` array that *includes* the `found:false` entries with a missing/undefined `checklist`. `c` becomes truthy, `c?.checklist` becomes `undefined`, and `.ready` throws:

```
TypeError: Cannot read properties of undefined (reading 'ready')
```

Thrown during the `useMemo` computation → propagates through render → caught by the `<SilentErrorBoundary>` around `DashboardPrepSection` (`dashboard.tsx:281–283`). The whole Prep column collapses to `null`, which — because the user was typing in it — looks like "the dashboard broke / white-screened / crashed".

The identical pattern in `ReadinessRail.tsx:47–52` (`c?.checklist.ready`, `c?.found`) shares the same failure mode inside the same subtree, guaranteeing a throw somewhere in that render pass even if the memo is skipped.

## 4. Recommendations cache / profileHash

Not consumed reactively on the dashboard. `answerEligibility` does change `profileHash` server-side, but the dashboard's `recs` are pulled once via an action into local `saved` state (`dashboard.tsx:139, 158–191`). It won't null out mid-session.

## Single most-likely root cause

`src/components/apply/collect/CollectWorkspace.tsx:65` — `(c?.checklist.ready ?? false)` throws `TypeError: Cannot read properties of undefined (reading 'ready')` on the reactive `checklistForTargets` re-run that follows `setAnswer`/`answerEligibility`, because the backend returns `perTarget` entries with `checklist` undefined for still-researching targets. Same-shape hazard at `ReadinessRail.tsx:47` and `:52`. The `SilentErrorBoundary` around `DashboardPrepSection` swallows it and empties the section, which is what the user perceives as the dashboard breaking.

Fix (for the next build turn, not now): treat `c?.checklist?.ready` (extra `?.`) at both call sites, and mirror the guard in `ReadinessRail` line 47 (`c?.checklist?.ready`, `c?.found ?? false`).
