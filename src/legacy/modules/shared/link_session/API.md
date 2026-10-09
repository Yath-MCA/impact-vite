# LinkSession API Reference (authoritative)

**Backend source:** `impactgenericjavaapiv3` → `utils/researchpad/co/linksharing.java` (servlet) → `mongo/researchpad/co/Mongodbops.java` (`Linksharing` / `LinksharingCollaborative`, lines ~2548–3678)

**Collection:** `rlinksharing` (`tbl: "linksharing"`)

**Transport:** `POST /linksharing` with form field `jsondata` (stringified JSON). Headers: `appkey`, `apikey`.

**Response:** Flat JSON document printed from inner `data` — primary field is `r`.

**Routing:** If payload contains `collaborative` → `LinksharingCollaborative`; else → `Linksharing`.

---

## Regular vs collaborative

| Aspect | Regular | Collaborative |
|--------|---------|---------------|
| Session scope | Per `docid` | Per `docid` + `role` + `rolename` + `username` |
| Extra process | — | `signoff` |
| `refresh` filter | `session_end_time != "0"` (reopen closed) | `session_end_time == "0"` (refresh open) |

---

## Process catalog

| Process | Caller | Writes DB | Purpose |
|---------|--------|-----------|---------|
| `check` | Landing, editor | Yes | Open session or deny |
| `update_reqstatus_time` | Landing (send request) | Yes | Set pending request on active row |
| `update_docstatus_reqstatus_insert_time` | Landing (stale pending) | Yes | Archive stale row + insert new session |
| `scheduler` | Editor interval (~15s) | No | Poll for `requeststatus: 1` |
| `updaterequeststatus` | Editor after scheduler | Yes | Promote request `1 → 2` |
| `updatestatus_reqstatus` | Editor accept/timeout/idle | Yes | Hand off session (`docstatus` + `requeststatus: 3`) |
| `updatereqstatus` | Editor reject | Yes | Reject (`requeststatus: 4`, `remarks`) |
| `getrequeststatus_process` | Landing after 45s wait | Yes | Poll approval; archive + insert on grant |
| `close` | Logout, idle | Yes | `docstatus: 0`, set `session_end_time` |
| `refresh` | Editor tab refresh | Yes | Reopen or refresh session row |
| `save` | Editor save | Yes | Update `last_saved_time` |
| `update_session_end_time` | CHECK_REQUEST init | Yes | Touch `session_end_time` only |
| `update_req_status` | — | Yes | Clear status-4 request (unused by frontend) |
| `signoff` | Collab finalize | Yes | Close all rows for role |

---

## `check`

**Request (required):** `docid`, `process`, `session_id`, `session_start_time`

**Logic (regular):**
1. Find `{ docid, docstatus: "1", session_end_time: "0" }`
2. Not found → INSERT active row → `{ r: 1 }`
3. Found → if idle **> 30 min** since `last_saved_time` → auto-close (`docstatus: "0"`, `session_end_time` stays `"0"`) → `{ r: 1 }`
4. Else → return existing row + `{ r: 0 }`

**Insert fields:** `docstatus: "1"`, `session_end_time: "0"`, `last_saved_time: "0"`, `requeststatus: "0"`, `requestid: "0"`, `request_send_time: "0"`, plus all payload keys.

**Collab:** Same idle rule but auto-close only if `last_saved_time != "0"`. Scoped by user/role filter.

| `r` | Meaning |
|-----|---------|
| `1` | Granted (insert or idle auto-close) |
| `0` | Blocked — active session elsewhere |

---

## Send-request chain

### `update_reqstatus_time`

**Request:** `docid`, `requeststatus: "1"`, `request_send_time`, `requestid`  
**Resend adds:** `oldrequestid`, `oldrequest_send_time`

Updates request fields on **active session row** (`docstatus: "1"`).

### `getrequeststatus_process`

**Request:** `docid`, `requestid`, `session_id`, `session_start_time`

| Current `requeststatus` | Result |
|-------------------------|--------|
| `1`, `2`, `3` (approved paths) | Archive old row, insert new active row → `{ r: 1 }` |
| `4` | Rejected → `{ r: 2, remarks }` |
| not found / still waiting | `{ r: 0 }` |

---

## Editor scheduler chain

```
scheduler (read-only, every 15000ms, find requeststatus: 1)
  → updaterequeststatus (1 → 2)
  → LinkSessionRequestDialog (accept / reject / 30s timeout)
  → updatestatus_reqstatus OR updatereqstatus
```

The frontend scheduler starts from `CHECK_REQUEST.Init()` / `initEditorSession` and stops on `forceStop`, offline, `CHECK_REQUEST.StopAll`, `STOP_ALL_EVENT_TIMERS`, or idle-alert ownership.

Idle ownership: after 40 minutes idle, the editor cancels the scheduler, sets read-only, starts one `IMPACT_SAVE.iSave({ forcesave: true, noalert: true })`, then opens the 30s idle alert. Continue Session restarts the scheduler; timeout/dismiss/logout keeps it stopped.

Request ownership: when `LinkSessionRequestDialog` is active, idle alert is skipped until a later scheduler cycle. When idle alert is active, incoming request handlers return without opening the request dialog.

**Accept / timeout payloads:**

| Action | `docstatus` | `requeststatus` |
|--------|-------------|-----------------|
| User accept | `"4"` | `"3"` |
| 30s timeout | `"3"` | `"3"` |
| Idle auto-close (15 min) | `"2"` | `"3"` |

**Reject:** `updatereqstatus` → `requeststatus: "4"`, optional `remarks`

---

## Status codes (authoritative)

### `docstatus`

| Code | Meaning |
|------|---------|
| `0` | Closed / inactive |
| `1` | Active editing session |
| `2`–`4` | Client archival markers (idle, timeout transfer, manual accept) |
| `5`–`7` | Archival from `getrequeststatus_process` |
| `8` | Stale session (landing cleanup) |

### `requeststatus`

| Code | Meaning |
|------|---------|
| `0` | No active request |
| `1` | Pending (sent, awaiting scheduler) |
| `2` | Delivered to active editor |
| `3` | Resolved (handoff complete) |
| `4` | **Rejected** (not merely expired) |
| `5`–`7` | Archival pairs with `docstatus` 6/7 |

---

## Response `r` codes

| `r` | Processes | Meaning |
|-----|-----------|---------|
| `1` | All | Success |
| `0` | check, scheduler, poll, updates | Denied / not found / still pending |
| `2` | `getrequeststatus_process` only | Rejected — read `remarks` |

---

## Frontend integration map

| Process | Legacy location | Handler |
|---------|-----------------|---------|
| `check` / `refresh` | `LandingPage.redirect`, `window.new_session_check` | `LinkSessionCore.accessFromLanding` / `newSessionCheck` → `buildCheckPayload` (`resolveSessionContext`) |
| Send-request | `LandingPage.checkaccess` branches | `LinkSessionCore.sendAccessRequest` + `LinkSessionSendModule` UI |
| `scheduler` | `CHECK_REQUEST.check_request` | `LinkSessionCore` / editor facade `handleScheduler` |
| Accept/reject | `confirmok`, `LinkShareDialog` | `LinkSessionRequestModule` |
| Double-verify | `confirmSessionOnServer` | `LinkSessionCore.validateBeforeSave` |

**Module layout:** `LinkSessionCore` (logic + storage + editor check/post) · `link_session_send` (landing UI) · `link_session_request` (editor dialog) · `LinkSessionEditor` / landing `LinkSessionModule` (entry points).

**Payload construction:** prefer `buildPayload` / `buildCheckPayload` — both call `resolveSessionContext` so `docId` / `sessionId` / `sessionStartTime` / `tabId` fill from storage when omitted.

**GET_JSON injection:** [`src/js/index.js`](../../js/index.js) still auto-fills fields for some processes — prefer `LinkSessionCore.buildPayload` for new code.

---

## Known backend quirks (for module authors)

1. **`check` idle close** sets `docstatus: "0"` but leaves `session_end_time: "0"` — double-verify must not require non-zero `session_end_time` on closed rows.
2. **`check` insert** returns minimal `{ r: 1 }` — client must use local `session_id` / `session_start_time`.
3. **Regular `check`** is per-docid only — any active session blocks all users (non-collab).
4. **`requeststatus: 4`** means **rejected**, not expired; resend uses time threshold + status 4 branch.
5. **Collab** `updaterequeststatus` / `updatestatus_reqstatus` filters differ from regular — test collab paths separately.
6. **`getrequeststatus_process`** can grant on `requeststatus: "1"` without editor dialog if never promoted to `2`.

---

## Related docs

- **Module architecture (core + sub-modules):** [`MODULES.md`](./MODULES.md)
- **Core API reference:** [`CORE.md`](./CORE.md)
- **Team process map (FE API ↔ DB):** [`docs/linksharing-frontend-backend-map.md`](../../../docs/linksharing-frontend-backend-map.md)
- Team flow reference: [`docs/linksharing-landing-session.md`](../../../docs/linksharing-landing-session.md)
- Module usage: [`skills.md`](./skills.md)
- Phase plan: `.cursor/plans/linksession_two-phase_module_e9f84da6.plan.md`
