# ESM boot globals port (approach A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port high-churn remainder of classic `index.js` into Vite ESM modules wired by `applyLegacyGlobals`, without packing classic `index.js`.

**Architecture:** `legacyGlobals.js` stays the orchestrator. New small modules under `src/pages/editor/` (or `src/shared/`) export helpers; `applyLegacyGlobals` assigns them on `window` before e6 packs load. Classic `src/legacy/js/index.js` remains source-of-truth to copy from; gulp `${{ }}` ignored.

**Tech Stack:** Vite ESM, existing `window.ENV` / `applyLegacyGlobals`, Vitest.

## Global Constraints

- Do not add `js/index.js` back to `E6_COMMON_PATHS`
- Do not dump entire `index.js` into `legacyGlobals.js`
- Prefer `if (typeof g.X === 'undefined')` when assigning to avoid clobbering later
- Keep mail/`FetchService`/hash helpers as already split

---

### Task 1: Id helpers

**Files:**
- Create: `src/pages/editor/legacyIdHelpers.js`
- Modify: `src/pages/editor/legacyGlobals.js`
- Test: `tests/unit/legacyIdHelpers.test.js`

Port from `index.js`: `getramdon`, `s4` (if needed), `d2`, `d4`, `getuniqueid`, `guid`.

Assign on `window` in `applyLegacyGlobals`.

- [x] Write unit tests for `d4` / `guid`
- [x] Implement module + wire globals
- [ ] Commit: `feat(editor): expose legacy id helpers via applyLegacyGlobals`

---

### Task 2: API path constants

**Files:**
- Create: `src/pages/editor/legacyApiPaths.js`
- Modify: `src/pages/editor/legacyGlobals.js`
- Test: `tests/unit/legacyApiPaths.test.js`

Build `API_*` from `g.API_PATH` (same suffixes as `index.js`). Assign on `window`.

- [x] Unit: one path e.g. `API_GET_DOCS` ends with `getdocs`
- [x] Implement + wire
- [ ] Commit: `feat(editor): expose legacy API_* paths via applyLegacyGlobals`

---

### Task 3: ROLE_IDS + collab

**Files:**
- Create: `src/pages/editor/legacyRoleIds.js`
- Modify: `src/pages/editor/legacyGlobals.js`
- Test: `tests/unit/legacyRoleIds.test.js`

Port `DEFAULT_ROLE`, `ROLE_IDS`, `COLLAB_CLIENTS`, `hasCollabClient`.

- [x] Unit: `ROLE_IDS` has AU/ED keys; `hasCollabClient('oso')` true
- [x] Implement + wire
- [ ] Commit: `feat(editor): expose ROLE_IDS and collab helpers via applyLegacyGlobals`

---

### Task 4: ADD_DEFAULT_KEYS + GET_JSON (minimal)

**Files:**
- Create: `src/pages/editor/legacyJsonHelpers.js` (or split if large)
- Modify: `src/pages/editor/legacyGlobals.js`
- Test: focused unit for `ADD_DEFAULT_KEYS('default')` shape / `GET_JSON` existence

Port only what editor open / LoadingConfig needs first; expand when console shows missing cases.

- [x] Implement minimal + wire (openhtml, Shareandinvite, linksharing, warn on unknown)
- [ ] Commit: `feat(editor): expose ADD_DEFAULT_KEYS and GET_JSON via applyLegacyGlobals`

---

### Task 5: Verify

- [x] `npx vitest run` legacy unit tests (PowerShell: list files explicitly)
- [ ] Hard-refresh `#/editor?docid=…` — no `guid` / `ROLE_IDS` / `API_*` ReferenceError
- [x] Do not re-pack requirement for these (ESM boot); e6 packs unchanged
