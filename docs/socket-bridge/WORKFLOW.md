# SocketBridge — workflow

**Docs:** [skills.md](./skills.md) · [README.md](./README.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md)

---

## SocketBridge lifecycle

```mermaid
flowchart TD
    A[Feature module requests bridge] --> B[SocketBridge.getInstance docid sessionId]
    B --> C{Existing bridge?}
    C -->|Yes| D[Reuse document-session bridge]
    C -->|No| E[Create bridge]
    E --> F[connect/start]
    D --> G[subscribe channel scope type]
    F --> G
    G --> H[publish or receive message]
    H --> I[Route to matching handlers]
    I --> J[disconnect/stop on module close]
```

## ParaLock connected path

```mermaid
sequenceDiagram
    participant Editor
    participant ParaLock as paraLockSync
    participant Bridge as SocketBridge
    participant Server as /collaboration

    Editor->>ParaLock: Cursor enters paragraph
    ParaLock->>Bridge: publish LOCK_ACQUIRE
    Bridge->>Server: collaboration paraLock message
    Server-->>Bridge: LOCK_GRANTED / LOCK_DENIED
    Bridge-->>ParaLock: routed lock notice
    ParaLock->>Editor: apply existing lock UI rules
```

## ParaLock fallback path

```mermaid
flowchart TD
    A[Legacy interval tick] --> B{SocketBridge connected?}
    B -->|Yes| C[Skip REST lock polling]
    B -->|No| D[Run _runLockOnlyTick]
    D --> E[_sendToServer REST/DB lock path]
    E --> F[_applyLocks existing UI]
```

## Landing Page presence

```mermaid
sequenceDiagram
    participant Landing
    participant Bridge as SocketBridge
    participant Server as /collaboration
    participant Editor

    Landing->>Bridge: getInstance docid source landing
    Landing->>Bridge: publish presence join
    Bridge->>Server: channel presence scope document
    Server-->>Editor: presence routed to active document users
    Editor->>Editor: show collaborator joined signal when available
```

## Replacement notice and fetch

```mermaid
sequenceDiagram
    participant UserA as Editor A
    participant ParaLockA as paraLockSync A
    participant Bridge as SocketBridge
    participant UserB as Editor B
    participant API as REST/API

    UserA->>ParaLockA: Save paragraph replacement
    ParaLockA->>API: Persist replacement
    API-->>ParaLockA: success with uniqueId
    ParaLockA->>Bridge: replacement notice metadata only
    Bridge-->>UserB: replacement notice
    UserB->>API: fetch by uniqueId
    API-->>UserB: authoritative replacement data
    UserB->>UserB: apply replacement if valid
```

---

## Notes

- SocketBridge carries live coordination and notification messages.
- REST/API remains authoritative for durable data and recovery.
- Backend `LOCK_*` authority is still pending; frontend routing is ready.
