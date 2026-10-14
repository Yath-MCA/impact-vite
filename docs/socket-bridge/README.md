# SocketBridge and ParaLock realtime docs

**Docs:** [skills.md](./skills.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md) · [WORKFLOW.md](./WORKFLOW.md)

SocketBridge is the public realtime API for collaboration features in **impactweb**. Feature modules use `window.SocketBridge`; `SmartSyncSocket` remains private transport plumbing underneath the bridge.

---

## Current status

| Area | Status |
|------|--------|
| Frontend bridge | Implemented under `src/modules/_wip/socket_bridge/` and emitted through gulp WIP modules |
| Instance model | One bridge per open document session: `docid + "::" + sessionId` |
| Socket URL | `/collaboration?docid=<docid>&source=<source>` |
| Routing | `channel`, `scope`, and `type` live in the message envelope |
| `paraLockSync` | Uses SocketBridge for presence, replacement notices, and frontend-ready lock commands |
| Landing Page | Uses SocketBridge for early presence with fallback transport |
| Backend lock authority | Pending; REST/DB lock path remains fallback and recovery source |

---

## Main files

| File | Responsibility |
|------|----------------|
| [`src/modules/_wip/socket_bridge/index.js`](../../src/modules/_wip/socket_bridge/index.js) | Public bridge API, document-session instance registry, message normalization, handler routing |
| [`ckeditor/plugins/paraLockSync/plugin.js`](../../ckeditor/plugins/paraLockSync/plugin.js) | ParaLock core logic; socket-primary lock notices with REST fallback |
| [`src/js/dialogModules/LandingPage.js`](../../src/js/dialogModules/LandingPage.js) | Early collaborative presence before editor redirect |
| [`utils/gulp/pipeline.js`](../../utils/gulp/pipeline.js) | Emits `socket_bridge` as a WIP module asset |
| [`tests/unit/socket_bridge/socketBridge.test.js`](../../tests/unit/socket_bridge/socketBridge.test.js) | Bridge API and routing tests |
| [`tests/unit/paraLockSync/socketBridgeAdapter.test.js`](../../tests/unit/paraLockSync/socketBridgeAdapter.test.js) | ParaLock bridge adapter tests |

---

## Principles

- Use `SocketBridge` from feature modules.
- Do not call `SmartSyncSocket` directly outside bridge internals.
- Keep sockets as live coordination and notification transport.
- Keep REST/API and database as initial load, durable save, audit, reconnect recovery, and fallback.
- Do not remove legacy polling until backend authoritative lock commands and reconnect recovery are verified.
