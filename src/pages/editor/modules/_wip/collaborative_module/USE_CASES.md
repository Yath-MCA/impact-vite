# Collaborative Module Use Cases

## UC-COLLAB-001: Run Existing Legacy Workflow

**Actor:** Local/UAT tester or production user  
**Mode:** `legacy`

1. User opens editor with collaboration enabled.
2. Resolver returns `legacy`.
3. CKEditor loads `paraLockSync`.
4. Legacy runtime resumes events and polling.
5. `CollaborativeModule` is not registered and no Collaborative Status command is listed.

**Success:** Existing locking, polling, replacement apply, and unload release behavior remain unchanged.

## UC-COLLAB-002: Run Collaborative Module Workflow

**Actor:** Local/UAT tester  
**Mode:** `collaborative`

1. User selects Collaborative Module in the status dialog or opens `?collabMode=collaborative`.
2. `paraLockSync` pauses runtime operations.
3. `CollaborativeModule` starts after editor readiness.
4. BroadcastChannel and socket transports connect for the current `docid`.
5. Presence heartbeat and collaborative polling run once.

**Success:** Only `CollaborativeModule` owns lock/replacement event handling, and no page refresh is required for normal runtime switching.

## UC-COLLAB-003: Pause Collaboration Runtime

**Actor:** Tester  
**Mode:** `off`

1. User selects Off in the status dialog or opens `?collabMode=off`.
2. Legacy `LoopInterval` and event actions pause.
3. Collaborative polling, presence heartbeat, socket, and BroadcastChannel stop.
4. `window.paraLock` and `window.CollaborativeModule` expose safe fallback methods.

**Success:** Lock checks return false/empty and no collaboration DB writes are triggered by module listeners. `SHARED_KEY.collaborative` remains unchanged.

## UC-COLLAB-004: Switch Modes Without Refresh

**Actor:** Local/UAT tester  
**Mode:** runtime switch

1. Open the Collaborative Status dialog.
2. Click Off to pause both providers.
3. Click Legacy paraLockSync to resume legacy polling/events.
4. Click Collaborative Module to close legacy operations and start collaborative transports.
5. Click the same button repeatedly.

**Success:** The editor does not reload, active provider changes immediately, and intervals/listeners/transports are not duplicated.

## UC-COLLAB-005: Enable Collaborative Shared Key By Request

**Actor:** Local/UAT tester  
**Mode:** explicit enablement

1. Open a document whose shared key is not collaborative.
2. Call `window.enableCollaborativeSharedKey({ reload: true }, callback)`.
3. Helper patches and persists `SHARED_KEY.collaborative = "yes"`.
4. Helper persists local mode as `collaborative`.
5. Caller reloads if `reloadRequired` is true.

**Success:** Collaboration is enabled only by explicit request, not silently during page load.

## UC-COLLAB-006: Cursor Movement Updates Lock

**Actor:** Editor user  
**Mode:** `legacy` or `collaborative`

1. User clicks into a paragraph or moves caret with keyboard.
2. CKEditor `selectionChange` or editable `contentDom` event queues a cursor update.
3. Collapsed caret fallback resolves the nearest paragraph/block id.
4. Legacy sends the existing `lockid` DB process; collaborative sends realtime `lock`/`release` notices without `get_lock_id`.

**Success:** Legacy DB locks or collaborative realtime locks track the paragraph where the cursor is located.

## UC-COLLAB-007: Two Tabs On Same Document

**Actor:** Tester  
**Mode:** `collaborative`

1. Open two tabs for the same `docid`.
2. Make a paragraph correction or lock change in tab A.
3. Tab A writes to DB first.
4. Tab A reuses the same pending replacement `uniqueId` for repeated events on the same paragraph/content change.
5. Tab A broadcasts only a notice with `uniqueId` or lock refs.
6. Tab B receives the notice, fetches DB data through `getFilterdocs` with `filter: ["_id", "docid", "rolename", "replacements"]`, applies replacement/lock logic, and writes a flag acknowledgement.
7. After replacement apply, the active provider stores the response-received time and sends `lastSyncOnly` without notifying transports.

**Success:** Same-doc updates arrive quickly and content is always fetched from DB.

## UC-COLLAB-007A: Write Ack Then Filtered Read

**Actor:** Legacy or collaborative provider
**Mode:** `legacy` or `collaborative`

1. Provider writes through `findupdatewithpush` for `lockid`, `replacementOnly`, `flagUpdate`, `lastSyncOnly`, or cleanup.
2. Server returns a small ack with `r`, row id, process, and timestamp.
3. If the caller needs current paragraph state, it sends a separate `getFilterdocs` request with process-specific `filter` fields.
4. `getFilterdocs` applies ParaLockSync filtering from current user and `lastSync`.

**Success:** Write endpoint stays update-only, and all lock/replacement hydration comes from the filtered read endpoint.

## UC-COLLAB-008: Different Documents Do Not Cross-Apply

**Actor:** Tester  
**Mode:** `collaborative`

1. Open `docid=A` and `docid=B`.
2. Send lock/replacement/socket notices from `docid=A`.
3. Java socket rooming keeps notices inside room A.
4. Frontend still ignores wrong `docid` as a safety check.

**Success:** `docid=B` does not receive or apply `docid=A` changes.

## UC-COLLAB-009: Missed Broadcast Fallback

**Actor:** Tester  
**Mode:** `collaborative`

1. Disable BroadcastChannel or close a tab during a change.
2. Reopen or resume the tab.
3. Polling fetches server state through `getFilterdocs` with the process-specific `filter` projection.
4. Existing `_applyReplacements()` and `_applyLocks()` paths apply missed work.

**Success:** DB/polling catches missed browser notices.

## UC-COLLAB-010: Socket Endpoint Testing

**Actor:** Developer or QA  
**Tool:** [socket.html](../../../../snippet/socket.html)

1. Open `snippet/socket.html?docid=socket-test-doc`.
2. Select `/collab` or `/collaboration`.
3. Connect/reconnect.
4. Send JSON text notices.

**Success:** Same `docid` clients receive notices; different `docid` clients do not.
