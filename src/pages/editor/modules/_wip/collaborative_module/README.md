# Collaborative Module

Socket-first paragraph locking and DB-first correction synchronization for CKEditor, with local/UAT runtime controls to test the legacy `paraLockSync` workflow against the newer `collaborativeModule` workflow.

**Developer guide:** [DEV.md](./DEV.md)  
**QA checklist:** [QA.md](./QA.md)  
**Use cases:** [USE_CASES.md](./USE_CASES.md)  
**Legacy API processes:** [API_LEGACY.md](./API_LEGACY.md)  
**Combined API and transports:** [API_COMBINED.md](./API_COMBINED.md)  
**Skills matrix:** [skills.md](./skills.md)  
**Workflow data:** [workflow.json](./workflow.json)

## Purpose

The module supports three mutually exclusive runtime modes:

| Mode | Active workflow | Behavior |
| --- | --- | --- |
| `legacy` | CKEditor `paraLockSync` plugin | Existing polling and DB workflow runs as before. |
| `collaborative` | `CollaborativeModule` | Locks are realtime socket/BroadcastChannel notices; replacement HTML remains DB authoritative. |
| `off` | Safe fallback | Both workflows are paused; global lock checks return empty or false. |

Only one workflow should process editor events at a time. Running both can duplicate DB writes, lock updates, replacement applies, and acknowledgement flags.

## Mode Resolution

Mode is resolved in this order:

1. URL override: `?collabMode=collaborative|off`
2. localStorage: `xmleditor:collabMode:${docid}` when the value is `collaborative` or `off`
3. Default: `legacy`

Missing, invalid, or `legacy` storage values resolve to the deployed default: pure legacy. UAT/local does not auto-load the collaborative status dialog in legacy mode.

The shared resolver and runtime manager are exposed as `window.CollaborationWorkflow`.

## Shared Key Enablement

`loadSharedKey()` is the only owner for loading and normalizing `xmleditor:shared:${docid}`. It does not silently enable collaboration from local override keys.

Local/UAT enablement is explicit:

```js
window.enableCollaborativeSharedKey({ reload: true }, function (res) {
    if (res.r === 1 && res.reloadRequired) window.location.reload();
});
```

The function patches `SHARED_KEY.collaborative = "yes"` in memory and persists the shared key, `xmleditor:collabEnabled:${docid}`, and `xmleditor:collabMode:${docid}` only when requested. Reload remains the recommended activation path after enabling a previously non-collaborative document.

## Runtime Toggle

Local and UAT environments show a Testing Mode control only after `CollaborativeModule` is explicitly loaded with `collabMode=collaborative`:

- `Legacy paraLockSync`
- `Collaborative Module`
- `Off`

Mode buttons switch runtime operations without refreshing the editor:

- `Off` pauses legacy polling/events, closes collaborative socket/BroadcastChannel, stops presence heartbeat, and exposes fallback `window.paraLock`.
- `Legacy paraLockSync` pauses collaborative transports and resumes legacy polling/events once.
- `Collaborative Module` pauses legacy polling/events and starts collaborative polling, presence, BroadcastChannel, and socket once.

`Off` is not a feature-disable state. It does not change `SHARED_KEY.collaborative`, `isCollabEnabled(docid)`, or collaboration eligibility.

## Transport Contract

Collaborative mode uses socket-first lock notification and DB-first replacement notification:

- BroadcastChannel: `collaborativeModule:<docid>`
- Socket: `DOMAIN_ROOT + "collaboration?docid=<docid>"`
- Notice payload: `{ type, docid, uniqueId, paraId, user, role, sessionId, timestamp }`
- Broadcast/socket payloads must never include `updated_html`
- Consumers fetch authoritative replacement data by `docid + uniqueId`
- Lock/release notices apply directly through existing lock styling without `get_lock_id`
- Repeated events for the same paragraph/content change reuse one pending replacement `uniqueId` until the DB write succeeds.

## Filtered DB Reads

Collaboration fetches use `API_GET_FILTER_DOCS` (`${API_PATH}getFilterdocs`) with an explicit Mongo `filter` projection. `API_GET_DOCS` is fallback only if the filtered endpoint is unavailable during rollout.

`findupdatewithpush` stays write-only. It returns a small acknowledgement for `lockid`, `replacementOnly`, `flagUpdate`, `lastSyncOnly`, and cleanup writes; it does not filter replacements or return full lock/replacement state. Any caller that needs fresh authoritative rows performs a separate `getFilterdocs` read.

- `get_lock_id`: `["_id", "docid", "rolename", "locks", "replacements"]`
- targeted replacement fetch: `["_id", "docid", "rolename", "replacements"]`
- initial record fetch: `["_id", "docid", "rolename", "locks"]`
- presence/status fetch: only fields needed by the dialog

For `ParaLockSync`, the backend filter helper resolves the current user from `username`, `user`, or `find["locks.user"]`, reads canonical `locks[].lastSync` with lowercase `lastsync` fallback, excludes the current user's own replacements, returns only newer polling replacements, and keeps the latest replacement per paragraph.

The Java endpoints are doc-room scoped:

- `/collaboration` handles current module JSON collaboration notices
- `/collab` remains a compatibility/test endpoint when deployed
- Missing `docid` sessions are isolated in a default room

## Cursor Locks And Sync Acks

In legacy mode, cursor movement updates the current paragraph lock through the existing `lockid` DB process. In collaborative mode, cursor movement sends realtime `lock`/`release` notices through BroadcastChannel/socket and does not fetch `get_lock_id`. Both workflows listen for CKEditor `selectionChange` and editable `contentDom` events: `mouseup`, `keyup`, and `click`. Cursor events run through `CURSOR_LOCK_DELAY_MS`, default `0`, so CKEditor selection moves before paragraph lookup. The canonical cursor process name is `lockonly`.

`lastSync` is state-owned. A new current-user lock row initializes it with `Date.now()`, cursor movement reuses the stored value, and replacement response processing advances it to the response-received timestamp. `_afterReplacementProcess()` persists that value through `lastSyncOnly`; it must not broadcast, socket notify, push a replacement, or create a flag.

## File Map

| File | Role |
| --- | --- |
| `workflow.js` | Shared mode resolver, runtime manager, eligibility, safe fallback helpers. |
| `context.js` | Registers or status-loads `CollaborativeModule` after editor readiness. |
| `index.js` | Lock/replacement logic, transports, presence, status dialog. |
| `template.html` | Collaborative Status dialog and local/UAT Testing Mode controls. |
| `workflow.json` | Machine-readable workflow descriptions for this module. |

## Public Globals

| Global | Meaning |
| --- | --- |
| `window.CollaborationWorkflow` | Shared mode resolver, runtime switcher, and fallback factory. |
| `window.CollaborativeModule` | Collaborative module instance or safe fallback. |
| `window.paraLock` | Active lock provider for legacy compatibility. |
| `window.enableCollaborativeSharedKey` | Request-based local/UAT collaboration enablement helper. |

## Compatibility Rules

- Preserve `_sendToServer`, `_createReplacePush`, `_applyReplacements`, `_applyLocks`, and `_isElementLocked`.
- Keep DB/API data authoritative for correction content.
- Keep polling as fallback for missed BroadcastChannel/socket notices.
- Do not use the full-document Automerge logic for paragraph locking.
