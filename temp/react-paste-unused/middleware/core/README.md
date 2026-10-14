# core

## Purpose / ownership
React editor entry point: local/session storage read+write, shareKey resolution, user-info resolution, and the entry orchestrator (docId -> storage -> shareKey -> user-info -> access), run in parallel with `services/session`'s DB-match verify.

## Key files
- `editorSessionStorage.js` — local/session storage read+write (validate response, session id/start time, shareKey commit, doc-scoped cleanup)
- `shareKeyEntry.js` — resolves the shareKey object (localStorage -> GET_DOCS fallback)
- `userInfoEntry.js` — resolves/derives legacy `USER_INFO` from normalized session source
- `editorEntry.js` — entry orchestrator: `resolveEditorEntryState` (docId/storage/shareKey/user-info/access) + `verifyEditorEntry` (hands off to `services/session/sessionGateway.verifySession`)
- `useEditorEntry.js` — React hook wrapping `editorEntry.js`, exposing `{ loading, entryReady, ready, error, session }`
- `browserCompatibility.js` — browser support check, used by the app-wide router gate and `ValidateUrlPage`
- `index.js` — barrel for the above

## Dependencies
localStorage/sessionStorage `xmleditor:*` keys; `services/session/sessionGateway.js` for DB-match verify and doc recovery; `services/session/sessionSource.js` for normalization.

## Archived
The jQuery-era `InitService`/`EditorInitService`/`SharedKeyService`/`StorageService`/`URLService`/`LoadingService`/`SessionGuard` classes and `services/bridge/GlobalBridge.js` were unused by the live app and moved to `temp/legacy/` on 2026-09-08 — see `temp/legacy/README.md`.

## Status
**active**
