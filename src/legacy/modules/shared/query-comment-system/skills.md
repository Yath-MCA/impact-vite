---
title: COMMENT QUERY - Comments and Author Queries
description: Use for query/comment CRUD, dialog open/save, panel refresh, restore, collator verify, and submodule init in src/js/query.js.
---

# Instructions

- Main source is **split under** [`src/query-comment-system/`](../../query-comment-system/) — merged at build via `QUERY_COMMENT_SYSTEM_JS` in [`utils/gulp/pipeline.js`](../../../utils/gulp/pipeline.js).
- Registry id: `querySystem`. Global parent: `window.queryModule`.
- Submodule ids: `queryPanel`, `queryTemplates`, `queryRestore`, `queryDialog`.
- Preserve **id-based naming**: DOM `id="queryDialog"` matches module id; `window.queryDialog` must be the **module instance**, not the HTMLElement.
- Always `await moduleSystem.getModule(id)` before using the result.
- For class inventory, submit options, and verify internals, see [DEV.md](./DEV.md).
- For reply modes and role workflows in depth, see [`docs/query-system-docs.md`](../../../docs/query-system-docs.md).

# Operations

## 1. INSERT (comment or query)

Create a new comment or author query from the dialog or an external workflow.

**Flow:**

1. Caller opens dialog: `window.queryDialog.open(queryId, process, options)` or `queryModule.dialogModule.open(...)`
   - `process`: `"comment"` or `"query"`
   - `queryId`: `null` for new; existing id for edit/reply context
2. `QueryDialogModule.open` → `show` / `showLoop` → user fills form and attachments
3. `QueryDialogModule.save()` builds payload and calls `QueryBaseModule.operationInsertOrUpdate(...)`
4. Validation via per-open `options` (demand-based, not global defaults)
5. On success: `createQuery` / update paths, `panelModule.refresh`, dialog may close

**Workflow `options` (passed at open):**

| Option | Meaning |
|--------|---------|
| `isAttachmentRequired` | Block save without attachment |
| `hasAllowedMultipleAttach` | When `false`, only one file |
| `isInputContentRequired` | Block save with empty text |
| `hasContentLimit` | Apply `contentRules` length checks |
| `forceOpen` | Open even if validation would normally block |
| `addFlag` / `addAttr` | Workflow-specific DOM flags (e.g. figures) |

**Key methods:**

- `QueryDialogModule.open(queryId, process, options)`
- `QueryDialogModule.save()`
- `QueryBaseModule.operationInsertOrUpdate(module, queryId, preSaveResults, extras, formData)`
- `QueryBaseModule.createQuery(queryData)`

**External callers:** `ref_form`, `figures`, `notes_group`, `math_group`, CKEditor `add_comment` command — all use `window.queryDialog.open(...)`.

## 2. REPLY / UPDATE

Add a response to an existing query/comment or update content.

**Flow:**

1. User opens reply UI in panel (quick reply toolbar) or via dialog
2. Panel path: `QueryPanelModule` reply handlers → `operationInsertOrUpdate`
3. `QueryBaseModule.addResponse(queryId, responseData)` updates state and DOM
4. `panelModule.refresh()` / `render()` syncs list

**Collator quick reply (panel + dialog):**

- Collators default to `globalQuickReplyMode: true`
- Buttons: `Approved`, `Pending`, `TS Notes` (from `roleConfigResponses`)
- `Approved` / `Pending` → immediate `submitQuickReply` and close
- `TS Notes` (or buttons containing `add`, `instruction`, `notes`) → reveal free-text input

**Key methods:**

- `QueryBaseModule.addResponse(queryId, responseData)`
- `QueryBaseModule.updateQueryOrCommentItem(queryId, updates)`
- `QueryPanelModule.refresh(hardReload)` — `hardReload` triggers `loadQueriesFromDOM()`
- `QueryTemplates.renderQuickReplyButtonRow()`
- `QueryTemplates.isFreeTextQuickReplyButton(text)`

## 3. DELETE

Remove a query, comment, or response.

**Flow:**

1. Click `.delete-btn` / `.delete-reply` or context menu `DELETE_QRY`
2. `QueryBaseModule.evtDelete(e)` resolves target from `data-query-id` / panel structure
3. DOM marker removed or marked deleted; state maps updated; counts refreshed

**Key methods:**

- `QueryBaseModule.evtDelete(e)` (bound globally in `setupGlobalEventListeners`)
- Panel delete helpers inside `QueryPanelModule`

## 4. RESTORE

Recover query markers missing from the live document using backup sources.

**Flow:**

1. `QueryRestoreModule` scans backup contexts (`original`, `aqBackup`, `aqOriginal`)
2. Compares against live editor DOM
3. Re-inserts missing markers with preserved metadata when configured

**Key methods:**

- `QueryRestoreModule.initialize()` — registered as lazy `queryRestore`
- Restore/load helpers on `QueryRestoreModule` (see class in `query.js`)

## 5. PANEL LOAD / REFRESH

Sync panel list from editor DOM.

**Flow:**

1. `QueryPanelModule.initialize()` waits for parent `templates`, TOC section, `editorDocBody`
2. `parent.loadQueriesFromDOM()` parses markers into `parent._state.queries` / `comments`
3. `QueryTemplates` renders items; `switchPanel('query'|'comment')` for tabs

**Key methods:**

- `QueryBaseModule.loadQueriesFromDOM()`
- `QueryBaseModule.getQuery(queryId, process)`
- `QueryPanelModule.switchPanel(panelType)`
- `QueryPanelModule.filterQueries(...)`

## 6. VERIFY (collator)

Collator-only verification stepper over pending queries and comments.

**Entry points:**

- `queryDialog.openVerify(queryId, options)` — `queryId` optional (first queue item)
- `queryModule.openVerifyDialog(queryId, options)` — wrapper for other modules

**Flow:**

1. `buildVerifyQueue()` — pending queries first, then comments (exclude own mail, collator-authored, already decided)
2. `setupVerifyMode(queryId, process, mode)` sets `_verifyMode`, `_verifyQueue`, `_verifyIndex`
3. Dialog opens in reply mode; thread shown via `buildDialogItems`
4. Footer `.dialog-verify-footer.verify-stepper` (single row):
   - Left: `.verify-quick-actions` — `Approved` / `Pending` / `TS Notes`
   - Right: `.verify-nav-actions` — `n of N | Prev | Next`
5. `navigateVerify(delta)` moves queue; `advanceVerifyAfterAction()` auto-advances after quick reply

**Skip rules (`shouldSkipVerifyItem`):**

| Condition | Skip verify? |
|-----------|--------------|
| DOM `data-collation-status="approved"` | Yes |
| DOM `data-collation-status="pending"` (default load stamp) | **No** |
| `lastResponse.sameUserRole` (collator already replied) | Yes |
| Collator-authored comment | Yes |

**Key methods:**

- `QueryDialogModule.buildVerifyQueue()`
- `QueryDialogModule.setupVerifyMode(queryId, process, mode)`
- `QueryDialogModule.updateVerifyStepperChrome(mode)`
- `QueryDialogModule.hasCollatorQuickDecision(item)`
- `QueryDialogModule.canShowVerifyQuickReplies(item, mode)`
- `QueryBaseModule.getCollationPendingQueries()`

**UI rules:**

- In verify mode, body quick buttons hidden (`shouldShowDialogQuickReply` returns false)
- TS Notes reveals hidden input shell (`shouldShowVerifyInputShell`)
- After collator replied (`sameUserRole`), footer shows nav only (no quick buttons)

# Initialization (agent-critical)

## Editor bootstrap order

```
DOMContentLoaded
  → registerDirectModule(querySystem)
  → getModule('querySystem')
       → initialize()           // base: editor, config, role
       → postInitializeModule()
            → initializeSubModules()
                 → AttachmentModule
                 → registerModule queryPanel | queryRestore | queryTemplates
                 → registerModule queryDialog (getQueryDialogModuleConfig)
                 → await getModule × 4
                 → dialogModule.parent = this
                 → window.queryDialog = dialogModule
```

## Track view

- No `moduleSystem` / `queryDialog` registration
- Direct `new QueryPanelModule`, `new QueryTemplates`
- Do not call `queryDialog.open` or `openVerify` without guards

# Parameter naming

| Name | Meaning |
|------|---------|
| `process` | `"comment"` or `"query"` — dialog and insertion type |
| `this._state.queries` | `Map` of open author queries |
| `this._state.comments` | `Map` of comments |
| `SHOW_CONTEXT_GROUP` | Whether `commentQueryGroup` context menu is enabled |
| `roleConfigResponses` | Quick-reply button config for current role/client |
| `_verifyMode` | Collator verify stepper active on dialog |
| `_verifyQueue` | `{ id, process }[]` pending items |

# CKEditor integration

| Command | Source | Purpose |
|---------|--------|---------|
| `ADD_NEW_CMD` | `getQueryDialogModuleConfig().commands` | Context menu Add Comment |
| `ADD_NEW_QRY` | same | Context menu Add Query |
| `add_comment` | `ckeditor/plugins/impact/plugin.js` | Toolbar button |

# File locations

| Path | Role |
|------|------|
| `src/js/query.js` | All classes, `getQueryDialogModuleConfig()`, bootstrap |
| `src/modules/comment_query/` | Canonical documentation (this folder) |
| `docs/query-system-docs.md` | Full workflow and validation reference |
| `src/static/css/Dialogs/QueryCommentModule.scss` | Verify footer single-row styles |

# Pitfalls (do not regress)

1. **`window.queryDialog` as DOM** — `createDialog()` inserts `id="queryDialog"`; browser exposes it on `window` until module reassignment.
2. **Un-awaited `getModule`** — assigns a Promise to `dialogModule`.
3. **DOM `pending` ≠ collator decided** — default load stamp must not block `openVerify` or hide footer.
4. **`_verifyMode` false** — footer stays `d-none`; check skip/queue logic before changing markup.
5. **Do not rename DOM id** `queryDialog` — breaks e2e selectors and id-based convention.

# When editing

- Prefer `this.dialogModule` on `QueryBaseModule` over raw `window.queryDialog` in new code.
- Wrap dialog module methods in try/catch with `ErrorLogTrace` per project conventions.
- After verify/skip changes, smoke: undecided opens footer; approved/sameUserRole/collator-comment skip.
