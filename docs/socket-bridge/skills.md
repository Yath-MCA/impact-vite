# SocketBridge — skills entry

**Audience:** agents and onboarding. Use this when touching SocketBridge, `paraLockSync`, Landing Page presence, or future realtime features in **impactweb**.

**Docs:** [README.md](./README.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md) · [WORKFLOW.md](./WORKFLOW.md)

---

## Rule of thumb

Feature code talks to:

```js
window.SocketBridge
```

Feature code does **not** talk directly to:

```js
window.SmartSyncSocket
BroadcastChannel
WebSocket
io.connect
```

Those are transport details owned by the bridge or compatibility fallback code.

---

## Current public shape

```js
const bridge = SocketBridge.getInstance({
    docid,
    source: "editor",
    user,
    role,
    sessionId
});

const unsubscribe = bridge.subscribe({
    channel: "collaboration",
    scope: "paraLock",
    type: "LOCK_GRANTED",
    handler: handleLock
});

bridge.publish({
    docid,
    correlationId,
    channel: "collaboration",
    scope: "paraLock",
    type: "LOCK_ACQUIRE",
    payload: { paraId: ["p1"] }
});
```

Compatibility aliases still exist: `start`, `stop`, `send(type, payload)`, `subscribe("type", handler)`, and `purpose`.

---

## Channels and scopes

| Channel | Scope | Current / intended use |
|---------|-------|------------------------|
| `collaboration` | `paraLock` | Editor paraLock presence, lock notices, replacement notices |
| `presence` | `document` | Landing Page presence |
| `notification` | `session` | Future session close/redirect notifications |
| `support` | `conversation` | Future support chat/dialog notifications |

---

## Do

- Keep one bridge per `docid + sessionId`.
- Put routing details in the message envelope: `channel`, `scope`, `type`.
- Use `LOCK_ACQUIRE`, `LOCK_RELEASE`, and `LOCK_GET_STATE` only as live socket coordination commands.
- Keep REST/DB paths for initial load, durable writes, audit, reconnect recovery, and fallback.
- Preserve replacement notice behavior: socket sends metadata only; receiver fetches by `uniqueId`.
- Keep tests updated when changing bridge API compatibility.

## Do not

- Do not create one physical socket per channel.
- Do not put full `updated_html` or document content into bridge payloads.
- Do not remove the fallback interval until backend lock authority and recovery are in place.
- Do not claim backend lock authority is complete; frontend is prepared, server authority is still pending.
- Do not add direct `SmartSyncSocket` calls in feature modules.

---

## Quick debug

1. Confirm `window.SocketBridge` is loaded from `assets/<version>/modules/socket_bridge/index.js`.
2. Confirm socket URL is `/collaboration?docid=<docid>&source=<source>`.
3. Confirm `SocketBridge.getInstance()` returns the same instance for the same `docid + sessionId`.
4. Confirm connected paraLock cursor changes publish `LOCK_ACQUIRE`.
5. Confirm disconnected paraLock interval falls back to old REST/DB polling.
