# savewithfinalize — Combine API v2

Single POST replaces the legacy finalize multi-AJAX stack when `IMPACT_SAVE_WITH_FINALIZE_READY` is enabled.

**Full workflow reference:** [`docs/finalize/FinalizeSignOff_Workflow.md`](../../../docs/finalize/FinalizeSignOff_Workflow.md). **Smoke:** [`QA.md`](QA.md). **Payload builder:** [`payload.js`](payload.js).

## Endpoint

| Property | Value |
|----------|--------|
| Method | `POST` |
| URL | `API_SAVE_WITH_FINALIZE` → `{API_PATH}savewithfinalize` |
| Content-Type | `application/x-www-form-urlencoded` |
| Body field | `jsondata` (JSON string) |

Required headers: `apikey`, `appkey: xmleditor`.

## Request (`jsondata`) — v2 single payload

Built by `IMPACT_SAVE.getSaveDataForLogout()` + [`buildSaveWithFinalizeExtras()`](payload.js) via [`assembleSaveWithFinalizePayload()`](payload.js).

### Required save fields (from `prepareSaveData`)

| Field | Notes |
|-------|--------|
| `tbl` | `"Fileslist"` |
| `subfolder`, `filename`, `backup`, `status`, `sopt`, `recent` | Standard save |
| `timestamp` | ms string |
| `corole` | `USER_INFO.IS_CO_ROLE` |
| `recordtype` | **Must be `"savewithfinalize"`** (overrides save `"save"`) |
| `count_info` | `{ query, insert, del }` |
| `a` | URL-encoded editor HTML |
| `keyname` | `"a"` |
| `lockfile` | `true` on finalize |
| `shared_id` | `SHARED_KEY._id` |
| Defaults | `client`, `docid`, `username`, `role`, `rolename`, `roleid`, `identifier`, `session_id`, `dtd`, `linkinfo`, `type`, `projecttitle`, `vendor`, `shorttitle` |

### Finalize-specific fields

| Field | Notes |
|-------|--------|
| `shared_id_attachments` | Role-scoped attachment IDs; **Collator = all document attachments** |
| `attachmentslist` | Role-scoped list (ShareInvite sign-off parity) |
| `overallattachmentslist` | Collator only — all attachment IDs |
| `info` | Pubkit correction counts: `{ Query, Insert, Delete, forMat, Comment }` |
| `trackPDF` | `{API_PATH}filedownloadwithdb?docid={DOC_ID}_trackPDF--{ROLE_ID}` |
| `process` | `"signoff"` (collab) or `"close"` |
| `session_end_time` | epoch ms string |
| `remarks` | `"signoff"` |
| `source` | `"finalize"` |
| `signoff`, `finalize` | `true` |

### Pubkit fields (when `SHARED_KEY.roletaskid`)

| Field | Source |
|-------|--------|
| `abstract_task_id`, `task_id` | `SHARED_KEY` |
| `identifier`, `docid`, `fileid`, `projectid` | `SHARED_KEY` / defaults |
| `field_values` | `userTrackData('pubkit')` |
| `trackPDF` | role-scoped track PDF URL |

### Role attachment rules

| Role | `attachmentslist` | `shared_id_attachments` |
|------|-------------------|-------------------------|
| Author / Editor / CO-user | Role-scoped (`data-rolename` filter) | Same as role-scoped |
| Collator (`ROLE_IDS.CO`) | Role-scoped | **All** `[data-file-id]` / `[data-db-id]` in document |

IDs exclude file extensions (legacy `getIdWithoutExt` parity).

## Backend sub-stack (single call replaces)

When v2 succeeds, FE **does not** fire separate AJAX for:

- Force save + session close
- `set_correction_count`
- Shareandinvite sign-off + `updateSignOffTime`
- `signoffstatus`, `corole_link_signoff`
- `pukitapiclosetask` + `fire_pubkit`
- Collator `attachmentlist` (when `taskclosureuser` in response)

FE still runs before combine: `queryModule.persistFinalQuerySnapshot()` (not in API body).

## Response sections

| Section | Maps to `done` flag |
|---------|---------------------|
| `save` | Base success (`save.r === 1`) |
| `session` / `logout` | `saveCloseShare`, `closeSession`, `forceSaveClose` |
| `shareandinvite` | `shareSignoff`; **`key`** used for redirect |
| `corolesignoff` | `postCoroleLinkSignoff` |
| `collatorrolesignoffstatus` | `postSignoffStatus` |
| `closetaskres` / `taskclosureuser` | `postPubkit` |
| `closetaskres.closetaskstatus === "SUCCESS"` | `postWorkflowShare` |
| `taskclosureuser` | `postCollatorAttachments` |

### Full success

`save.r === 1` and (`session.r === 1` or `shareandinvite.r === 1` or top-level `message`).

### Partial success

`save.r === 1` but session/share finalize path failed → `finalize_retry` (no post AJAX for owned steps).

### Error envelope

```json
{ "error": { "r": 0, "m": "..." } }
```

## FE wiring

- Commit: `CloseSharedStatus` → `LOG_OUT.saveWithFinalize` → **one** POST → `closesharedpost` (no intermediate commit AJAX)
- Post: skip steps when `isPostPhaseComplete(done, caps, ctx)`
- Redirect: `shareandinvite.key` → `_state.auKey`
- Legacy `FinalizeSignOff.js` unchanged; default caps remain legacy until flag is set.

## Enable (UAT / local)

```javascript
window.IMPACT_SAVE_WITH_FINALIZE_READY = true;
```

Expect **one** `savewithfinalize` network call on full success.
