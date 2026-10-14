# LinkSession Module

Unified linksharing session layer. **Send Request = Level 1 priority.**

**Documentation:**
- [MODULES.md](./MODULES.md) — architecture, all modules, init, globals, troubleshooting
- [CORE.md](./CORE.md) — `LinkSessionCore` method reference (storage, `resolveSessionContext`, `newSessionCheck`)
- [API.md](./API.md) — backend process catalog
- [link_session_send/README.md](../link_session_send/README.md) — send UI (P0)
- [link_session_request/README.md](../link_session_request/README.md) — request dialog

## Structure

| Module | Path | Role |
|--------|------|------|
| **LinkSessionCore** | `LinkSessionCore.js` | UI-free payloads, storage helpers, handlers, verify, scheduler, editor check/post |
| **bootstrap** | `bootstrap.js` | `commonfn.*` wiring |
| **ports** | `ports.js` | `LinkSessionPorts`, dialog open retry |
| **LinkSessionSendModule** | `../link_session_send/` | Landing send + poll UI (P0) |
| **LinkSessionRequestModule** | `../link_session_request/` | Editor accept/reject dialog |
| **LinkSessionEditor** | `LinkSessionEditor.js` | Editor gulp entry — `ensureGlobals` + `installSessionGlobals` + `CHECK_REQUEST` |
| **LinkSessionService** | `index.js` | Webpack editor entry (on hold) |
| **Landing wrapper** | `LinkSessionModule.js` | `extends Core`, landing `getInstance()` + `installSessionGlobals` |

## Landing

```javascript
const mod = LinkSessionModule.getInstance();
mod.accessFromLanding(buildLandingSessionContext()); // ctx.ui → send module
```

Gulp landing: `session_landing.js` then `landing.js` — see `page_script_landing.html`

Gulp editor: `session_editor.js` between `e6_common` and `e6_main`

## Editor

```javascript
// Gulp (current): CHECK_REQUEST + session globals from session_editor.js at load time
CHECK_REQUEST.Init();
new_session_check(); // → LinkSessionCore.newSessionCheck via installSessionGlobals

// Or explicitly:
const svc = (window.LinkSessionModule || window.LinkSessionService).getInstance();
svc.newSessionCheck({ remarks: 'new_tab' });
// readSessionId / resolveSessionContext — see CORE.md
```

Production: [`_initalLoadingDialog.js`](../../js/_initalLoadingDialog.js) — skips webpack module load if `CHECK_REQUEST` exists → `Init()` → `new_session_check()`.

**Do not** expect `session_id` on the class: use `svc.readSessionId()` or `window.getSessionId`.

## Scheduler / clash notes

- LinkSession poll starts at `CHECK_REQUEST.Init()` and runs every `15000ms`.
- Save auto-save starts from `SaveModule.startAutoSave()` and runs every `40000ms` online or `10000ms` offline.
- Idle alert owns the session after 40 minutes idle: stop scheduler, read-only editor, one `IMPACT_SAVE.iSave({ forcesave: true, noalert: true })`, then 30s idle alert.
- Continue Session clears idle flags and restarts `initEditorSession`; timeout/dismiss/logout keeps the scheduler stopped.
- `LinkSessionRequestDialog.showLoop()` owns a 1s countdown and 30s auto-accept timeout; accept, reject, auto-accept, and close clear timers.
- ParaLock starts from CKEditor `instanceReady`, waits every `250ms` for initial load, runs on `config.INTERVAL_MS`, and cleanup retries every `500ms`.
- If request dialog is active, idle alert waits. If idle alert is active, request dialog does not open.
- `STOP_ALL_EVENT_TIMERS` cancels Save, stops LinkSession, pauses ParaLock, and sets the editor read-only.

## Tests

`npm run test:unit` · `npm run test:module:link-session`
