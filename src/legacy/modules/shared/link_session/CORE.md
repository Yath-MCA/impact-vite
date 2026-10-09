# LinkSessionCore — Developer Reference

UI-free linksharing session engine. Extended by `LinkSessionModule` (landing) and `LinkSessionEditor` / `LinkSessionService` (editor).

**Full architecture:** [MODULES.md](./MODULES.md)

---

## Class overview

```javascript
class LinkSessionCore {
    static get PROCESS() { /* check, scheduler, update_reqstatus_time, ... */ }
    static get DOC_STATUS() { /* ACTIVE: '1', INACTIVE: '0' */ }
    static get REQUEST_STATUS() { /* PENDING, ACCEPTED, REJECTED */ }
    static installSessionGlobals(instance) { /* window + commonfn aliases */ }
}
```

Instance state:

| Field | Purpose |
|-------|---------|
| `_schedulerInterval` | 15s editor poll timer |
| `_schedulerOwner` | `CHECK_REQUEST` facade reference |
| `_editorOwner` | Same as facade during editor session |
| `_landingCtxState` | Persisted `sessionStartTime` / `grantSessionStartTime` for bootstrap ajax |
| `_editorTabId` | Cached editor tab id (`xmleditor:tabid`) |

`window.LinkSessionModule` / `window.LinkSessionService` are **class constructors**. Call `.getInstance()` for the singleton.

---

## Process remark keys (Java align)

Java `linksharing` `$set` writes process-specific fields (`close_remarks`, `save_remarks`, `updatereqstatus_remarks`, …), not generic `remarks`. Frontend must send both:

- `LinkSessionCore.PROCESS_REMARK_KEY` — process → Mongo field
- `LinkSessionCore.attachProcessRemarks(payload, process, value)` — sets `remarks` + `*_remarks`
- Wired in `build*Payload` / `buildPayload`, `enrichLinkSharePayload`, and `GET_JSON('linksharing')` in `index.js`

**Manual smoke:** reject a collab request, close/logout a session, and save — network payload should include `updatereqstatus_remarks`, `close_remarks`, and `save_remarks` (non-null).

---

## Session storage helpers

| Method | Role |
|--------|------|
| `getSessionIdKey(docId)` | `xmleditor:sessionid:{docid}` |
| `getTabIdKey()` | `xmleditor:tabid` |
| `getSessionStartTimeKey(docId)` | `xmleditor:sessionstart:{docid}` |
| `readSessionId(docId)` | Read stored session id (sessionStorage + localStorage backup) |
| `getCurrentSessionId()` | `String(readSessionId() \|\| '')` |
| `getCurrentTabId()` | Cached / stored tab id |
| `ensureEditorTabId(docId)` | Create + persist tab id if missing |
| `syncEditorStorageAfterDocIdInit(docId)` | Sync tab/session/docid after DOC_ID ready |
| `updateEditorSessionStorage(sessionId, docId, lastSavedTime, sessionStartTime)` | Persist session id + optional start/last-saved |
| `persistSessionStartTime(start, docId)` | Write start-time key |
| `generateSessionId()` | **New random** session id (also sets `Request_ID`) |
| `getSessionId()` | **Deprecated alias** of `generateSessionId` — do **not** use for reading storage |

### `installSessionGlobals(instance)`

Called from landing `LinkSessionModule` and editor `LinkSessionEditor.ensureGlobals()`:

```javascript
window.getSessionIdKey = (docid) => instance.getSessionIdKey(docid);
window.getSessionId = (docid) => instance.readSessionId(docid);  // storage reader
window.getCurrentSessionId = () => instance.getCurrentSessionId();
window.getCurrentTabId = () => instance.getCurrentTabId();
window.updateEditorSessionStorage = (...args) => instance.updateEditorSessionStorage(...args);
window.syncEditorStorageAfterDocIdInit = (docid) => instance.syncEditorStorageAfterDocIdInit(docid);
window.new_session_check = (opts) => instance.newSessionCheck(opts);
commonfn.new_session_post = (res, opt) => instance.handleNewSessionPost(res, opt);
```

[`index.js`](../../js/index.js) keeps a **fallback** `getSessionId` / `getSessionIdKey` until the session bundle loads, then prefers the module.

[`editor_page_events_fn.js`](../../js/editor_page_events_fn.js) keeps thin delegates + `xmleditor:docid-initialized` → `syncEditorStorageAfterDocIdInit`.

---

## Context resolution

### `resolveSessionContext(options)`

Fills missing `docId`, `sessionId`, `sessionStartTime`, `tabId` from:

1. Explicit options (always win)
2. `_landingCtxState`
3. `DOC_ID` / `readSessionId` / `NEW_SESSION_ID` / sessionStorage
4. Process-aware defaults for start time

| Process group | `session_start_time` |
|---------------|----------------------|
| `check`, `refresh` | Fresh `Date.now()` unless options override |
| Poll / send / scheduler / save / close / … | Prefer landing ctx or `xmleditor:sessionstart:{docid}` |

Used by `buildCheckPayload` and `buildPayload` so callers can pass only `process` / `remarks` / `source`.

---

## Payload builders

All builders merge `ctx` fields with `ADD_DEFAULT_KEYS` via `enrichLinkSharePayload`.

| Method | `process` |
|--------|-----------|
| `buildCheckPayload` | `check` / `refresh` (via `resolveSessionContext`) |
| `buildSchedulerPayload` | `scheduler` |
| `buildUpdateRequestStatusPayload` | `updaterequeststatus` |
| `buildUpdateStatusReqStatusPayload` | `updatestatus_reqstatus` |
| `buildUpdateReqStatusPayload` | `updatereqstatus` |
| `buildUpdateReqStatusTimePayload` | `update_reqstatus_time` |
| `buildSendRequestPayload` | `update_docstatus_reqstatus_insert_time` |
| `buildGetRequestStatusPayload` | `getrequeststatus_process` |
| `buildClosePayload` | `close` |
| `buildSavePayload` | `save` |
| `buildUpdateSessionEndTimePayload` | `update_session_end_time` |

Prefer `buildPayload(process, ctx)` or `getJsonOrBuild(process, extra, ctx)` — uses `GET_JSON('linksharing', …)` when available.

```javascript
// Minimal editor check payload
mod.buildCheckPayload({ process: 'check', source: 'editor', remarks: 'new_tab' });
```

---

## Landing handlers

### `accessFromLanding(ctx)`

1. `onResetHidden()`
2. `sessionStartTime = Date.now()` → `captureLandingCtxState` + `persistSessionStartTime`
3. `POST check` → `handleCheckResponse`

### `handleCheckResponse(response, ctx)`

| `r` | Action |
|-----|--------|
| `1` | `completeAccessGrant` |
| `0` | `delegateSendPrompt` → send UI |
| `2` | `onAccessDeniedWithRemarks` |

Also: `maybeCollatorForceClose`, `isCollabBypass` (collab may skip verify).

### `sendAccessRequest(response, ctx)`

See [send module README](../link_session_send/README.md) for branch table.

### `completeAccessGrant(ctx, checkResponse, options)`

1. Forwards `skipVerify` / `canforceClose` onto `ctx` for collab / Collator force-close only.
2. `persistSessionStartTime` then `commitStorageAndRedirect` → landing `onRedirect` → **`setItemsandReDirect`**.
3. Dual-guard getdocs runs **after** local write inside `setItemsandReDirect` (not here). Poll grant uses `skipVerify: false` so redirect still verifies.

`handleCheckResponse`: DB-error shaped `r:0` (`isCheckErrorResponse`) → **no grant**. Collab/Collator bypass only for conflict-shaped `r:0`. On dual-guard `no_active_row`, `retryLandingSessionCheck` silently retries up to 3× (`remarks: landing_retry`) then navigate or TRY_AGAIN.

### Landing state persistence

```javascript
captureLandingCtxState(ctx);  // after sessionStartTime / grantSessionStartTime set
mergeLandingCtxState(ctx);    // bootstrap ajax callbacks via resolveLandingSessionContext()
```

---

## Editor open / check

### `newSessionCheck(options)`

Editor open/refresh entry (global alias `window.new_session_check`):

1. Detect refresh via existing tab id → `process: refresh` vs `check`
2. `ensureEditorTabId` → `buildCheckPayload` (resolved context)
3. `persistSessionStartTime` for the outbound start time
4. `commonfn.callajax(..., 'new_session_post', API_LINK_SHARE)`

### `handleNewSessionPost(response)`

Ajax callback (alias `commonfn.new_session_post`):

- `r: 1` → `updateEditorSessionStorage` + broadcast close old tab
- `r: 0` → expired / conflict alerts, optional logout or redirect

### `createEditorFacade()`

Returns `CHECK_REQUEST` object with:

| Key | Role |
|-----|------|
| `Init` | `initEditorSession` |
| `check_request` | `startScheduler` |
| `new_request_post` | `handleNewRequestPost` |
| `open_new_request` | `handleOpenNewRequestDefault` |
| `runIdleCheck` | `handleIdleCheck` |
| `StopAll` | `stopEditorSession` |

### `initEditorSession(owner)`

1. `update_session_end_time` or `refresh` (timeout)
2. `scheduler` (interval 15s)

### Scheduler lifecycle and UI ownership

| Timer / state | Starts | Stops or pauses | Notes |
|---------------|--------|-----------------|-------|
| LinkSession scheduler | `CHECK_REQUEST.Init()` → `initEditorSession` → `timerMethod('scheduler')` | `owner.forceStop`, offline check, `cancelTimer`, `stopScheduler`, `StopAll`, `STOP_ALL_EVENT_TIMERS`, idle alert start | Polls `new_request_post` every `15000ms`. |
| Idle alert countdown | `handleIdleCheck` after 40 minutes since `IMPACT_SAVE.state.lastSaveTimestamp` | Continue Session, timeout, dismiss, logout path | `handleIdleCheck` sets `Idle_Alert_State` and `Idle_Alert_Showing`, cancels the scheduler, sets editor read-only, runs one `IMPACT_SAVE.iSave({ forcesave: true, noalert: true })`, then opens `AlertNewDialog.fire('idle_session_alert')` with the 30s alert timer. |
| Request dialog active flag | `LinkSessionRequestModule.showLoop()` | Accept, reject, auto-accept, close | While active, `handleIdleCheck` does not open the idle alert. |

Collision ownership rules:

- Idle alert owns the session once `Idle_Alert_Showing` is true. `handleNewRequestPost` and `handleOpenNewRequestDefault` return without opening `LinkSessionRequestDialog`.
- Continue Session clears idle flags, unlocks the editor, and restarts the scheduler through `initEditorSession(owner)`.
- Timeout, dismiss, or logout keeps the scheduler stopped and follows the existing `close` → `logout_with_alert` → redirect flow.
- If a request dialog is already visible, idle alert waits for the next scheduler cycle instead of interrupting the request dialog.
- `STOP_ALL_EVENT_TIMERS` is the global shutdown path: it cancels Save, stops LinkSession through `CHECK_REQUEST.StopAll`, pauses ParaLock events, and sets the editor read-only.

### `handleOpenNewRequestDefault(response, owner)`

- Idle &gt; 15 min on active row → `idle_session_close`
- Else → force save + `openRequestDialog`

---

## Double-verify

`confirmSessionOnServer(expected)`:

1. `POST getdocs` with `buildSessionFindQuery`
2. `isActiveSessionRecord` — matches `docid`, `docstatus: 1`, `session_end_time: 0`, `session_id`

Landing write-then-verify: `setItemsandReDirect` → `confirmLinkSessionOnServer`.

### Editor boot phases (Flow B)

```text
1. LOADING_CONFIG batch (config.xml, ceg.xml, …)
2. InitialLoadDialog.runConfigCompleteGate → validateSessionThenReady
   (Track View / localhost allow; live: confirmLinkSessionOnServer)
   FAIL → expired alert, no openhtml
3. EDITOR_INITIALIZE.RUN_READY_TO_OPEN → openhtml
4. CKEDITOR.replace + EditorBootInit.runEditorShellInits (SET_DATA, …)
5. instanceReady → progress 10 → runPostEditorBootstrap
6. bootstrapImpactModules({ mode }) — register defs only
7. EditorBootInit.runTier1 — AlertNewDialog.init + LinkSession getModule
8. EditorBootInit.runQuery (+ runTrackFollowUp on Track View)
9. finishReady — FullyLoaded
10. EditorBootInit.runTier2 — CHECK_REQUEST.Init, LOG_OUT.Init (editor only)
```

Optional localhost seed: `localHostSession.js` (not Ready).

---

## HTTP

```javascript
postLinkShare(jsondata)  // POST API_LINK_SHARE, field jsondata
postGetDocs(query)       // POST API_GET_DOCS
```

Errors logged via instance `logError` → `EnhancedErrorTracker` (BaseModule pattern), with `ErrorLogTrace` fallback when tracker is unavailable.

---

## Extension points

| Need | Approach |
|------|----------|
| New landing UI step | Add sub-module; register on `LinkSessionPorts`; wire `ctx.ui` in `LandingPage` |
| New editor dialog | Extend or replace `LinkSessionRequestModule` |
| New backend process | Add to `PROCESS`, builder method, handler, bootstrap callback if ajax-routed |
| Editor-only behavior | Override in `LinkSessionEditor` / `LinkSessionService` or facade method |

---

## Do not

- Put Swal / `AlertNewDialog` calls in core for send UI (use send/request modules) — editor conflict alerts in `handleNewSessionPost` are intentional
- Call `delegateSendPrompt` from `ctx.ui.sendPrompt` (recursion risk)
- Rely on `LinkSessionCore.getInstance()` — use landing `LinkSessionModule` or editor `LinkSessionEditor` / `LinkSessionService`
- Use `generateSessionId()` / deprecated `getSessionId()` when you need the **current** stored id — use `readSessionId` / `window.getSessionId`

---

## Tests

[`tests/unit/link_session/`](../../../tests/unit/link_session/)

- `buildPayload.test.js` — payload shapes, `resolveSessionContext`
- `editorSessionHelpers.test.js` — storage helpers, `newSessionCheck`, `installSessionGlobals`
- `sendRequest.test.js` — send branches, delegation
- `landingCtxState.test.js` — state persistence
- `ports.test.js` — `openRequestDialog` retry
- `editorInit.test.js` — init order contract
- `gulpBundle.test.js` — gulp file order
