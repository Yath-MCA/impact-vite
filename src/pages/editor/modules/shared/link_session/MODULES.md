# Link Session — Core and Sub-Modules

**Audience:** Developers working on linksharing (landing login, send request, editor scheduler, accept/reject dialog).

**Priority:** Send Request on landing is **Level 1 (P0)** — any defect in that flow is a top-priority ticket.

**Related docs:**
- [API.md](./API.md) — backend `process` values and MongoDB mapping
- [docs/linksharing-frontend-backend-map.md](../../../docs/linksharing-frontend-backend-map.md) — team FE ↔ BE reference
- [link_session_send/skills.md](../link_session_send/skills.md) — send UI runbook
- [link_session_request/skills.md](../link_session_request/skills.md) — request dialog runbook

---

## Architecture

```mermaid
flowchart TB
    subgraph landing [Landing gulp bundle]
        LP[LandingPage]
        BOOT[bootstrap.js]
        PORTS[ports.js]
        CORE[LinkSessionCore]
        LSM[LinkSessionModule]
        SEND[LinkSessionSendModule]
    end
    subgraph editor [Editor gulp e6_main]
        ILD[InitialLoadDialog]
        ED[LinkSessionEditor]
        PORTSE[ports.js]
        BOOTE[bootstrap.js]
        CR[CHECK_REQUEST facade]
    end
    subgraph webpack_hold [Webpack on hold]
        SVC[LinkSessionService]
        REQ[LinkSessionRequestModule]
    end
    LP --> LSM
    LSM --> CORE
    LP -->|buildLandingSessionContext| SEND
    BOOT --> CORE
    PORTS --> SEND
    PORTS --> REQ
    ILD --> ED
    ED --> CORE
    PORTSE --> ED
    BOOTE --> ED
    ED --> CR
    SVC -.-> CORE
    REQ -.-> SVC
    CORE -->|POST linksharing| API[API_LINK_SHARE]
    CORE -->|POST getdocs| GD[API_GET_DOCS]
```

**Design principle:** Session logic lives in **one UI-free core**. UI is split into **send** (landing) and **request** (editor) sub-modules connected through **ports**.

---

## Module map

| Piece | Path | Gulp page | Role |
|-------|------|-----------|------|
| **session_landing** | `pipeline.js` PAGES | Gulp → `session_landing.js` | ports → core → module → bootstrap → send |
| **session_editor** | `pipeline.js` PAGES | Gulp → `session_editor.js` | ports → core → LinkSessionEditor → bootstrap |
| **LinkSessionService** | `index.js` | Webpack `module_main` (on hold) | Future webpack editor entry |
| **LinkSessionSendModule** | `../link_session_send/index.js` | Gulp landing only | Send Request + 45s poll Swal |
| **LinkSessionRequestModule** | `../link_session_request/index.js` | Webpack `module_main` | Accept / reject / auto-accept dialog |

**Deprecated:** `src/modules/link_share/` — do not extend; use this stack instead.

---

## LinkSessionCore

UI-free class. Extended by landing wrapper and editor service; never imported as a webpack entry on its own.

### Responsibilities

| Area | Methods |
|------|---------|
| **Globals** | `installSessionGlobals` — window + `commonfn` aliases |
| **Session storage** | `readSessionId`, `getSessionIdKey`, `getCurrentSessionId`, `getCurrentTabId`, `ensureEditorTabId`, `syncEditorStorageAfterDocIdInit`, `updateEditorSessionStorage`, `persistSessionStartTime` |
| **Context** | `resolveSessionContext` — process-aware fill of docId / sessionId / startTime / tabId |
| **Payload builders** | `buildPayload`, `buildCheckPayload`, `buildSendRequestPayload`, `buildUpdateReqStatusTimePayload`, `buildGetRequestStatusPayload`, `getJsonOrBuild`, … |
| **HTTP** | `postLinkShare`, `postGetDocs`, `postRequest` |
| **Landing login** | `accessFromLanding`, `handleCheckResponse`, `sendAccessRequest`, `handleUpdateReqId`, `pollRequestStatus`, `handleGetReqStatus`, `completeAccessGrant` |
| **Double-verify** | `confirmSessionOnServer`, `validateBeforeSave`, `isActiveSessionRecord` |
| **Landing state** | `captureLandingCtxState`, `mergeLandingCtxState` — persists `sessionStartTime` across bootstrap ajax callbacks |
| **Editor open** | `newSessionCheck`, `handleNewSessionPost` (aliases: `window.new_session_check`, `commonfn.new_session_post`) |
| **Editor scheduler** | `initEditorSession`, `startScheduler`, `handleNewRequestPost`, `handleOpenNewRequestDefault`, `handleIdleCheck` |
| **Editor facade** | `createEditorFacade` → `window.CHECK_REQUEST` |
| **Redirect** | `commitStorageAndRedirect`, `redirectCurrentSession` |
| **Id generation** | `generateSessionId` (deprecated alias: instance `getSessionId`) — **not** the storage reader |

### Landing flow (`accessFromLanding`)

1. `buildCheckPayload` → `POST linksharing` (`process: check`)
2. `handleCheckResponse`:
   - `r: 1` (or collab bypass) → `completeAccessGrant` → `commitStorageAndRedirect` → landing `setItemsandReDirect` (write then getdocs dual-guard unless collab/Collator `skipVerify`)
   - `r: 0` → `delegateSendPrompt` → send sub-module UI
   - `r: 2` → `ctx.onAccessDeniedWithRemarks`

### Send-request chain (P0)

1. User confirms → `sendAccessRequest` (branches on `requeststatus` / 30 min stale rules)
2. `update_reqstatus_time` or `update_docstatus_reqstatus_insert_time` → `handleUpdateReqId`
3. `showPollWaiting` (45s) → `pollRequestStatus` → `getrequeststatus_process`
4. Grant → `completeAccessGrant` with `skipVerify: false` (redirect still dual-guards in `setItemsandReDirect`)

### Editor scheduler

`CHECK_REQUEST.Init()` → `initEditorSession` → `timerMethod('scheduler')` every **15s** → `new_request_post` → on pending request → `open_new_request` → `openRequestDialog` (retries up to 5s).

Scheduler lifecycle:

| Scheduler / timer | Start | Pause / stop |
|-------------------|-------|--------------|
| LinkSession poll | `CHECK_REQUEST.Init()` / `initEditorSession` | `forceStop`, offline, `CHECK_REQUEST.StopAll`, `STOP_ALL_EVENT_TIMERS`, idle alert start |
| Idle alert | 40 minutes idle and no active request dialog | Continue Session clears flags and restarts poll; timeout/dismiss/logout keeps poll stopped |
| LinkRequestDialog timers | `request_dialog()` → `showLoop()` starts 1s countdown + 30s timeout | Accept, reject, auto-accept, or close |
| Save auto-save | `SaveModule.startAutoSave()` every `40000ms` online or `10000ms` offline | `SaveModule.cancel()`, `stopAutoSave()`, validation failure, `STOP_ALL_EVENT_TIMERS` |
| ParaLock loop | CKEditor `instanceReady`; 250ms initial-load wait; `_resumeEvents()` starts `config.INTERVAL_MS` loop | `_pauseEvents()`, `beforeSetData`, `stopRuntime`, `STOP_ALL_EVENT_TIMERS`; cleanup retries every 500ms until done |

Clash handling:

- Idle detected first: scheduler is canceled, editor becomes read-only, one `IMPACT_SAVE.iSave({ forcesave: true, noalert: true })` starts, then the 30s idle alert opens.
- Incoming request while idle alert is showing: request dialog is blocked; idle alert remains the owner.
- Idle threshold while request dialog is active: idle alert is skipped until the request dialog resolves and a later scheduler tick checks again.
- Stale request row with `last_saved_time` older than 15 minutes: `idle_session_close` runs instead of showing `LinkSessionRequestDialog`.
- Global logout/finalize shutdown uses `STOP_ALL_EVENT_TIMERS` to stop Save and LinkSession and pause ParaLock before read-only mode.

### Constants

- `LinkSessionCore.PROCESS` — all backend `process` string values
- `LinkSessionCore.DOC_STATUS` — `ACTIVE: '1'`, `INACTIVE: '0'`
- `LinkSessionCore.REQUEST_STATUS` — `PENDING: '1'`, `ACCEPTED: '2'`, `REJECTED: '4'`

---

## ports.js

Registers UI adapters without coupling core to DOM.

```javascript
window.LinkSessionPorts = { send: null, request: null };
```

| Export | Purpose |
|--------|---------|
| `getRequestDialog(self)` | Resolve editor dialog: ports → `LinkSessionRequestDialog` → legacy `LinkShareDialog` |
| `openRequestDialog(self, options)` | Retry dialog open until `LinkSessionRequestModule` registers (default 20 × 250ms) |

Sub-modules set `LinkSessionPorts.send` / `.request` on load.

---

## bootstrap.js

Wires legacy `commonfn.*` handlers to core methods. Uses `resolveLandingSessionContext()` which merges persisted state from `captureLandingCtxState`.

| Callback | Core handler |
|----------|----------------|
| `checkaccess` | `handleCheckResponse` |
| `update_open1` | `handleUpdateOpen1` |
| `updatereq_id` | `handleUpdateReqId` |
| `getreqstatus` | `handleGetReqStatus` |
| `request_close_session` | `RE_DIRECT_CUR_SESSION` |
| `idle_session_close` | `RE_DIRECT_CUR_SESSION` |

---

## LinkSessionModule (landing)

Thin wrapper: `class LinkSessionModule extends LinkSessionCore`.

- `getInstance()` — auto-creates singleton (unlike editor service)
- Sets `window.LinkSessionModule` and `window.LinkSessionService` (alias)
- `DOMContentLoaded` — resets `_instance`, sets `RE_DIRECT_CUR_SESSION`

**Usage:**

```javascript
LinkSessionModule.getInstance().accessFromLanding(buildLandingSessionContext());
```

`buildLandingSessionContext()` in [`LandingPage.js`](../../js/dialogModules/LandingPage.js) supplies callbacks (`onTryAgain`, `onRequestError`, `onVerifyFailed`) and `ctx.ui` ports pointing at `LinkSessionSendModule`.

---

## LinkSessionService (editor)

Webpack entry [`index.js`](./index.js). Same core logic, different init:

- `getInstance()` — returns `null` until `postInitializeModule`
- `postInitializeModule` sets:
  - `window.LinkSessionService` / `window.LinkSessionModule`
  - `LinkSessionCore.installSessionGlobals(this)`
  - `window.CHECK_REQUEST` = `createEditorFacade()`
  - `window.RE_DIRECT_CUR_SESSION`

**Production gulp path** uses [`LinkSessionEditor.js`](./LinkSessionEditor.js) instead (`session_editor.js` → `ensureGlobals` + `installSessionGlobals`).

**Init order** (production [`_initalLoadingDialog.js`](../../js/_initalLoadingDialog.js)):

1. Skip webpack module load if `CHECK_REQUEST` already exists (gulp `session_editor.js`)
2. Else `await moduleRegistry.getModule('LinkSessionService')` then `LinkSessionRequestModule`
3. `CHECK_REQUEST.Init()`
4. `window.new_session_check()` → `instance.newSessionCheck()` (from `installSessionGlobals`)

`FullyLoaded` is set only after this async chain completes.

Thin shims remain in [`editor_page_events_fn.js`](../../js/editor_page_events_fn.js) for late callers and `xmleditor:docid-initialized` → `syncEditorStorageAfterDocIdInit`.

---

## LinkSessionSendModule

**Path:** [`../link_session_send/`](../link_session_send/)

| Method | UI | Next step |
|--------|-----|-----------|
| `prompt(response, ctx)` | `AlertNewDialog` `Land_Page_Send_Req` | `sendAccessRequest` on confirm |
| `showPollWaiting(ctx)` | Swal 45s timer | `pollRequestStatus` on timer expiry |

Missing `AlertNewDialog` or service → `ctx.onRequestError`.

**Bundle:** Gulp landing only (not webpack). Sources listed in [`utils/gulp/pipeline.js`](../../../utils/gulp/pipeline.js) — gulp concat builds `session_landing.js`.

**Landing** [`utils/gulp/pipeline.js`](../../../utils/gulp/pipeline.js):

`index.js` → `session_landing.js` → `landing.js` (dialogs) — see `snippet/component/page_script_landing.html`

`session_landing` page: `ports` → `LinkSessionCore` → `LinkSessionModule` → `bootstrap` → `link_session_send`

**Editor** [`utils/gulp/pipeline.js`](../../../utils/gulp/pipeline.js):

`e6_common` → `session_editor.js` → `e6_main.js` — `CHECK_REQUEST` from `LinkSessionEditor.ensureGlobals()`. Webpack on hold.

---

## LinkSessionRequestModule

**Path:** [`../link_session_request/`](../link_session_request/)

`BaseModule` dialog — template id **`LinkSessionRequestDialog`** (legacy alias: `LinkShareDialog`).

| Method | Behavior |
|--------|----------|
| `request_dialog()` | `show()` incoming-request panel |
| `showLoop()` | Marks dialog active; starts 1s countdown and 30s auto-accept timeout |
| `handleConfirmDialog('confirm')` | `updatestatus_reqstatus` docstatus `4` |
| `handleConfirmDialog('cancel')` | Swal reject → `updatereqstatus` |
| `handleDialogAutoAccept()` | Clears timers; `updatestatus_reqstatus` docstatus `3` |

Payloads built via `LinkSessionService.getInstance().getJsonOrBuild(...)`.

**Registration:** `module_main.js` — depends on `LinkSessionService`, template `link_session_request/template.html`.

---

## Session context (`ctx`)

Built by `buildLandingSessionContext()` or passed from editor handlers.

| Field | Purpose |
|-------|---------|
| `docId`, `sessionId`, `requestId` | Identity for payloads |
| `sessionStartTime` | Set at check; persisted via `captureLandingCtxState` |
| `grantSessionStartTime` | Set on send / poll; used in double-verify |
| `onTryAgain`, `onRequestError`, `onVerifyFailed` | Landing error UX |
| `onCommitStorage`, `onRedirect` | Grant success |
| `ui.sendPrompt`, `ui.showPollWaiting` | Ports to send module |

---

## Globals after init

| Global | Set by |
|--------|--------|
| `LinkSessionModule` / `LinkSessionService` | Landing wrapper or editor `LinkSessionEditor` / webpack service (**class**, use `.getInstance()`) |
| `CHECK_REQUEST` | `LinkSessionEditor.ensureGlobals` / `LinkSessionService.postInitializeModule` |
| `getSessionId` / `getSessionIdKey` | `installSessionGlobals` → `readSessionId` / `getSessionIdKey` (index.js fallback until session bundle loads) |
| `getCurrentSessionId` / `getCurrentTabId` | `installSessionGlobals` |
| `updateEditorSessionStorage` / `syncEditorStorageAfterDocIdInit` | `installSessionGlobals` |
| `new_session_check` | `installSessionGlobals` → `newSessionCheck` |
| `commonfn.new_session_post` | `installSessionGlobals` → `handleNewSessionPost` |
| `LinkSessionSendModule` | `link_session_send/index.js` |
| `LinkSessionRequestDialog` | `LinkSessionRequestModule.postInitializeModule` |
| `LinkSessionPorts` | `ports.js`; filled by send/request modules |
| `getRequestDialog`, `openRequestDialog` | `ports.js` |
| `confirmok` | Request module (legacy pattern) |

---

## Testing

| Suite | Command |
|-------|---------|
| Unit | `npm run test:unit` — `tests/unit/link_session/` |
| E2E | `npm run test:module:link-session` |

Key unit areas: payloads, `resolveSessionContext`, storage helpers / `newSessionCheck`, send branches, ports retry, landing ctx state, editor init order.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Send Request does nothing | `LinkSessionSendModule` in landing gulp bundle; `AlertNewDialog` loaded |
| Editor never shows request dialog | `CHECK_REQUEST.Init()` called; `LinkSessionRequestModule` loaded; `openRequestDialog` retries |
| Poll uses wrong `session_start_time` | `captureLandingCtxState` / `persistSessionStartTime` after login; bootstrap uses `resolveLandingSessionContext` |
| Save blocked incorrectly | `validateBeforeSave` / getdocs; `sessionId` via `readSessionId` / sessionStorage |
| Stack overflow on send | `ctx.ui.sendPrompt` must not call `delegateSendPrompt` (fixed in `LandingPage.js`) |
| `window.LinkSessionModule.session_id` undefined | Globals are the **class**; use `.getInstance().readSessionId()` or `window.getSessionId` |
| `new_session_check` missing | Ensure `session_editor.js` loaded and `installSessionGlobals` ran before `e6_main` callers |
