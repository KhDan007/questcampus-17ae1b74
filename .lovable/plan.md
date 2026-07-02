# Auto-Apply: Inventory + Alignment Plan

## (A) Inventory — every file that touches auto-apply

### Documents
- `src/components/apply/DocumentManager.tsx` — grid of doc-type slots, upload/remove/download.
- `src/lib/applyQueue/client.ts` → `useApplicationDocuments()` wraps:
  - `api.applicationDocuments.list({ token })` ✅ matches contract
  - `api.applicationDocuments.requestUploadTicket({ token, docType })` ✅
  - upload POST to `${uploadUrl}?ticket=…` with raw file body ✅
  - `api.applicationDocuments.record({ token, docType, oracleKey, fileName, mime, size })` ✅
  - `api.applicationDocuments.remove({ token, id })` ✅
  - `api.applicationDocuments.downloadUrl({ token, id })` — **diverges**: treated as a `useMutation` and unwraps `{ url }`; contract says it returns a signed URL **string | null**. Also should be a `query` (idempotent read).
- Missing from UI: `hasFile` field on list rows (not surfaced), and no client-side ≤ 25 MiB pre-check.

### Readiness / Collection / Intake
- `src/components/apply/collect/CollectWorkspace.tsx` — orchestrates shared + specific fields, eligibility card, launch bar.
- `src/components/apply/collect/RequirementsZone.tsx`, `RequirementField.tsx`, `ReadinessRail.tsx`, `EligibilityCard.tsx` — render intake plan groups and eligibility.
- `src/components/apply/collect/LaunchBar.tsx` — CTA that calls `startApply` per target.
- `src/lib/apply/intake.ts` hooks:
  - `useIntakePlan` → `api.applications.intakePlan({ token, targets })` ✅
  - `useEligibility` → `api.applications.eligibilityForTargets({ token, targets })` ✅
  - `useChecklist` → `api.applications.checklistForTargets({ token, targets })` ✅
  - `useAutoApplyEntitlement` → `api.applications.autoApplyEntitlement({ token, targets })` ✅
  - `useSetAnswer` → `api.applications.setAnswer({ token, conceptKey, value })` ✅
  - `useAnswerEligibility` → `api.applications.answerEligibility({ token, answers })` — **diverges from contract**: contract only lists `setAnswer` / `listAnswers`; there is no `answerEligibility` and no `listAnswers` hook. Eligibility answers should flow through `setAnswer(conceptKey, value)` using the `askKey`/`conceptKey` returned by the eligibility questions.
  - No hook for `api.applications.listAnswers` — **missing**.

### Apply launch + active jobs
- `src/routes/apply.tsx` — "SavedToPick" batch selection + kicks off runs.
- `src/routes/apply.prep.tsx` — prep/collection route wrapper.
- `src/components/apply/BatchActionBar.tsx`, `SelectableUniCard.tsx`, `ApplyButton.tsx`, `ApplyStepper.tsx`, `NextProductiveAction.tsx`, `ResearchProgressModal.tsx` — selection + CTAs.
- `src/components/apply/ResearchDock.tsx` — "in progress" strip; calls `api.applyQueue.myActiveJobs` (plural) with a fallback to `myActiveJob`. **Diverges**: contract only defines `myActiveJob` (singular, returns non-terminal job or null). The plural call is a phantom fallback we should drop.
- `src/lib/applyQueue/client.ts`:
  - `useApplyActions().startApply` → `api.applyQueue.enqueueApply({ token, system, externalId, targetName })` ✅ — but reads `{ jobId }`; contract returns `{ jobId, reused }` (we ignore `reused`). Errors from thrown mutations are not surfaced verbatim to the user (LaunchBar catches and shows a generic string).
  - `cancelApply`, `confirmCheckpoint`, `getApplyJob`, `myActiveJob`, `liveTicket` ✅ names match.
  - `confirmCheckpoint` is called with `kind` = `"logged_in" | "submitted"` in apply.$jobId.tsx ✅.

### Live view (screencast + input)
- `src/components/apply/LiveCanvas.tsx` — WebSocket to `wsEndpoint?ticket=…`, draws `frame` messages, sends `mouse`/`wheel`/`key`. **Diverges from contract in one place**: on typed text it only sends `keyDown`/`keyUp`. Contract also expects a `char` event (`{ t:"key", type:"char", text }`) for typed characters. Everything else (source 1280×800, event shapes) matches.
- `src/routes/apply.$jobId.tsx` — subscribes to `getApplyJob`, opens `liveTicket` only once `job.wsEndpoint` is set ✅, teardown on terminal is implicit via canvas unmount but not proactive.

### Route + gating misc
- `src/routes/application.$system.$externalId.tsx` — per-uni detail page (uses `useIntakePlan` etc.).
- `src/lib/auth/useAuth.ts` — provides `token`.
- `.env` / Convex client — already pointed at the self-host prod.

### Status field usage
Route file whitelists `queued | claimed | awaiting_login | filling | awaiting_submit | done | cancelled | error` — matches the exact 8. `ApplyJobStatus` type in `client.ts` matches. No stray branches on `submitted`/`awaiting_confirm` in the codebase (grep clean).

---

## (B) Plan to fully implement the contract

### 1. Fix diverging Convex calls (low risk, do first)
1. `src/lib/applyQueue/client.ts` → convert `getDownloadUrl` to a plain `useQuery` **or** keep as mutation but treat the return value as `string | null`, not `{ url }`. Update `DocumentManager` accordingly.
2. Remove `api.applyQueue.myActiveJobs` from `ResearchDock.tsx`; call only `myActiveJob` and render at most one active job (still fine as a list of length 0 or 1).
3. Delete `useAnswerEligibility` (and its `api.applications.answerEligibility` binding). Route `CollectWorkspace` eligibility answers through the existing universal `useSetAnswer(conceptKey, value)` using the `askKey` returned in `eligibility.questions[]` (the backend has said askKey === conceptKey for the universal store). Empty string clears.
4. Add `useListAnswers()` wrapping `api.applications.listAnswers({ token })` for pre-hydrating fields when the intake plan doesn't already include current values (used as a fallback + for optimistic UI).
5. Consume `reused` from `enqueueApply` result — if `reused`, skip the "starting…" toast and just navigate.

### 2. Documents Manager polish
1. Client-side reject files > 25 MiB before requesting a ticket; show the exact backend limit in the error.
2. Surface the `hasFile` flag from `list` — grey out download when false (edge case where record exists but bytes not yet on worker).
3. Confirm upload POST body is the raw `File` (currently is ✅) and the ticket goes in the querystring (currently is ✅).
4. Show a per-slot "Replace" affordance to make the "overwrite in place" behavior obvious.

### 3. Readiness / Collection screen
1. Drive the "Apply" gate off `autoApplyEntitlement.gate` with these four labels exactly:
   - `not_ready` → disabled "Finish your requirements"
   - `ready_free` → "Apply — first one's free"
   - `ready_paid` → "Apply"
   - `needs_payment` → button routes to existing `/unlock` Polar flow (do not enqueue).
2. Render `eligibility.perTarget[*].verdict === "ineligible"` as a **hard block** with the blocker list + evidence link (currently rendered but not blocking). Blocked targets must be removed from the `readyTargets` array we pass to `LaunchBar`.
3. For `verdict === "unknown"`, render `questions[]` inline and wire answers through `setAnswer(askKey, value)` (see step 1.3).
4. Show `manualNotes` (fee / recommender) as an amber advisory below the field lists.
5. Percent bar uses `intakePlan.summary.answered / totalAskable`; already close, tighten to the contract fields.

### 4. Apply launch
1. In `LaunchBar.launch`, when `enqueueApply` throws, display `error.message` **verbatim** (don't wrap in a generic sentence). The four known messages ("Application is not ready.", "Payment required.", "portal not found", "still gathering requirements") are already human-readable.
2. On `Payment required.` error, redirect to `/unlock` automatically.
3. On success, navigate straight to `/apply/$jobId`; if `reused` is true, replace history entry instead of pushing.

### 5. Live run page (`/apply/$jobId`)
1. Add a **resume banner** on `/dashboard` and `/apply` that reads `useActiveApplyJob()` (already wraps `myActiveJob`) and links to `/apply/${jobId}` when non-null.
2. Explicitly tear down the WebSocket on terminal status transitions (currently relies on unmount). Add a `useEffect` in `LiveCanvas` that closes when `interactive` flips false AND status is terminal, or expose a `disconnect` prop.
3. Poll pattern: `liveTicket` is already gated by `wsEndpoint` presence — but tickets are short-lived; add a re-fetch when the WS closes with `1006`/`1008` (auth expiry) so users don't need to reload.
4. Progress: use `progress.stage` as the small caption and `progress.message` as the big line; percent already correct.
5. Activity: cap at last 50, colour by `type` (status/fill/unmatched/review) in addition to `level`.
6. Error handling: when `status === "error"`, show `job.error` verbatim + a "Try again" button that calls `enqueueApply` again with the same `{system, externalId, targetName}` and navigates to the new jobId.

### 6. Live canvas input (LiveCanvas.tsx)
1. Add `char` events for typed characters: on `keydown` with a printable single-char `e.key`, additionally send `{ t:"key", type:"char", text: e.key }` after the `keyDown` event (portals like Common App need this for IME/composed input).
2. Handle `compositionend` to send a `char` event with the composed text.
3. Keep the source-coord scaling exactly as-is (1280×800 → canvas rect) ✅.
4. Add a "Take over" hint overlay while `checkpoint.kind === "login"`.

### 7. Checkpoints
Already correct in shape. Two adjustments:
1. Only render the modal for `checkpoint.kind === "login" | "submit"` — ignore any other kinds defensively (contract guarantees only these two).
2. On `submit` checkpoint, read `payload.filled`, `payload.unmatched`, `payload.reachedReview`; if `reachedReview === false`, show a warning that the agent couldn't reach the portal's review screen and the user should navigate there manually before confirming.

### 8. Entitlement / paywall wiring
1. Single source of truth: `autoApplyEntitlement.gate`. Delete any other client-side "paid" checks around apply (keep `hasPaidAccess` for non-apply features only).
2. On `needs_payment`, the CTA links to `/unlock`; on return (`/unlock/success`) re-query `autoApplyEntitlement` and auto-continue.

### 9. Error handling — global rules
- Convex mutations that throw: `error.message` is user-safe per contract; surface verbatim in a toast/inline notice.
- WebSocket close before frame: LiveCanvas already shows "Live view disconnected" ✅.
- `getApplyJob` returning `null` on a terminal jobId: keep the "not found" panel; add a link to `/apply`.

### 10. QA checklist to verify the contract end-to-end
1. Upload each doc type; confirm overwrite behaves; confirm `downloadUrl` opens a signed URL.
2. Build a target list with a mix of eligible/ineligible/unknown; verify blocking + questions.
3. Cycle `gate` through all four values (admin toggle or via `applyCount` bumps).
4. `enqueueApply` → observe status transitions `queued → claimed → awaiting_login → filling → awaiting_submit → done`; confirm no branch code hits an unknown status.
5. Force a worker error to verify `error` + Try again path.
6. Log into a portal via LiveCanvas; type into a field (verify `char` event lands); solve a captcha; confirm submit checkpoint.
7. Cancel mid-run; confirm WS closes and route shows the cancelled banner.

### Files that will change
- `src/lib/applyQueue/client.ts` (downloadUrl shape, drop assumptions)
- `src/lib/apply/intake.ts` (drop `useAnswerEligibility`, add `useListAnswers`)
- `src/components/apply/DocumentManager.tsx` (size guard, hasFile, replace UI, downloadUrl consumer)
- `src/components/apply/ResearchDock.tsx` (drop `myActiveJobs`)
- `src/components/apply/collect/CollectWorkspace.tsx` + `EligibilityCard.tsx` (route eligibility answers through `setAnswer`, block ineligible)
- `src/components/apply/collect/LaunchBar.tsx` (verbatim errors, needs_payment routing, reused handling)
- `src/components/apply/LiveCanvas.tsx` (add `char` + composition events, WS teardown)
- `src/routes/apply.$jobId.tsx` (resume banner elsewhere, retry button, ticket refresh on WS drop, submit payload warnings)
- `src/routes/apply.tsx` / `apply.prep.tsx` (resume banner surface if we add it here)

No backend changes — this is a pure client alignment pass.
