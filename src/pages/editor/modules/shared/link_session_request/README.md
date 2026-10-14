# LinkSessionRequestModule

Editor dialog for **incoming access requests** — accept, reject, or 30s auto-accept.

**Logic owner:** [`LinkSessionCore`](../link_session/LinkSessionCore.js) / [`LinkSessionService`](../link_session/index.js).

---

## Files

| File | Role |
|------|------|
| `index.js` | `LinkSessionRequestModule` class |
| `template.html` | Dialog DOM — id `LinkSessionRequestDialog` |
| `skills.md` | Agent runbook (short) |

---

## How the dialog opens

1. `CHECK_REQUEST.Init()` starts 15s scheduler (`LinkSessionCore.initEditorSession`)
2. Scheduler finds pending request → `handleNewRequestPost` → `updaterequeststatus` → `open_new_request`
3. `handleOpenNewRequestDefault` → `IMPACT_SAVE.iSave` → `openRequestDialog(this)`
4. `openRequestDialog` retries until this module registers on `LinkSessionPorts.request`
5. `request_dialog()` → `show()` + `showLoop()` (countdown)

The dialog opens only from the LinkSession request path above. If the idle alert is already active, LinkSession request handlers return without opening this panel.

---

## UI

Template: `#LinkSessionRequestDialog` (`.wo-editor-access`)

| Element | Purpose |
|---------|---------|
| `#confirmok` | Accept — manual handoff |
| `#confirmcancel` | Reject — opens Swal for remarks |
| `#link_session_message` | `ALERT_MESSAGE.request_dialog.text` |
| `#seconds-timer` | Auto-accept countdown (30s) |

**Note:** Legacy `link_share` also opened Bootstrap `#modalConfirm`; this module uses only the BaseModule panel.

---

## Timer lifecycle

| Timer / state | Starts | Clears |
|---------------|--------|--------|
| Active request flag | `showLoop()` | `clearRequestDialogTimers()` |
| Countdown interval | `showLoop()`; updates `#seconds-timer` every 1s | Accept, reject, auto-accept, close |
| Auto-accept timeout | `showLoop()`; 30s timeout | Accept, reject, auto-accept, close |

While the request dialog is active, `LinkSessionCore.handleIdleCheck` skips the idle alert. The next LinkSession scheduler cycle can reassess idle after the request dialog closes.

---

## Actions and payloads

| User action | Handler | Backend `process` | Key fields |
|-------------|---------|-------------------|------------|
| Accept | `handleConfirmDialog('confirm')` | `updatestatus_reqstatus` | `docstatus: '4'`, `requeststatus: '3'` |
| Auto-accept (30s) | `handleDialogAutoAccept` | `updatestatus_reqstatus` | `docstatus: '3'`, `requeststatus: '3'` |
| Reject | `handleRejectRequest` | `updatereqstatus` | `remarks` (optional) |

Ajax callback: `request_close_session` → `RE_DIRECT_CUR_SESSION` (active editor redirects; requester may enter).

Payloads via:

```javascript
const service = LinkSessionService.getInstance();
service.getJsonOrBuild('updatestatus_reqstatus', { docstatus: '4', requeststatus: '3' });
```

---

## Registration

[`module_main.js`](../module_main.js):

```javascript
{
    name: 'LinkSessionRequestModule',
    path: './link_session_request/index.js',
    type: 'onthefly',
    templatePath: './link_session_request/template.html',
    dependencies: ['LinkSessionService']
}
```

### `postInitializeModule`

| Global | Value |
|--------|-------|
| `window.LinkSessionRequestDialog` | module instance |
| `window.LinkShareDialog` | deprecated alias |
| `window.LinkSessionPorts.request` | module instance |
| `window.confirmok` | `handleConfirmDialog` |

---

## Init dependency

Must load **after** `LinkSessionService` so `CHECK_REQUEST` and `getInstance()` exist.

Production init ([`_initalLoadingDialog.js`](../../js/_initalLoadingDialog.js)):

1. Await both modules (or skip if gulp `session_editor.js` already set `CHECK_REQUEST`)
2. `CHECK_REQUEST.Init()`
3. `window.new_session_check()` → `LinkSessionCore.newSessionCheck` (installed by `installSessionGlobals`)

---

## Idle session path

Same scheduler tick: if no pending request and this dialog is not active, `handleIdleCheck` may open the idle alert after 40 minutes idle. Idle alert startup cancels the LinkSession scheduler, locks the editor, starts one `IMPACT_SAVE.iSave({ forcesave: true, noalert: true })`, then opens the 30s alert.

---

## Selectors in tests

Prefer `#LinkSessionRequestDialog`; legacy tests may use `#LinkShareDialog`. E2E helper checks both.

---

## Tests

- Unit: none yet — add `LinkSessionRequestModule` handler tests
- Integration: covered indirectly via scheduler in manual QA

---

## See also

- [MODULES.md](../link_session/MODULES.md) — full architecture
- [API.md](../link_session/API.md) — `updaterequeststatus`, `updatestatus_reqstatus`, `updatereqstatus`
