# Collaborative Module Developer Guide

Companion to [README.md](./README.md), [skills.md](./skills.md), [QA.md](./QA.md), [API_LEGACY.md](./API_LEGACY.md), and [API_COMBINED.md](./API_COMBINED.md).

## Architecture

`collaborativeModule` is socket-first for paragraph locks and DB-first for paragraph replacements. BroadcastChannel and socket replacement messages are hints only; consumers fetch authoritative replacement content from DB before applying replacements.

```text
editor ready
  -> resolve mode
  -> legacy: paraLockSync runtime owns listeners and polling
  -> collaborative: CollaborativeModule runtime owns listeners, presence, socket-first locks, DB-first replacements, and transports
  -> off: both runtimes paused; fallback globals exposed
```

## Shared Key Startup

`InitConfig.prototype.run()` loads collaboration data before user/access checks:

1. `initDocumentID()`
2. `loadSharedKey()`
3. `initUserInfo()`
4. `checkAccess()`
5. `initLoadingConfig()`

`loadSharedKey()` reads `xmleditor:shared:${docid}`, assigns `global.SHARED_KEY`, and normalizes missing fields such as `docid`, `username`, `emailto`, `_id`, and `client`. It must not auto-patch `SHARED_KEY.collaborative` from `xmleditor:collabEnabled:${docid}`.

Local/UAT enablement is request-based:

```js
window.enableCollaborativeSharedKey({ reload: true }, callback);
```

The callback receives `{ r: 1, docid, sharedKey, reloadRequired }` on success or `{ r: 0, docid, message }` on failure.

## Mode Resolver And Runtime Manager

`workflow.js` creates `window.CollaborationWorkflow`.

Resolution order:

1. `?collabMode=collaborative|off`
2. `localStorage["xmleditor:collabMode:" + docid]` when the value is `collaborative` or `off`
3. `legacy`

Stored `legacy`, missing, or invalid values are treated as the default legacy workflow. UAT/local deployments must not list or load `CollaborativeModule` unless the tester explicitly opts into `collaborative` or `off`.

Runtime APIs:

- `setMode(mode, docid)` stores the selected mode.
- `activateMode(mode, options)` pauses current providers, persists the mode, and starts only the selected runtime.
- `deactivateAll(options)` remains public for compatibility but pauses runtimes instead of disabling collaboration eligibility.
- `getActiveProvider()` returns the active lock provider or fallback.
- `CollaborativeModule._isCollaborativeModeActive()` guards socket, BroadcastChannel, remote notices, lock notices, and `replacementOnly` writes against stale runtime instances.

Provider lifecycle APIs:

- `startRuntime(editor)`
- `stopRuntime(reason, options)`
- `destroyRuntime(reason)`
- `isRuntimeActive()`

Runtime state flags:

- `_runtimeActive`: provider is currently running.
- `_runtimePaused`: provider is loaded but operations are paused.
- `_isEnabled`: provider may process editor events and writes.
- `_isDisabled`: provider is unavailable or in hard fallback, not normal `off` mode.

## Bootstrap Rules

`context.js` waits for:

- `DOMContentLoaded`
- `CKEDITOR.instanceReady` or `window.GlobalEditor`
- collaboration eligibility
- `moduleSystem` or `ContextHelpers.registerOnReady`

Behavior by mode:

| Mode | `paraLockSync` | `CollaborativeModule` |
| --- | --- | --- |
| `legacy` | Full runtime | Not registered; no status dialog or command |
| `collaborative` | Paused/no-op | Full runtime |
| `off` | Paused/no-op | Not registered unless already loaded; fallback only |

Status-only mode is no longer auto-loaded in UAT/local legacy startup. If future debugging needs it, add a separate explicit debug flag instead of loading it by default.

## Runtime Switching

Mode buttons in the Collaborative Status dialog switch without refresh:

- `Off`: pause both providers, clear polling intervals, close socket/BroadcastChannel, stop presence heartbeat, expose safe fallback.
- `Legacy paraLockSync`: pause collaborative runtime, close collaborative transports, resume legacy events and `LoopInterval` once.
- `Collaborative Module`: pause legacy runtime, start collaborative events, polling, presence, BroadcastChannel, and `DOMAIN_ROOT + "collaboration?docid=<docid>"` socket once.

Repeated clicks must be idempotent and must not duplicate intervals, event listeners, sockets, or BroadcastChannels.

## Transport Contract

Broadcast channel name:

```js
"collaborativeModule:" + getDocId()
```

Socket URL:

```text
ws(s)://<DOMAIN_ROOT>/collaboration?docid=<docid>
```

Notice shape:

```js
{
  type,
  docid,
  uniqueId,
  paraId,
  user,
  sessionId,
  timestamp
}
```

Do not add `updated_html` to BroadcastChannel or socket notices. Replacement HTML belongs only in DB/API payloads.

## DB-First Replacement Flow

1. Local edit builds existing replacement payload via `_createReplacePush()`.
2. `_sendToServer()` writes normalized replacement rows with `replacementOnly`.
3. After successful DB write, `_notifyChange("replacement", refs)` sends only notice metadata.
4. Remote consumer validates `docid` and `sessionId`.
5. Remote consumer calls `_fetchByUniqueId(uniqueId)`.
6. Authoritative DB response enters `_handleServerResponse()`.
7. `_applyReplacements()` updates paragraph content.
8. Consumer sends `flagUpdate`.
9. The active provider stores the replacement response-received time as `state.lastSync`.
10. `_afterReplacementProcess()` sends `lastSyncOnly` to persist that state value on the current lock row.

`lastSyncOnly` must never broadcast, socket notify, push replacements, or create flags. Cursor movement must not advance `lastSync`; lock payloads only reuse the stored provider state.

`CollaborativeModule` keeps a pending replacement identity cache keyed by document, paragraph, timestamp, and HTML fingerprint. Repeated events for the same dirty paragraph reuse the same `uniqueId`; the cache entry and dirty flag clear only after `replacementOnly` succeeds.

## Filtered Read Endpoint

Collaboration reads must use `API_GET_FILTER_DOCS` (`${API_PATH}getFilterdocs`) through the provider read-endpoint helper. `API_GET_DOCS` is fallback only for rollout compatibility.

The backend split is intentional: `findupdatewithpush` owns writes and returns only an ack, while `findwithfilter`/`getFilterdocs` owns reads, projection, and ParaLockSync array filtering. Do not add `lastSync` replacement filtering back into `FindUpdatewithPush`.

Each read process must include a `filter` array:

- initial record fetch: `_id`, `docid`, `rolename`, `locks`
- `get_lock_id` and `_fetchUpdatedDatabase`: `_id`, `docid`, `rolename`, `locks`, `replacements`
- `_fetchByUniqueId(uniqueId)`: `_id`, `docid`, `rolename`, `replacements`
- `getPresenceStatus`: status-dialog fields only

Do not move write processes to `getFilterdocs`; `lockid`, `close_session`, `replacementOnly`, `flagUpdate`, `lastSyncOnly`, and presence writes stay on `findupdatewithpush`.

For ParaLockSync reads, `getFilterdocs` resolves the current user from `username`, `user`, or `find["locks.user"]`. It reads `locks[].lastSync` as canonical state, accepts lowercase `lastsync` only as a backward-compatibility fallback, removes current-user replacements, and keeps the newest replacement per `updated_paraId`.

## API Documentation

Process-level payload and response contracts are documented in:

- [API_LEGACY.md](./API_LEGACY.md) for the CKEditor `paraLockSync` provider.
- [API_COMBINED.md](./API_COMBINED.md) for shared provider processes, collaborative presence, targeted fetch, BroadcastChannel, and socket notices.

When changing `_buildServerParams()`, `_sendPresenceToServer()`, `_fetchByUniqueId()`, or transport notice shape, update these API docs in the same change.

## Cursor Lock Updates

Legacy and collaborative providers handle cursor locks differently:

- Keep CKEditor `selectionChange`.
- Bind editable `contentDom` events: `mouseup`, `keyup`, and `click`.
- Queue the update with `CURSOR_LOCK_DELAY_MS`, default `0`, so the selection has moved.
- Use canonical process name `lockonly`.
- Resolve collapsed caret paragraphs from `editor.getSelection().getStartElement()` when block ids are missing.
- Legacy sends the existing DB process through `_sendToServer(payload, "lockid")`.
- Collaborative sends realtime `lock`/`release` notices and does not call `get_lock_id` for remote lock notices.
- Collaborative sends DB writes only when `replacePush` exists, using the internal `replacementOnly` process so replacement HTML remains authoritative in DB.

Cursor writes must stop when the provider is paused, off, disabled, or not the active workflow.

## Build-Safe Comments

Follow the project-wide [Build-Safe Comments](../../../../docs/build-safe-comments.md) rule. The gulp JS pipeline strips comments before minification, so avoid trailing `//` comments after object properties or code lines in files that pass through that pipeline.

Prefer this:

```js
// Track active users in document.
activeUsers: [],
```

Avoid this:

```js
activeUsers: [], // Track active users in document
```

When the field name is already clear, remove the comment instead of preserving noise.

## Java Endpoint Rules

Source files:

- `utils/java/collab/editor/CollabServer.java`
- `utils/java/collab/editor/CollabEditorServer.java`

Rules:

- Parse `docid` from query string.
- Store sessions in doc-scoped room maps.
- Broadcast only inside the same `docid`.
- Remove sessions on close/error.
- Isolate missing `docid` in a default room and log it.

Compile/deploy helper:

```powershell
.\utils\java\collab\editor\deploy-collab-endpoints.ps1
```

Restart or reload Tomcat after compilation.

## Compatibility Constraints

- Keep `window.paraLock` for legacy callers.
- Keep safe fallback methods returning empty/false in paused/off states.
- Keep polling as fallback for missed notices.
- Keep `/collaboration` connectable for the active module socket path.
- Keep `/collab` connectable for tester/backward compatibility when the endpoint is deployed.
- Do not use `_wip/collab_socket/index.js` Automerge/full-document behavior for paragraph locking.

## Common Failure Modes

| Symptom | Likely Cause | Check |
| --- | --- | --- |
| Both workflows write locks | Runtime switch failed | Inspect `CollaborationWorkflow.getMode()` and active provider. |
| Cursor move does not update | Editable cursor events not bound or provider paused | Check `contentDom`, `_runtimePaused`, `LoopInterval`, and collaborative lock notices. |
| Different docs receive notices | Socket room missing docid | Verify `/collaboration?docid=<docid>` URL and Java room maps. |
| Replacement lacks content | Consumer trusted notice | Ensure `_fetchByUniqueId()` runs before `_applyReplacements()`. |
| `lastSync` not updated | Provider is paused/off or no replacement response was applied | Check active provider, response-received timestamp, `lastSyncOnly` call, and server params. |
| Dialog missing in legacy mode | Expected pure legacy startup | Use `?collabMode=collaborative` or explicit localStorage opt-in to load CollaborativeModule. |
