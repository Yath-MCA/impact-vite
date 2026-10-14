# SocketBridge — QA checklist

**Docs:** [skills.md](./skills.md) · [README.md](./README.md) · [DEV.md](./DEV.md) · [WORKFLOW.md](./WORKFLOW.md)

Manual checks for SocketBridge, `paraLockSync`, Landing Page presence, and fallback behavior.

---

## Prerequisites

- Build/deploy editor and landing assets with `socket_bridge` emitted.
- Use two browser sessions where possible: separate browsers or separate profiles.
- Open DevTools Console and Network.
- Filter Network by `collaboration`, `getdocs`, and paraLock REST endpoints.

---

## Bridge startup

| # | Steps | Expected |
|---|-------|----------|
| B1 | Open editor for a collaborative document | `window.SocketBridge` exists after assets load |
| B2 | Inspect socket URL | URL is `/collaboration?docid=<docid>&source=editor`; no `channel` query param |
| B3 | Call `SocketBridge.getInstance()` twice with same `docid/sessionId` but different channels | Same bridge object is reused |
| B4 | Open same document in different browser/profile | Separate session creates a separate bridge |

---

## ParaLock socket-primary behavior

| # | Steps | Expected |
|---|-------|----------|
| P1 | Socket connected, move cursor into paragraph | Frontend publishes `LOCK_ACQUIRE` on `channel: collaboration`, `scope: paraLock` |
| P2 | Socket connected, no active cursor block during fallback refresh | Frontend publishes `LOCK_GET_STATE` |
| P3 | Socket connected, wait through legacy interval | REST/DB lock polling does not fire from interval |
| P4 | Force socket disconnected, wait through interval | Old REST/DB lock polling resumes |
| P5 | Close or unload editor while socket connected | Frontend publishes `LOCK_RELEASE` |
| P6 | Receive `LOCK_DENIED` from another session | Existing locked UI attributes/classes are applied |
| P7 | Receive `LOCK_RELEASED` | Existing locked UI attributes/classes are removed |

---

## Replacement notices

| # | Steps | Expected |
|---|-------|----------|
| R1 | User A changes paragraph content and save path succeeds | Socket sends metadata-only `replacement` notice |
| R2 | User B receives notice | User B fetches replacement data by `uniqueId` |
| R3 | Inspect socket payload | No full `updated_html` content is sent through SocketBridge |

---

## Landing Page presence

| # | Steps | Expected |
|---|-------|----------|
| L1 | Open Landing Page for collaborative document | Landing loads SocketBridge if available |
| L2 | Continue/enter session | Landing sends `presence` message with `channel: presence`, `scope: document`, `source: landing` |
| L3 | Bridge asset load fails | Landing fallback transport still sends presence using `/collaboration?docid=<docid>&source=landing` |

---

## Regression commands

```txt
node --check ckeditor/plugins/paraLockSync/plugin.js
node --check src/modules/_wip/socket_bridge/index.js
npx vitest run tests/unit/paraLockSync/socketBridgeAdapter.test.js tests/unit/socket_bridge/socketBridge.test.js
```

---

## Known limitations

- Backend authoritative `LOCK_*` processing is pending.
- REST/DB polling is still required as fallback and reconnect recovery.
- Do not mark backend lock authority complete from frontend-only tests.
