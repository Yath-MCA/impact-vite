# Collaborative Module Skills Matrix

## Objective

Define the practical skills needed to maintain, test, and release `collaborativeModule` safely while preserving the existing `paraLockSync` workflow.

## Skill Areas

| Area | Required Skill | Level | Owner |
| --- | --- | --- | --- |
| CKEditor lifecycle | Plugin init, `instanceReady`, `contentDom`, cursor selection, unload handling | Advanced | Feature Developer |
| ModuleSystem | `context.js`, explicit collaborative loading, template-backed dialogs | Intermediate | Feature Developer |
| Runtime switching | `activateMode`, `deactivateAll`, provider pause/resume, idempotent intervals/listeners | Advanced | Feature Developer |
| Shared key startup | `loadSharedKey`, request-based `enableCollaborativeSharedKey`, local/UAT persistence | Intermediate | Feature Developer |
| DB-first sync | Lock/replacement payloads, filtered `getFilterdocs` reads, state-owned `lastSync`, uniqueId fetch, `flagUpdate`, `lastSyncOnly` | Advanced | Feature Developer |
| Browser transports | BroadcastChannel, WebSocket reconnects, doc-scoped URLs, payload filtering | Intermediate | Feature Developer |
| Java WebSocket | `@ServerEndpoint`, doc-room session maps, Tomcat deploy | Intermediate | Backend Developer |
| QA | Two-tab, same-doc/different-doc, legacy/collaborative/off runtime modes | Advanced | QA Engineer |
| Release review | Compatibility with legacy globals, existing polling, and no-notify processes | Advanced | Senior Reviewer |

## Developer Guidance

- Read [README.md](./README.md) before changing mode gates or transport code.
- Read [API_LEGACY.md](./API_LEGACY.md) and [API_COMBINED.md](./API_COMBINED.md) before changing process payloads or response handling.
- Keep only one workflow active at a time.
- Treat `off` as runtime pause, not as feature disable.
- Treat BroadcastChannel/socket notices as hints only; never trust them as content.
- Preserve DB/API response compatibility for lock and replacement consumers.
- Use `API_GET_FILTER_DOCS` plus process-specific `filter` arrays for collaboration reads; keep write processes on `findupdatewithpush`.
- Keep `findupdatewithpush` write-only and ack-only. ParaLockSync current-user/`lastSync` replacement filtering belongs in `findwithfilter` / `getFilterdocs`.
- Keep `lastSyncOnly` active-provider only and no-notify; advance `lastSync` from replacement response timing, not cursor movement.
- Recompile Java endpoint classes after changing `utils/java/collab/editor/*.java`.

## QA Guidance

- Verify `legacy`, `collaborative`, and `off` modes without page refresh.
- Verify UAT/local legacy startup does not register CollaborativeModule or list Collaborative Status.
- Test two tabs on the same `docid` and two tabs on different `docid` values.
- Confirm socket payloads do not contain `updated_html`.
- Confirm cursor movement by mouse and keyboard updates the current paragraph lock without advancing `lastSync`.
- Confirm legacy `LoopInterval` starts after `FullyLoaded` even before the first editor click.
- Confirm polling still catches updates when BroadcastChannel/socket is unavailable.

## Reviewer Checklist

1. Mode resolver defaults to `legacy`.
2. Legacy plugin pauses outside `legacy`.
3. Collaborative module pauses operations outside `collaborative`.
4. `Off` clears active operations and exposes fallback without changing `SHARED_KEY.collaborative`.
5. Socket URL includes `docid`.
6. Java endpoints isolate rooms by `docid`.
7. Fallback globals remain safe for existing callers.
8. No BroadcastChannel/socket notice contains `updated_html`.
9. API docs match current `_buildServerParams()` and presence/fetch helper payloads.
10. Read examples use `getFilterdocs` with `filter`, with `getdocs` documented as fallback only.
11. Write examples return small acknowledgements and do not imply `findupdatewithpush` hydrates full lock/replacement state.
