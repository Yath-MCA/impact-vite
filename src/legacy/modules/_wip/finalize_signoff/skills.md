---
title: FinalizeSignOff — ModuleSystem flow + dual commit
description: Register FinalizingDialog, role-based stages, legacy vs saveWithLogout/saveWithFinalize commit.
---

# FinalizeSignOff

## Entry

- Module: `src/modules/_wip/finalize_signoff/` (WIP; promote when ready)
- Register: `context.js` → `ContextHelpers.registerOnReady('FinalizingDialog', …)`
- Open: `window.openFinalizeDialog()` / `window.getFinalizeDialog()`
- Global alias after load: `window.FinalizeDialog`
- Do **not** load `src/js/dialogModules/FinalizeSignOff.js` (gulp-excluded)

## Flow phases

`runFlow(phase)` / `flowPhase`:

1. **precheck** — QC gate (`showBefore`), query restore, mismatch, abstract, open AQ, collab, cite warn (`showLoop` + `resolvePrecheckStage`)
2. **confirm** — stage UI + Yes/Cancel / Submit
3. **commit** — `CloseSharedStatus` (capability-gated)
4. **post** — `closesharedpost` role branches
5. **exit** — `reDirectReadOnly` → survey → redirect

Role business rules must stay identical to `docs/FinalizeSignOff_Workflow.md`.

## Commit paths

| Mode | When | FE does |
|------|------|---------|
| **legacy** (default) | all capability flags false | `LOG_OUT.fire` Finalize (`process: signoff\|close`, regenerate, lockfile) → correction_count → query snapshot → ShareInvite signoff → updateSignOffTime |
| **saveWithLogout** | `IMPACT_FINALIZE_USE_SAVE_WITH_LOGOUT` or `caps.saveCloseShare` | one combined call; skip save/close/share FE AJAX |
| **saveWithFinalize** | `IMPACT_SAVE_WITH_FINALIZE_READY` | `API_SAVE_WITH_FINALIZE`; `mapCombinedResponseToDone` skips post steps per response section; redirect uses `shareandinvite.key` |

Helpers: loaded lazily via [`deps.js`](deps.js) `_importDependencies()` (do not add static imports for `capabilities.js` / `payload.js` / `flow.js` in `index.js`). Exports: `getFinalizeCapabilities`, `shouldSkipCommitStep`, `mapCombinedResponseToDone`, `buildShareResponseFromCombine`, `resolveQueryOpenStage`, `resolvePrecheckStage`, `resolveCommitMode`.

See `savewithfinalize.md` for Combine API request/response contract.

Logout API: `LOG_OUT.saveWithLogout` / `saveWithFinalize` / `saveWithFinalizeOrLogout`; `executeLogout` uses combined path when `useCombinedSave: true` on Finalize.

## Module state

- `this.elements` — dialog DOM refs from `initLoop` (`headerTitle`, `bodyText`, `bodySpinner`, `footer`, `actionButtons`, …)
- `this._state` — runtime state (replaces legacy `M_SCOPE` + `M_CONFIG`):
  - `templateList`, `auKey`, `finalize`, `survey`
  - `workFlow`, `stages`, `collaborativeStages`, `openAqCount`, `isPrimaryAuthor`, `trackPDF`, …
- `GetTemplate` resolves against `_state.templateList` (BaseModule convention)
- Avoid `?.` and `??` in this module; use `&&` / `if` / `||` for compatibility with legacy build targets.

## Key methods

- `showBefore` — CO QC gate
- `showLoop` — stage resolution + button bind
- `CloseSharedStatus` — commit (legacy or combined)
- `closesharedpost` — post (CO mail, pubkit, workflow share, …)
- `ShareFromWorkflow` / `NON_PUBKIT_WORKFLOW` / `coRoleFinalize`
- `FIRE_SURVEY` / `reDirectReadOnly`

## Do not regress

- Primary vs CO query stages (`query_open` / `query_open_co_user`)
- Collab `process: signoff` vs non-collab `close`
- Pubkit vs Collator vs ShareFromWorkflow vs NON_PUBKIT mail
- Survey via `IsContextMenu("survey", …)`
