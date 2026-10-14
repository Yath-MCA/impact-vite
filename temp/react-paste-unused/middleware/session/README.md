# session

## Purpose / ownership
DB-match verification, idle timeout, and the linksharing send/receive request flow (check/verify/send/poll/close). Entry-point concerns (docId/storage/shareKey/user-info resolution) live in `services/core/` — see its README.

## Key files
- `sessionGateway.js` — check/verify/send/poll/close linksharing requests
- `sessionCheckClassify.js` — classifies check-response conflict/retry states
- `sessionPayloads.js` — request payload builders, id generators
- `sessionConfig.js` — timeouts/retry/env-driven config (including `idleTimeoutMs`)
- `sessionConstants.js` — process/status/storage-key constants
- `sessionSource.js` — pure session-source normalizer, shared by `core/` and `session/`
- `idleTimeout.js` — client-side inactivity watchdog (`startIdleTimeoutWatcher`)
- `tabPresence.js` — same-browser tab lock for validateurl/editor
- `runtimeFlags.js` — `isLocalHost()` and related env flags
- `sessionServiceClient.js`, `sessionSocketClient.js` — transport clients
- `index.js`

## Dependencies
apiService; `services/core/editorSessionStorage.js` for storage read/commit; `services/core/shareKeyEntry.js` for shareKey recovery.

## Status
**active**
