# Combined Collaboration API And Transport Processes

This document covers the common `ParaLockSync` DB/API contract shared by legacy `paraLockSync` and `CollaborativeModule`, plus collaborative socket-first locks, status APIs, targeted fetch, BroadcastChannel, and socket notice flows.

## Endpoint Summary

| Purpose | Endpoint or channel |
| --- | --- |
| DB write/update | `${API_PATH}findupdatewithpush` |
| Filtered DB fetch | `API_GET_FILTER_DOCS` (`${API_PATH}getFilterdocs`) |
| DB fetch fallback | `API_GET_DOCS` only when `API_GET_FILTER_DOCS` is unavailable |
| Table/collection | `ParaLockSync` |
| BroadcastChannel | `collaborativeModule:<docid>` |
| WebSocket | `DOMAIN_ROOT + "collaboration?docid=<docid>"` |

BroadcastChannel and socket payloads are metadata notices only. They must never include `updated_html`. Replacement HTML is DB/API-only. In collaborative mode, lock/release is realtime-only and does not call `get_lock_id`.

All collaboration read processes send the Mongo projection key `filter` so `getFilterdocs` returns only the fields required by the current process.

`findupdatewithpush` is write-only. It performs update/push operations and returns a small acknowledgement; it must not filter replacement arrays or return full lock/replacement state. If a write callback needs current state, the frontend follows with `API_GET_FILTER_DOCS`.

## Filtered Read Payload Matrix

| Read path | Endpoint | Required `filter` |
| --- | --- | --- |
| initial record fetch | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks"]` |
| `get_lock_id` | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks", "replacements"]` |
| `_fetchUpdatedDatabase` fallback | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks", "replacements"]` |
| `_fetchByUniqueId(uniqueId)` | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "replacements"]` |
| `getPresenceStatus` | `API_GET_FILTER_DOCS` | `["_id", "docid", "rolename", "locks", "replacements", "presence", "users", "activity"]` |

The `getFilterdocs` backend must honor both `find` and `filter`. For targeted replacement fetches, `find: { docid, "replacements.uniqueId": uniqueId }` should return only the authoritative replacement data needed by that `uniqueId`.

## Shared Write Response Shape

Write/update processes return:

```js
{
  r: 1,
  id: "ParaLockSync row id",
  data: {
    id: "ParaLockSync row id",
    process: "replacementOnly"
  },
  time_s: 1720000000000
}
```

Write callbacks ignore this ack for apply logic unless rollout compatibility returns a payload containing `locks` or `replacements`.

## Shared Filtered Read Response Shape

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

Both providers normalize response variants before applying:

- `response.data`
- raw object response
- first item of an array response
- JSON string response

Missing `locks` and `replacements` are normalized to empty arrays.

`getFilterdocs` owns the common ParaLockSync filter logic: it first fetches data like `GetDocs`, applies the requested top-level `filter`, then filters ParaLockSync replacements by current user and canonical `locks[].lastSync` with lowercase `lastsync` fallback. Own-user replacements are excluded, only newer replacements are returned for polling, targeted `replacements.uniqueId` fetches return that unique replacement, and the latest replacement per `updated_paraId` wins.

## Common Process: `lockid`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Legacy uses this process for cursor locks. Collaborative mode does not use `lockid` for pure cursor movement; it uses realtime lock notices. Collaborative replacement writes use `replacementOnly`.

### Input Payload

```js
provider._sendToServer({
  lock_paraId: ["p1"],
  lastSync: provider.state.lastSync,
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
    "locks.$.lastSync": provider.state.lastSync
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

### Success Response

```js
{
  r: 1,
  id: provider.state.dbId,
  data: {
    id: provider.state.dbId,
    process: "lockid"
  },
  time_s: 1720000000000
}
```

### Error Handling

If `response.r === 0 && process === "lockid"`, the provider calls `_checkInitialRecords()` to recover or create the initial server row.

If current rows are needed after a successful write, the provider performs a separate filtered read through `API_GET_FILTER_DOCS`.

### Notes

Legacy does not notify transports. `CollaborativeModule` sends replacement notices only after successful DB writes. `lastSync` is state-derived: initial/current-user lock creation sets it once with `Date.now()`, cursor movement reuses it, and replacement receive processing advances it.

## Collaborative Internal Process: `replacementOnly`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Collaborative cursor movement detects dirty previous paragraph content and must write replacement HTML to DB without updating DB lock rows.
Repeated events for the same dirty paragraph/content change reuse the same pending `uniqueId` until the DB write succeeds.

### Input Payload

```js
this._sendToServer({
  lock_paraId: ["p2"],
  replacePush: [{
    uniqueId: "cke_123",
    user: USER_INFO.MAIL_ID,
    docid: getDocId(),
    updated_paraId: "p1",
    updated_html: encodeURIComponent("<p id=\"p1\">Updated</p>"),
    lastChangeTime: 1720000000000,
    timestamp: Date.now(),
    syncFlags: [],
    sessionId: getCurrentSessionId()
  }]
}, "replacementOnly");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    rolename: USER_INFO.ROLE_NAME,
    docid: getDocId()
  },
  push: {
    replacements: [{
      uniqueId: "cke_123",
      updated_paraId: "p1",
      updated_html: encodeURIComponent("<p id=\"p1\">Updated</p>")
    }]
  }
}
```

### Success Response

```js
{
  r: 1,
  id: provider.state.dbId,
  data: {
    id: provider.state.dbId,
    process: "replacementOnly"
  },
  time_s: 1720000000000
}
```

### Error Handling

If the server returns `r === 0`, the provider calls `_checkInitialRecords()`.

### Notes

After success, `CollaborativeModule` broadcasts/socket-notifies only replacement metadata with `uniqueId`; it does not emit a lock notice from this DB write.
The notice uses the same `uniqueId` from the DB `replacePush` object. Client-only pending metadata is stripped before the DB payload is sent.

## Common Process: `get_lock_id`

### Endpoint

`API_GET_FILTER_DOCS`

### When Called

Legacy polling and selection refresh fetch current DB state. Collaborative remote lock/release notices do not call this process.

### Input Payload

```js
provider._sendToServer({}, "get_lock_id");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "get_lock_id",
  username: USER_INFO.MAIL_ID,
  find: {
    "_id": provider.state.dbId,
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

The provider deduplicates unchanged responses before applying. Changed responses call `_handleServerResponse()`.

The endpoint helper falls back to `API_GET_DOCS` only while `API_GET_FILTER_DOCS` is unavailable.

### Notes

Polling remains the fallback when BroadcastChannel or socket notices are missed.

## Common Process: `close_session`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Unload/runtime cleanup releases the current user's lock and may flush pending replacement data.

### Input Payload

```js
provider._sendToServer({
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

### Success Response

```js
{
  r: 1,
  id: provider.state.dbId,
  data: {
    id: provider.state.dbId,
    process: "close_session"
  },
  time_s: 1720000000000
}
```

### Error Handling

Close-session pre-validation returns the response immediately. Collaborative runtime cleanup also closes transports and sends presence leave separately.

### Notes

Use this only for cleanup/release paths, not normal cursor movement.

## Common Process: `flagUpdate`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

After a consumer applies a replacement, it acknowledges the unique replacement id.

### Input Payload

```js
provider._sendToServer({
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
    "_id": provider.state.dbId,
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
  id: provider.state.dbId,
  data: {
    id: provider.state.dbId,
    process: "flagUpdate"
  },
  time_s: 1720000000000
}
```

### Error Handling

Duplicate `flagUpdate` input is blocked by `_recordUpdate()`. When duplicate, `_buildServerParams()` returns `null` and no API request is sent.

### Notes

`flagUpdate` must not broadcast or socket notify.

## Common Process: `lastSyncOnly`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

After a server replacement response is received, cross-checked, and applied, the active provider stores that response-received timestamp and updates the current user's lock row sync timestamp.

### Input Payload

```js
provider._sendToServer({
  lastSync: responseReceivedTime
}, "lastSyncOnly");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  find: {
    "_id": provider.state.dbId,
    docid: getDocId(),
    "locks.user": USER_INFO.MAIL_ID,
    "locks.sessionId": getCurrentSessionId()
  },
  update: {
    "locks.$.lastSync": responseReceivedTime
  }
}
```

`locks.sessionId` is included only when available.

### Success Response

```js
{
  r: 1,
  id: provider.state.dbId,
  data: {
    id: provider.state.dbId,
    process: "lastSyncOnly"
  },
  time_s: 1720000000000
}
```

### Error Handling

`_sendLastSyncOnly()` returns without sending when the provider is paused, disabled, off, or not the active `window.paraLock` provider. Errors are caught and logged.

### Notes

`lastSyncOnly` must never push replacement rows, create sync flags, or emit socket/BroadcastChannel notices. It is not advanced by cursor movement.

## Collaborative Process: Targeted Replacement Fetch

### Endpoint

`API_GET_FILTER_DOCS`

### When Called

`CollaborativeModule` receives a remote replacement notice containing `uniqueId` and fetches authoritative replacement content from DB.

### Input Payload

```js
this._fetchByUniqueId("cke_123");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "fetchByUniqueId",
  username: USER_INFO.MAIL_ID,
  find: {
    docid: getDocId(),
    "replacements.uniqueId": "cke_123"
  },
  filter: ["_id", "docid", "rolename", "replacements"]
}
```

### Success Response

```js
{
  r: 1,
  data: {
    docid: getDocId(),
    locks: [],
    replacements: [{
      uniqueId: "cke_123",
      updated_paraId: "p1",
      updated_html: encodeURIComponent("<p id=\"p1\">Updated</p>"),
      user: "other@example.com",
      sessionId: "remote-session"
    }]
  }
}
```

### Error Handling

The response is routed into `_handleServerResponse(response, { remoteUniqueId })`. If data is missing or malformed, response normalization produces empty arrays and no replacement is applied.

### Notes

The broadcast/socket notice is not content. Consumers must fetch by `docid + uniqueId` before applying. The endpoint helper falls back to `API_GET_DOCS` only while `API_GET_FILTER_DOCS` is unavailable.

## Collaborative Process: `presenceJoin`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

`CollaborativeModule._setupPresence()` writes join state after collaborative runtime starts.

### Input Payload

```js
this._sendPresenceToServer("presenceJoin", {}, onSuccess);
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "presenceJoin",
  find: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME
  },
  presence: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    user: USER_INFO.MAIL_ID,
    sessionId: getCurrentSessionId(),
    transport: "broadcast:connected,socket:connected,polling:active",
    timestamp: Date.now()
  }
}
```

### Success Response

```js
{
  r: 1,
  data: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    connection: {},
    users: [],
    locks: [],
    replacements: [],
    flags: [],
    activity: []
  }
}
```

### Error Handling

If response has `r === 0`, connection `api` becomes `error`. Synchronous call failures are caught, logged, and the status dialog is refreshed.

### Notes

After DB success, the module emits a `presence_join` metadata notice. The notice must not include DB row content.

## Collaborative Process: `presenceHeartbeat`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Heartbeat refreshes `last_seen` style presence state while collaborative runtime is active.

### Input Payload

```js
this._sendPresenceToServer("presenceHeartbeat");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "presenceHeartbeat",
  find: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME
  },
  presence: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    user: USER_INFO.MAIL_ID,
    sessionId: getCurrentSessionId(),
    transport: this._getTransportStatusText(),
    timestamp: Date.now()
  }
}
```

### Success Response

Same hydrated status shape as `presenceJoin`.

### Error Handling

API failures set connection `api = "error"` and refresh the status dialog.

### Notes

The current interval exists in the module; heartbeat send may be feature-gated/commented while backend behavior is finalized.

## Collaborative Process: `presenceLeave`

### Endpoint

`${API_PATH}findupdatewithpush`

### When Called

Runtime stop, unload, or transport cleanup marks the session as left.

### Input Payload

```js
this._sendPresenceToServer("presenceLeave");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "presenceLeave",
  find: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME
  },
  presence: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    user: USER_INFO.MAIL_ID,
    sessionId: getCurrentSessionId(),
    transport: this._getTransportStatusText(),
    timestamp: Date.now()
  }
}
```

### Success Response

Same hydrated status shape as `presenceJoin`.

### Error Handling

API failures are logged; runtime cleanup still closes transports.

### Notes

Presence leave is separate from `close_session`. `close_session` releases paragraph locks; `presenceLeave` updates collaborator status.

## Collaborative Process: `getPresenceStatus`

### Endpoint

`API_GET_FILTER_DOCS`

### When Called

Status dialog refresh asks the DB/API for friendly collaborator, lock, replacement, flag, and activity data.

### Input Payload

```js
this._sendPresenceToServer("getPresenceStatus");
```

### Generated Server Payload

```js
{
  tbl: "ParaLockSync",
  process: "getPresenceStatus",
  find: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME
  },
  presence: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    user: USER_INFO.MAIL_ID,
    sessionId: getCurrentSessionId(),
    transport: this._getTransportStatusText(),
    timestamp: Date.now()
  },
  filter: ["_id", "docid", "rolename", "locks", "replacements", "presence", "users", "activity"]
}
```

### Success Response

```js
{
  r: 1,
  data: {
    docid: getDocId(),
    rolename: USER_INFO.ROLE_NAME,
    connection: {
      broadcast: "connected",
      socket: "connected",
      polling: "active",
      api: "connected"
    },
    users: [],
    locks: [],
    replacements: [],
    flags: [],
    activity: []
  }
}
```

### Error Handling

If response has `r === 0` or the call throws, connection `api` is set to `error` and `_renderStatusDialog()` runs.

### Notes

The dialog should show friendly, truncated/hydrated data and avoid raw HTML-heavy replacement content by default.

## Transport Notice: BroadcastChannel

### Endpoint

`BroadcastChannel("collaborativeModule:" + getDocId())`

### When Called

For lock/release, immediately after local cursor movement. For replacement, after a successful collaborative DB write. Presence join/leave can also send metadata notices.

### Input Payload

```js
this._notifyChange("replacement", {
  uniqueId: "cke_123",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
});
```

### Generated Server Payload

No server payload. Browser-only message:

```js
{
  type: "replacement",
  docid: getDocId(),
  uniqueId: "cke_123",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
}
```

Lock/release messages use the same channel and omit `uniqueId` unless it is relevant:

```js
{
  type: "lock",
  docid: getDocId(),
  uniqueId: "",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
}
```

```js
{
  type: "release",
  docid: getDocId(),
  uniqueId: "",
  paraId: "",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
}
```

### Success Response

No response is expected.

### Error Handling

BroadcastChannel unsupported or closed state should not break DB sync. Polling remains fallback.

### Notes

Never include `updated_html` in this payload.

## Transport Notice: `/collaboration?docid=<docid>`

### Endpoint

`ws(s)://<DOMAIN_ROOT>/collaboration?docid=<docid>`

### When Called

For lock/release, immediately after local cursor movement. For replacement, after a successful collaborative DB write. The socket sends the same metadata notice used by BroadcastChannel.

### Input Payload

```js
this._socketTransport.sendMessage({
  type: "replacement",
  docid: getDocId(),
  uniqueId: "cke_123",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
});
```

### Generated Server Payload

Socket text frame:

```js
{
  type: "replacement",
  docid: getDocId(),
  uniqueId: "cke_123",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
}
```

Lock/release text frames use the same metadata-only shape:

```js
{
  type: "lock",
  docid: getDocId(),
  uniqueId: "",
  paraId: "p1",
  user: USER_INFO.MAIL_ID,
  role: USER_INFO.ROLE_NAME,
  sessionId: getCurrentSessionId(),
  timestamp: Date.now()
}
```

### Success Response

No REST response is expected. Other same-doc socket sessions receive the notice.

### Error Handling

Socket failures update connection state and may reconnect unless closed intentionally. DB remains source of truth, and polling/fetch paths continue to recover missed updates.

### Notes

The Java endpoint must room sessions by `docid`. Frontend still ignores wrong `docid` and same `sessionId` as a safety check.
