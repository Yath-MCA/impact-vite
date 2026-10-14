# QA Test Cases: Collaborative Module

## Coverage Goal

Validate runtime mode switching, status dialog controls, DB-first replacement sync, cursor-driven lock updates, BroadcastChannel/socket payload safety, Java doc-room isolation, and legacy compatibility.

## Preconditions

1. User can open editor with a valid `docid`.
2. Collaboration eligibility passes for the selected client/document.
3. Local or UAT environment is available for Testing Mode controls.
4. Java WebSocket endpoints are deployed if socket tests are included.

## Startup Cases

### TC-COLLAB-001: Legacy mode initializes only paraLockSync

Steps:

1. Clear `localStorage["xmleditor:collabMode:" + docid]` or set it to `legacy`.
2. Open editor without `?collabMode`.
3. Repeat with `?collabMode=legacy`.
4. Wait for CKEditor `instanceReady`.
5. Inspect `window.paraLock`, module registry, context menu, and console logs.

Expected:

1. `paraLockSync` initializes.
2. `CollaborativeModule` is not registered or initialized.
3. No `SHOW_COLLAB_STATUS` command or Collaborative Status menu item is listed.
4. No collaborative socket, BroadcastChannel, presence heartbeat, lock/replacement listener, or status-only dialog starts.
5. Existing polling and unload release behavior continue.

### TC-COLLAB-002: Collaborative mode initializes only CollaborativeModule

Steps:

1. Open editor with `?collabMode=collaborative`.
2. Wait for editor readiness.
3. Inspect `window.CollaborativeModule` and `window.paraLock`.

Expected:

1. `CollaborativeModule` is active.
2. `paraLockSync` is paused/no-op.
3. BroadcastChannel is `collaborativeModule:<docid>`.
4. Socket URL contains `/collaboration?docid=<docid>`.

### TC-COLLAB-003: Off mode exposes safe fallback

Steps:

1. Open editor with `?collabMode=off`.
2. Call `window.paraLock._isElementLocked()`.
3. Call `window.paraLock.getLockedElementsByOthers()`.

Expected:

1. No collaboration runtime processes editor lock/replacement writes.
2. Lock check returns `false`.
3. Locked elements response is empty.
4. Collaboration feature eligibility is not modified.

## Runtime Dialog Cases

### TC-COLLAB-004: Local/UAT Testing Mode switches without refresh

Steps:

1. Open Collaborative Status dialog in local/UAT.
2. Select `Off`.
3. Select `Legacy paraLockSync`.
4. Select `Collaborative Module`.

Expected:

1. Selected mode is stored under `xmleditor:collabMode:${docid}`.
2. User sees a clear notification for each switch.
3. Page does not reload during normal switching.
4. `Off` pauses both providers and exposes fallback.
5. `Legacy` resumes only `paraLockSync`.
6. `Collaborative` starts only `CollaborativeModule`.

### TC-COLLAB-005: Runtime switching is idempotent

Steps:

1. Click the same mode button three times.
2. Inspect timers, socket state, and console logs.

Expected:

1. No duplicate `LoopInterval` exists.
2. No duplicate socket or BroadcastChannel exists.
3. No duplicate editor listeners cause repeated DB writes.

### TC-COLLAB-006: Status fields render

Steps:

1. Open status dialog.
2. Review summary area.

Expected:

1. Active workflow is visible.
2. Current `docid` is visible.
3. Broadcast channel and socket URL are visible.
4. Connection states are readable.

## Cursor Lock Cases

### TC-COLLAB-007: Mouse click updates current paragraph lock

Steps:

1. Start legacy mode, then collaborative mode.
2. Click into a paragraph with an `id`.
3. Inspect outgoing DB/socket activity.

Expected:

1. Cursor update path runs through canonical `lockonly`.
2. Payload resolves the clicked paragraph id.
3. Legacy sends `_sendToServer(payload, "lockid")`.
4. Collaborative sends `lock` notice and does not send DB `lockid`.

### TC-COLLAB-008: Keyboard movement updates current paragraph lock

Steps:

1. Place cursor in one paragraph.
2. Move cursor to another paragraph with arrow keys.
3. Inspect outgoing DB request.

Expected:

1. Editable `keyup` event queues selection processing.
2. Collapsed caret selection resolves a paragraph id.
3. Legacy sends `lockid`; collaborative sends realtime `lock` without `get_lock_id`.

### TC-COLLAB-009: Off mode blocks cursor DB writes

Steps:

1. Click `Off`.
2. Move cursor by mouse and keyboard.

Expected:

1. No cursor movement DB write is sent.
2. `window.paraLock` remains fallback.

## Transport And DB Cases

### TC-COLLAB-010: Broadcast/socket payload excludes updated_html

Steps:

1. Trigger a correction in collaborative mode.
2. Inspect outgoing BroadcastChannel/socket message.

Expected:

1. Payload includes `type`, `docid`, `uniqueId`, `paraId`, `user`, `sessionId`, and `timestamp`.
2. Payload does not include `updated_html`.

### TC-COLLAB-011: Received uniqueId fetches DB data

Steps:

1. In tab A, insert a correction.
2. In tab B, intercept targeted fetch.

Expected:

1. Tab B receives only `uniqueId` in notice.
2. Tab B fetches by `docid + replacements.uniqueId`.
3. Tab B applies via `_applyReplacements()`.
4. Tab B sends `flagUpdate`.

### TC-COLLAB-011B: Writes acknowledge and reads hydrate

Steps:

1. Trigger `lockid`, `replacementOnly`, `flagUpdate`, and `lastSyncOnly`.
2. Inspect the `findupdatewithpush` responses.
3. Trigger `get_lock_id` and targeted replacement fetch.
4. Inspect the `getFilterdocs` responses.

Expected:

1. Write responses are small acknowledgements with `r`, `id`, `data.id`, `data.process`, and `time_s`.
2. Write responses do not contain full `locks` or `replacements` unless a temporary rollout-compatible backend returns them.
3. Filtered read responses contain only fields requested by `filter`.
4. ParaLockSync replacement filtering happens only in `getFilterdocs`.
5. `lastSync` is canonical; lowercase `lastsync` is accepted only as old-data fallback.

### TC-COLLAB-011A: Collaborative replacement uniqueId is stable

Steps:

1. In collaborative mode, edit one paragraph.
2. Trigger repeated cursor/selection events before the first `replacementOnly` response returns.
3. Inspect DB write payloads and socket/BroadcastChannel replacement notices.

Expected:

1. The same paragraph/content change reuses one `uniqueId`.
2. The replacement notice sends the same `uniqueId` written to DB.
3. Dirty/pending state clears after successful `replacementOnly`.

### TC-COLLAB-012: lastSyncOnly updates without notification

Steps:

1. Apply a replacement in legacy mode.
2. Apply a replacement in collaborative mode.
3. Inspect DB/API calls and socket/BroadcastChannel messages.

Expected:

1. Replacement response receive time is stored in provider `state.lastSync`.
2. `_afterReplacementProcess()` sends `lastSyncOnly` with that stored value.
3. Current user lock row gets `lastSync`.
4. No BroadcastChannel notice is emitted.
5. No socket notice is emitted.
6. No replacement push or `flagUpdate` is created by `lastSyncOnly`.

### TC-COLLAB-012B: Legacy interval starts after full load

Steps:

1. Open a legacy-mode document.
2. Wait until `InitialLoadDialog.FullyLoaded` or `InitialLoading.FullyLoaded` is true.
3. Do not click inside the editor.

Expected:

1. `paraLockSync.LoopInterval` starts once after full load.
2. The initial cursor lock refresh is queued safely.
3. Cursor lock payloads reuse `state.lastSync`; they do not advance it.

### TC-COLLAB-013: Same session is ignored

Steps:

1. Send a notice with the current `sessionId`.
2. Observe handler behavior.

Expected:

1. Notice is ignored.
2. No duplicate replacement or lock apply occurs.

## Socket Room Cases

### TC-COLLAB-014: Same docid receives socket notice

Steps:

1. Connect two clients to `/collaboration?docid=A`.
2. Send a JSON notice from client 1.

Expected:

1. Client 2 receives the notice.

### TC-COLLAB-015: Different docid does not receive socket notice

Steps:

1. Connect one client to `/collaboration?docid=A`.
2. Connect another client to `/collaboration?docid=B`.
3. Send a notice from A.

Expected:

1. B receives nothing.

### TC-COLLAB-016: Missing docid isolation

Steps:

1. Connect one client to `/collaboration`.
2. Connect another client to `/collaboration?docid=A`.
3. Send from the missing-doc client.

Expected:

1. Missing-doc clients are isolated in the default room.
2. `docid=A` does not receive the notice.

## Shared Key Cases

### TC-COLLAB-017: loadSharedKey does not auto-enable collaboration

Steps:

1. Set `xmleditor:collabEnabled:${docid}=true`.
2. Load a shared key whose `collaborative` value is not `yes`.
3. Open the editor.

Expected:

1. `loadSharedKey()` does not silently patch `SHARED_KEY.collaborative`.
2. Collaboration becomes enabled only after calling `enableCollaborativeSharedKey()`.

### TC-COLLAB-018: Explicit enable callback persists shared key

Steps:

1. Call `window.enableCollaborativeSharedKey({ reload: false }, callback)`.
2. Inspect callback result and localStorage.

Expected:

1. Callback receives `{ r: 1, docid, sharedKey, reloadRequired }`.
2. Stored shared key contains `collaborative: "yes"`.
3. `xmleditor:collabMode:${docid}` is `collaborative`.

## Regression Cases

### TC-COLLAB-019: Polling fallback still catches missed updates

Steps:

1. Disable BroadcastChannel or socket.
2. Make a correction from another tab.
3. Wait for polling.

Expected:

1. Replacement and lock updates still apply from DB response.

### TC-COLLAB-020: Unload releases locks

Steps:

1. Lock a paragraph in collaborative mode.
2. Close or reload the tab.

Expected:

1. Close session lock release is sent.
2. Presence leave is sent.
3. Other users receive release/status update.

### TC-COLLAB-021: API docs match process implementation

Steps:

1. Compare [API_LEGACY.md](./API_LEGACY.md) with legacy `_buildServerParams()`.
2. Compare [API_COMBINED.md](./API_COMBINED.md) with both providers and collaborative presence/fetch helpers.
3. Search socket/BroadcastChannel examples for `updated_html`.

Expected:

1. All documented process names exist in implementation.
2. `lastSyncOnly` is documented as common active-provider behavior.
3. Presence and targeted uniqueId fetch are documented in the combined API doc.
4. Socket/BroadcastChannel examples do not include `updated_html`.

### TC-COLLAB-022: Filtered reads use getFilterdocs

Steps:

1. Trigger legacy `get_lock_id`.
2. Trigger collaborative `_fetchByUniqueId(uniqueId)`.
3. Trigger initial record fetch and status refresh.
4. Inspect each `commonfn.callajax` request.

Expected:

1. Read calls use `API_GET_FILTER_DOCS` when available.
2. Each read payload includes `filter`.
3. Write calls still use `findupdatewithpush`.
4. `API_GET_DOCS` appears only as the filtered-read fallback.

## Result Template

- Case ID:
- Environment:
- Mode:
- Doc ID:
- Status: Pass or Fail
- Evidence:
- Notes:
