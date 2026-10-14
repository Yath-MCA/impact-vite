# LinkSessionSendModule

**Priority:** P0 (Level 1) — landing Send Request and poll-waiting UI.

**Logic owner:** [`LinkSessionCore`](../link_session/LinkSessionCore.js) — this module only handles browser UI.

---

## Files

| File | Role |
|------|------|
| `index.js` | `LinkSessionSendModule` object: `prompt`, `showPollWaiting` |
| `skills.md` | Agent runbook (short) |

---

## Flow

```
handleCheckResponse (r:0)
  → delegateSendPrompt
  → ctx.ui.sendPrompt  OR  LinkSessionSendModule.prompt
  → AlertNewDialog "Land_Page_Send_Req"
  → user confirms
  → LinkSessionCore.sendAccessRequest
  → POST update_reqstatus_time (or stale-row branch)
  → handleUpdateReqId (r:1)
  → ctx.ui.showPollWaiting  OR  LinkSessionSendModule.showPollWaiting
  → Swal 45s countdown
  → timer expires
  → LinkSessionCore.pollRequestStatus
  → getrequeststatus_process
  → completeAccessGrant → setItemsandReDirect (write then getdocs; poll keeps skipVerify false)
```

---

## API

### `prompt(response, ctx)`

| Dependency | On missing |
|------------|------------|
| `AlertNewDialog.fire` | `ctx.onRequestError` |
| `LinkSessionModule.getInstance()` | `ctx.onRequestError` |

On confirm → `service.sendAccessRequest(response, ctx)`.

### `showPollWaiting(ctx)`

| Dependency | On missing |
|------------|------------|
| `LinkSessionModule.getInstance()` | `ctx.onRequestError` |
| `Swal` | Falls through to `service.pollRequestStatus(ctx)` immediately |

Swal config: 45s timer, no outside click / escape, progress bar. Poll runs only when `result.dismiss === Swal.DismissReason.timer`.

---

## Integration

### LandingPage ports

[`buildLandingSessionContext()`](../../js/dialogModules/LandingPage.js) defines:

- `ui.sendPrompt` → `LinkSessionSendModule.prompt` or `onRequestError`
- `ui.showPollWaiting` → `LinkSessionSendModule.showPollWaiting` or `onRequestError`

Core always prefers `ctx.ui` when present (`delegateSendPrompt` / `handleUpdateReqId`).

### Ports registration

On load:

```javascript
window.LinkSessionSendModule = LinkSessionSendModule;
window.LinkSessionPorts.send = LinkSessionSendModule;
```

---

## Bundle

**Gulp landing only** — not registered in `module_main.js` or webpack entries (excluded from module glob).

Concat order ([`utils/gulp/pipeline.js`](../../../utils/gulp/pipeline.js)):

**Landing:** `index.js` → `session_landing.js` → `landing.js` — see `snippet/component/page_script_landing.html`

**Editor:** `e6_common` → `session_editor.js` (`installSessionGlobals` + `CHECK_REQUEST`) → `e6_main.js`

---

## sendAccessRequest branches (core)

Handled in core, not this module — documented here for P0 debugging:

| Condition | `process` |
|-----------|-----------|
| Fresh send (`requeststatus: 0`) | `update_reqstatus_time` |
| Pending &lt; 30 min (`requeststatus: 1`) | `onTryAgain` only |
| Pending &gt; 30 min | `update_docstatus_reqstatus_insert_time` |
| Rejected stale (`requeststatus: 4`, &gt; 30 min) | `update_reqstatus_time` with `oldrequestid` |

---

## Tests

- Unit: [`tests/unit/link_session/sendRequest.test.js`](../../../tests/unit/link_session/sendRequest.test.js)
- E2E: [`tests/e2e/land-only/link-session-workflow.spec.js`](../../../tests/e2e/land-only/link-session-workflow.spec.js) — isolated `sendAccessRequest` on `about:blank`

---

## See also

- [MODULES.md](../link_session/MODULES.md) — full architecture
- [API.md](../link_session/API.md) — backend processes
