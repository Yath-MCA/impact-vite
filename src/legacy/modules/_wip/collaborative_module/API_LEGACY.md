# Legacy paraLockSync API Processes

This document covers the CKEditor `paraLockSync` provider only. The legacy provider uses the shared `ParaLockSync` table/collection and communicates through `commonfn.callajax()`.

## Endpoints

| Purpose | Endpoint |
| --- | --- |
| Write/update | `${API_PATH}findupdatewithpush` |
| Filtered fetch/current state | `API_GET_FILTER_DOCS` (`${API_PATH}getFilterdocs`) |
| Fetch fallback | `API_GET_DOCS` only when `API_GET_FILTER_DOCS` is unavailable |
| Table/collection | `ParaLockSync` |

Filtered read payloads must include the Mongo projection key `filter`. This keeps the legacy provider from receiving full `ParaLockSync` documents when only lock and replacement state is needed.

`findupdatewithpush` is write-only for collaboration processes. It updates or pushes rows and returns a small acknowledgement; it does not filter replacement arrays or return a full `ParaLockSync` document. When fresh rows are needed after a write, the frontend performs a separate `API_GET_FILTER_DOCS` read.

## Filtered Read Payload Matrix

| Read path | Endpoint | Required `filter` |
| --- | --- | --- |
| `_checkInitialRecords()` | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks"]` |
| `_sendToServer({}, "get_lock_id")` | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks", "replacements"]` |
| `_fetchUpdatedDatabase` fallback | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks", "replacements"]` |

The `getFilterdocs` backend must honor both `find` and `filter`. If `find` targets a nested replacement, the response should include only matching authoritative data needed by the caller.

## Shared Write Success Response

Write processes return an acknowledgement:

```js
{
  r: 1,
  id: "ParaLockSync row id",
  data: {
    id: "ParaLockSync row id",
    process: "lockid"
  },
  time_s: 1720000000000
}
```

Frontend write callbacks ignore this ack for lock/replacement apply unless it also contains `locks` or `replacements` during rollout compatibility.

## Shared Filtered Read Success Response

Read processes expect the old compatible shape, either directly, inside `data`, or as the first item of `data`:

```js
{
  r: 1,
  data: {
    docid: "DOC_ID",
    rolename: "ROLE",
    locks: [],
    replacements: []
  }
}
```

`_handleServerResponse()` also accepts JSON-string responses and array responses, normalizes missing `locks` and `replacements` to empty arrays, then calls `_applyReplacements()` and `_applyLocks()`.

`getFilterdocs` owns the ParaLockSync filter logic. It projects requested top-level fields, resolves the current user, reads canonical `locks[].lastSync` with lowercase `lastsync` fallback, excludes the current user's own replacements, returns only replacements newer than `lastSync`, and keeps the latest replacement per `updated_paraId`.

## Process: `lockid`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Caret movement, selection changes, content changes, or dirty paragraph sync update the current user's lock row and optionally push paragraph replacements.

### Input Payload

```js
this._sendToServer({
  lock_paraId: ["p1"],
  lastSync: this.state.lastSync,
  replacePush: {
    uniqueId: "cke_123",
    user: USER_INFO.MAIL_ID,
    docid: getDocId(),
    updated_paraId: "p1",
    updated_html: encodeURIComponent("<p id=\"p1\">Updated</p>"),
    lastChangeTime: 1720000000000,
    timestamp: Date.now(),
    syncFlags: [],
    sessionId: getCurrentSessionId()
  }
}, "lockid");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    rolename: USER_INFO.ROLE_NAME,
    docid: getDocId(),
    "locks.user": USER_INFO.MAIL_ID
  },
  update: {
    "locks.$.paraId": ["p1"],
    "locks.$.timestamp": Date.now(),
    "locks.$.lastSync": this.state.lastSync
  },
  push: {
    replacements: {
      uniqueId: "cke_123",
      user: USER_INFO.MAIL_ID,
      docid: getDocId(),
      updated_paraId: "p1",
      updated_html: encodeURIComponent("<p id=\"p1\">Updated</p>"),
      lastChangeTime: 1720000000000,
      timestamp: Date.now(),
      syncFlags: [],
      sessionId: getCurrentSessionId()
    }
  }
}
```

If `replacePush` is an array with more than one replacement, the payload adds `updateMany: "1"` and pushes the array.

### Success Response

```js
{
  r: 1,
  id: this.state.dbId,
  data: {
    id: this.state.dbId,
    process: "lockid"
  },
  time_s: 1720000000000
}
```

### Error Handling

If `response.r === 0`, legacy calls `_checkInitialRecords()` to create/fetch the initial `ParaLockSync` row and retry the normal flow later.

If the caller needs current lock or replacement rows after the write, it must make a separate filtered read through `API_GET_FILTER_DOCS`.

### Notes

`lockid` is also the DB process used by canonical cursor `lockonly` logic. There is no separate server process named `lockonly`.

`lastSync` is state-derived. New current-user lock rows initialize it with `Date.now()`, but normal cursor movement reuses the stored value and does not advance it.

## Process: `get_lock_id`

### Endpoint

`API_GET_FILTER_DOCS`

### When Called

Polling and same-paragraph selection refresh fetch current lock/replacement state without writing new lock data.

### Input Payload

```js
this._sendToServer({}, "get_lock_id");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "get_lock_id",
  username: USER_INFO.MAIL_ID,
  find: {
    "_id": this.state.dbId,
    docid: getDocId()
  },
  filter: ["_id", "docid", "rolename", "locks", "replacements"]
}
```

### Success Response

```js
{
  r: 1,
  data: [{
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    locks: [],
    replacements: []
  }]
}
```

### Error Handling

Repeated identical responses are deduplicated with `_lastLockIdResponse`. Changed responses call `_handleServerResponse()`; unchanged responses may only print debug lock data after the configured interval.

### Notes

The fetch response is still normalized by `_handleServerResponse()` before applying locks or replacements.

The endpoint helper falls back to `API_GET_DOCS` only if `API_GET_FILTER_DOCS` is not present during rollout.

## Process: `close_session`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Before unload or runtime cleanup releases the current user's active lock and may flush pending replacements.

### Input Payload

```js
this._sendToServer({
  lock_paraId: ""
}, "close_session");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    rolename: USER_INFO.ROLE_NAME,
    docid: getDocId(),
    "locks.user": USER_INFO.MAIL_ID
  },
  update: {
    "locks.$.paraId": "",
    "locks.$.timestamp": Date.now(),
    remark: "logout"
  },
  push: {
    replacements: {}
  }
}
```

`replacePush` is generated from `_buildPayload(["000"], [], true)` when pending dirty content exists.

### Success Response

```js
{
  r: 1,
  id: this.state.dbId,
  data: {
    id: this.state.dbId,
    process: "close_session"
  },
  time_s: 1720000000000
}
```

### Error Handling

The close-session pre-validation returns the server response immediately and does not apply locks/replacements.

### Notes

This process is cleanup-oriented and should not be used for normal cursor movement.

## Process: `flagUpdate`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

After a received replacement is applied, the consumer acknowledges the apply by pushing a sync flag into the matching replacement.

### Input Payload

```js
this._sendToServer({
  uniqueId: "cke_123",
  flagsPushData: {
    user: USER_INFO.MAIL_ID,
    role: USER_INFO.ROLE_NAME,
    status: "applied",
    timestamp: Date.now(),
    sessionId: getCurrentSessionId()
  }
}, "flagUpdate");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    "_id": this.state.dbId,
    docid: getDocId(),
    "replacements.uniqueId": "cke_123"
  },
  update: {
    "replacements.$.status": "active"
  },
  push: {
    "replacements.$.syncFlags": {
      user: USER_INFO.MAIL_ID,
      role: USER_INFO.ROLE_NAME,
      status: "applied",
      timestamp: Date.now(),
      sessionId: getCurrentSessionId()
    }
  }
}
```

### Success Response

```js
{
  r: 1,
  id: this.state.dbId,
  data: {
    id: this.state.dbId,
    process: "flagUpdate"
  },
  time_s: 1720000000000
}
```

### Error Handling

`_recordUpdate()` prevents duplicate flag writes. If a duplicate is detected, `_buildServerParams()` returns `null` and `_sendToServer()` exits without calling the API.

### Notes

`flagUpdate` is an acknowledgement process. It must not create a new replacement entry.

## Process: `lastSyncOnly`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

After a server replacement response is received, cross-checked, and applied, `_afterReplacementProcess()` updates provider state with that response-received timestamp and persists it to the current user's lock row.

### Input Payload

```js
this._sendToServer({
  lastSync: responseReceivedTime
}, "lastSyncOnly");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    "_id": this.state.dbId,
    docid: getDocId(),
    "locks.user": USER_INFO.MAIL_ID,
    "locks.sessionId": getCurrentSessionId()
  },
  update: {
    "locks.$.lastSync": responseReceivedTime
  }
}
```

`locks.sessionId` is included only when a session id is available.

### Success Response

```js
{
  r: 1,
  id: this.state.dbId,
  data: {
    id: this.state.dbId,
    process: "lastSyncOnly"
  },
  time_s: 1720000000000
}
```

### Error Handling

`_sendLastSyncOnly()` no-ops when the provider is disabled, paused, off, or not the active `window.paraLock` provider. Errors are caught and logged with `console.warn()`.

### Notes

`lastSyncOnly` must not push replacements, create sync flags, or trigger socket/BroadcastChannel notices. It advances `lastSync` only from the replacement response-received timestamp; it is not a cursor-movement heartbeat.
