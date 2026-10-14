# Linksharing session — developer guide

**Docs:** [skills.md](./skills.md) · [WORKFLOW.md](./WORKFLOW.md) · [QA.md](./QA.md) · [use_cases.md](./use_cases.md)

Implements dual-guard in **impactweb** via `LinkSessionCore` (gulp bootstrap + webpack module load). Do **not** port a second getdocs helper body.

Backend map (reference only — do not invent APIs): [`../linksharing-frontend-backend-map.md`](../linksharing-frontend-backend-map.md). Authoritative process detail: [`../../src/modules/shared/link_session/API.md`](../../src/modules/shared/link_session/API.md).

---

## File map

| File | Responsibility |
|------|----------------|
| [`src/modules/shared/link_session/LinkSessionCore.js`](../../src/modules/shared/link_session/LinkSessionCore.js) | Primary: `confirmSessionOnServer`, `validateBeforeSave`, Promise `newSessionCheck`, `isActiveSessionRecord`, `mapSaveValidationReason`, landing_retry, gate/close logs |
| [`src/modules/shared/link_session/localHostSession.js`](../../src/modules/shared/link_session/localHostSession.js) | **Optional** localhost seed helpers (`isLocalHost`, `ensureLocalSessionEntry`) — **not** used by Ready |
| [`src/modules/shared/link_session/LinkSessionModule.js`](../../src/modules/shared/link_session/LinkSessionModule.js) / [`LinkSessionEditor.js`](../../src/modules/shared/link_session/LinkSessionEditor.js) / [`index.js`](../../src/modules/shared/link_session/index.js) | Entry points; `getInstance()` for alias delegates |
| [`src/modules/shared/link_session/bootstrap.js`](../../src/modules/shared/link_session/bootstrap.js) | Landing wiring; `VALIDATE_LAST_SAVE`; calls `setItemsandReDirect` |
| [`src/js/index.js`](../../src/js/index.js) | `window.confirmLinkSessionOnServer` thin alias; sessionbackup helpers |
| [`src/js/dialogModules/LandingPage.js`](../../src/js/dialogModules/LandingPage.js) | Async `setItemsandReDirect` write → verify → navigate; `onRedirect` await |
| [`src/js/_initalLoadingDialog.js`](../../src/js/_initalLoadingDialog.js) | Ready: Track View + localhost allow; **live editor only** `gateLiveSession` |
| [`src/js/editor_page_events_fn.js`](../../src/js/editor_page_events_fn.js) | `new_session_check` stub → module; SaveModule reason→action; logout close |
| [`src/js/dialogModules/FinalizeSignOff.js`](../../src/js/dialogModules/FinalizeSignOff.js) | Collab finalize prefers `process: signoff` |

**Load path note:** primary logic lives under `src/modules/shared/link_session/` (webpack `moduleRegistry` + gulp bootstrap). Landing/editor also load `src/js/index.js` for the window alias and sessionbackup. Secondary: webpack auto-entry from `src/modules/**` if mirrored — prefer shared_modules paths above.

---

## Endpoints

| Endpoint | Global | Role |
|----------|--------|------|
| `POST …/linksharing` | `API_LINK_SHARE` | Session `process` mutations / check / refresh |
| `POST …/getdocs` | `API_GET_DOCS` | Dual-guard read; save-path validation |

Collection: `rlinksharing` (`tbl: "linksharing"`). Transport and `r` codes: see backend map — no new processes.

---

## `confirmSessionOnServer` / `confirmLinkSessionOnServer`

```javascript
await confirmLinkSessionOnServer({ docId, sessionId, rolename?, username? })
// → { ok, reason, row?, rows?, error? }
```

- **Core:** `LinkSessionCore.confirmSessionOnServer` (also `validateBeforeSave`).
- **Alias:** `window.confirmLinkSessionOnServer` in `index.js` and `installSessionGlobals` — delegates to `LinkSessionModule|LinkSessionService|LinkSessionEditor.getInstance().confirmSessionOnServer(...)`.

**Find (simplified):** `tbl: linksharing`, `docstatus: "1"`, `session_end_time: "0"`, matching `session_id` / `docid` (co-role find via `buildSessionFindQuery`).

| `reason` | Meaning |
|----------|---------|
| `active_session` | Verify passed |
| `missing_expected_fields` | Missing docId or sessionId |
| `no_active_row` | Empty getdocs data |
| `multiple_active` | More than one matching row |
| `record_mismatch` | Status / end time / session_id mismatch |
| `getdocs_unavailable` | Fail closed (`API_GET_DOCS` / `GET_JSON` missing) — same on localhost |
| `request_error` | Network / throw in helper — same on localhost (no Ready bypass) |
| `local_seed_unavailable` / `local_seed_error` | Seed POST / unexpected failure — **ok: false** → gate fail (no Ready) |

**Policy:** Live editor Ready is fail-closed on getdocs/check. **Track View** and **localhost** Ready allow directly (no seed). Optional seed helpers live in `localHostSession.js` for E2E/tooling only.

---

## Optional localhost seed — `localHostSession.js`

**Not part of Ready.** For E2E / tooling only:

```javascript
await service.ensureLocalSessionEntry({ docId, sessionId })
// → { ok, reason, seeded?, row?, sessionId }
```

Implementation: [`localHostSession.js`](../../src/modules/shared/link_session/localHostSession.js) (`remarks: local`). Core delegates when the file is loaded.

---

## Reason → action (save path)

Used by `SaveModule.validateSessionBeforeSave` via `LinkSessionCore.mapSaveValidationReason(verify)`.

| `reason` / condition | Save action |
|----------------------|-------------|
| `ok` / `active_session` | **Allow** save |
| `no_active_row` / `record_mismatch` / `multiple_active` / `missing_expected_fields` / `missing_session_id` / other non-postpone | **Stale** block + `redirectStaleSession` |
| `request_error` / `getdocs_unavailable` | **Postpone** via `postponeSaveAfterValidationError` — do **not** redirect as stale |

Constants: `LinkSessionCore.SAVE_POSTPONE_REASONS`, `SAVE_STALE_REASONS`.

---

## `skipVerify` inventory

Dual-guard verify runs in `setItemsandReDirect` when `Options.redirect` and **not** `Options.skipVerify`. `completeAccessGrant` forwards flags onto `ctx` / `grantOptions` for `onRedirect`.

| Call site | `skipVerify` / force | Why |
|-----------|----------------------|-----|
| `handleCheckResponse` → `completeAccessGrant` when `isCollabBypass(response)` | `skipVerify: true` | Collab product bypass — **conflict-shaped** `r:0` only (not DB exception payloads) |
| `handleCheckResponse` → `completeAccessGrant` when `maybeCollatorForceClose` | `canforceClose: true` (treated as skip) | Collator force-close — skipped on `isCheckErrorResponse` |
| Direct `check` grant (`r == 1`, no bypass) | `false` | Write-then-verify in `setItemsandReDirect` |
| `handleCheckResponse` DB-error `r:0` (ClassCastException / Error while accessing DB) | N/A — **no grant** | `onRequestError` / `Land_Page_TRY_AGAIN` |
| `handleUpdateOpen1` grant | `{ skipVerify: false }` | Same dual-guard |
| Poll grant `handleGetReqStatus` (`r == 1`) | `{ skipVerify: false }` | Still verify after write (no pre-write getdocs) |
| Landing `onRedirect` → `setItemsandReDirect` | Reads `ctx.skipVerify` / `grantOptions.skipVerify` / `canforceClose` | Forwards inventory above |
| `setItemsandReDirect` verify `no_active_row` | N/A | Silent `retryLandingSessionCheck` up to 3× (`remarks: landing_retry`) then navigate or TRY_AGAIN |
| `setItemsandReDirect(..., { redirect: false })` (e.g. link-status alert ~1957) | N/A | Write only — no navigate verify |
| `bootstrap.js` → `setItemsandReDirect` | Via landing ctx | Same as grant path |

**Do not** add new `skipVerify: true` without updating this table and QA L3.
**Do not** auto-refresh landing on verify fail.

---

## Editor session check (Promise)

`newSessionCheck(options)` / global `new_session_check` returns a **Promise** resolving to `{ ok, expired?, blocked?, sessionId?, reason?, response? }`.

- Existing tab id → `process: "refresh"`; else `"check"`.
- Settled from `handleNewSessionPost` / `commonfn.new_session_post`.
- Timeouts: fail-closed (see core). No localhost Ready transport bypass.
- Stub in `editor_page_events_fn.js` delegates to module when loaded.

---

## InitialLoadDialog gate

| Method | Behavior |
|--------|----------|
| `complete()` | Status Validating; calls `validateSessionThenReady` (does not hide yet) |
| `validateSessionThenReady()` | Track View / localhost → `finishReady` immediately; **live editor only** → `gateLiveSession` |
| `gateLiveSession()` | Live editor: `new_session_check` + getdocs + Ready / fail+alert |
| `finishReady()` | Sets `__linkSessionReadyAt`, `FullyLoaded`, hide overlay, `onInitializeComplete` |
| `handleSessionGateFailure()` | Live editor only: cleanup + `expired_session_alert` + **no** Ready / idle |
| `onInitializeComplete()` | Guide tour + `CHECK_REQUEST.Init()` + `LOG_OUT.Init` (only after Ready) |

**Rule:** only live editor validates before Ready. No Ready-path seed.

---

## Idle grace

- `LinkSessionCore.IDLE_GRACE_MS` = **5 minutes** after `window.__linkSessionReadyAt`.
- Also skip idle when `lastSaveTimestamp == 0` until first successful save (unless forced).
- Do not change backend idle servlet quirks this phase.

---

## Process catalog (`POST linksharing`)

Summarized from [API.md](../../src/modules/shared/link_session/API.md) — full FIND/WRITE detail in backend map.

| process | Caller | Writes DB? | Purpose |
|---------|--------|------------|---------|
| `check` | Landing / editor new tab | Yes | Open or deny |
| `refresh` | Editor when tab id exists | Yes | Refresh / reopen row |
| `save` | Autosave | Yes | Update `last_saved_time` |
| `close` | Logout, idle leave, validation fail, landing idle | Yes | Close row |
| `signoff` | Collab finalize | Yes | Close role rows |
| `update_session_end_time` | `CHECK_REQUEST.Init` | Yes | Touch end time |
| `scheduler` | Editor ~15s | No | Poll pending request |
| `updaterequeststatus` | After scheduler | Yes | Request `1→2` |
| `updatestatus_reqstatus` | Accept / timeout / idle handoff | Yes | Hand off session |
| `updatereqstatus` | Reject | Yes | `requeststatus:4` |
| `update_reqstatus_time` | Landing send request | Yes | Pending on active row |
| `update_docstatus_reqstatus_insert_time` | Landing stale cleanup | Yes | Archive + insert |
| `getrequeststatus_process` | Landing poll | Yes | Grant / wait / reject |

### `process:close` callers (this repo)

- `LogoutManager.closeSession` (default `close`; finalize may pass `signoff` when collab)
- Idle Leave → `close` + remarks `idle_leave`
- Save validation failure → `close` with `no_redirect`
- Landing `VALIDATE_LAST_SAVE` → `close`

Prefer `buildClosePayload` / structured `[LinkSessionClose]` / `ErrorLogTrace('LinkSessionClose', …)` with `{ source, remarks, session_id, docid }`.

---

## Status codes

**docstatus:** `0` closed · `1` active · `2`–`4` handoff archival · `5`–`7` poll archival · `8` stale landing

**requeststatus:** `0` none · `1` pending · `2` delivered · `3` resolved · `4` rejected

---

## Testing

| Layer | Command / note |
|-------|----------------|
| Unit dual-guard | `npm run test:unit -- tests/unit/link_session/dualGuard.test.js` |
| Unit seed keys | `npm run test:unit -- tests/unit/link_session/editorSessionSeed.test.js` |
| E2E (all) | `npm run test:e2e` (= `npx playwright test`) |
| E2E direct editor | `npm run test:e2e:direct` — set Playwright `baseURL` to editor `?docid=…` for live gate; `E2E_SESSION_MOCK=1` mocks APIs |
| Landing → editor | Accept still writes session via `setItemsandReDirect`; no seed helper required |
| Direct editor (no landing) | [`editor-session-seed.helper.js`](../../tests/e2e/helpers/editor-session-seed.helper.js) + [`session-baseline.helper.js`](../../tests/e2e/helpers/session-baseline.helper.js) seed before goto so dual-guard Ready can pass |

---

## Known gaps

| Gap | Notes |
|-----|--------|
| Feature flag | Dual-guard kill-switch deferred (emergency rollback only if UAT needs it) |
| Backend idle servlet | Not changed this phase |
| Alternate loader | Other entrypoints that fire-and-forget `new_session_check` should be audited if used |
| Idle clocks | UI 40 min / request handoff 15 min / landing 30 min / backend ~30 min — not unified |
| Module docs drift | Some `CORE.md` / `MODULES.md` lines may still describe pre-write verify / poll `skipVerify: true` — trust **this** pack + `LinkSessionCore.js` |

---

## Quirks

1. `check` insert often returns only `{ r: 1 }` — verify the **client** `session_id`.
2. Backend `check` idle may set `docstatus:0` while leaving `session_end_time:"0"` — dual-guard requires `docstatus:"1"`.
3. Brief lag after insert before getdocs can false-fail landing verify (user sees TRY_AGAIN).
4. Helper swallows network errors as `{ ok:false, reason:'request_error' }` — save must map that to postpone, not stale.
