# SocketBridge — developer guide

**Docs:** [skills.md](./skills.md) · [README.md](./README.md) · [QA.md](./QA.md) · [WORKFLOW.md](./WORKFLOW.md)

SocketBridge centralizes realtime connection ownership for document collaboration. It is currently a frontend bridge over existing transport behavior; backend authoritative paragraph locks are a follow-up.

---

## File map

| File | Responsibility |
|------|----------------|
| [`src/modules/_wip/socket_bridge/index.js`](../../src/modules/_wip/socket_bridge/index.js) | Public API, instance cache, routing, envelope normalization |
| [`ckeditor/plugins/paraLockSync/plugin.js`](../../ckeditor/plugins/paraLockSync/plugin.js) | Uses bridge for paraLock presence, replacement notices, and frontend-ready lock commands |
| [`src/js/dialogModules/LandingPage.js`](../../src/js/dialogModules/LandingPage.js) | Uses bridge for early document presence; retains fallback if bridge asset cannot load |
| [`utils/gulp/pipeline.js`](../../utils/gulp/pipeline.js) | Emits WIP `socket_bridge` module |

---

## Instance rule

One open document tab/session should have one bridge:

```txt
docid + "::" + sessionId
```

`channel` and `scope` are not instance keys. They classify each message or subscription.

---

## Public API

```js
const bridge = SocketBridge.getInstance({
    docid,
    source: "editor",
    user,
    role,
    sessionId
});

bridge.connect();              // alias of start()
bridge.disconnect("reason");   // alias of stop(reason)

const unsubscribe = bridge.subscribe({
    channel: "collaboration",
    scope: "paraLock",
    type: "LOCK_GRANTED",
    handler: message => {}
});

bridge.publish({
    docid,
    channel: "collaboration",
    scope: "paraLock",
    type: "LOCK_ACQUIRE",
    payload: { paraId: ["p1"] }
});

const state = bridge.getState();
```

Compatibility:

```js
bridge.start();
bridge.stop("reason");
bridge.send("presence", payload);
bridge.subscribe("replacement", handler);
SocketBridge.getInstance({ docid, purpose: "collaboration" });
```

---

## Message envelope

Current normalized envelope:

```js
{
    version: 1,
    messageId,
    correlationId,
    docid,
    channel,
    scope,
    type,
    source,
    uniqueId,
    paraId,
    user,
    role,
    sessionId,
    timestamp,
    payload
}
```

Bridge strips unsafe content fields from `payload`: `updated_html`, `html`, `content`, and `fullContent`.

---

## ParaLock behavior

When `SocketBridge` is connected:

- Cursor lock changes publish `LOCK_ACQUIRE`.
- Empty/no-cursor lock refresh publishes `LOCK_GET_STATE`.
- Before unload publishes `LOCK_RELEASE`.
- Replacement changes still save through existing logic, then send a metadata notice; the remote side fetches by `uniqueId`.
- The legacy interval remains alive but skips REST lock polling while `_hasRealtimeTransport()` is true.

When disconnected:

- Legacy REST/DB lock polling continues through `_sendToServer`.
- Existing durable/recovery behavior remains unchanged.

Supported frontend lock notices:

```txt
LOCK_GRANTED
LOCK_DENIED
LOCK_RENEWED
LOCK_RELEASED
LOCK_STATE
LOCK_ERROR
```

These normalize into existing `_applyLocks()` / `_removeLockFromElement()` UI behavior.

---

## Landing Page behavior

Landing Page starts early presence through:

```js
SocketBridge.getInstance({
    docid,
    channel: "presence",
    scope: "document",
    source: "landing",
    sessionId
});
```

If the bridge asset cannot load, Landing Page falls back to its local BroadcastChannel/WebSocket compatibility path.

---

## Known gaps

| Gap | Note |
|-----|------|
| Backend lock authority | Server does not yet grant/deny locks authoritatively through `LOCK_*` commands |
| ACK/correlation | Envelope does not yet include full ACK/correlation protocol |
| Sequence recovery | No sequence-gap detection yet |
| Polling removal | Polling is fallback-gated, not deleted |
| Backend multi-node lock sharing | Out of scope for this frontend phase |
