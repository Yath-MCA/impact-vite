# Comment Query — Developer Guide

Companion to [README.md](./README.md) and [skills.md](./skills.md).

---

## Track View note

[`editor6TrackView.html`](../../../snippet/editor6TrackView.html) does **not** load `module_main.js`, so `BaseModule` is undefined. Track View `initializeSubModules` builds `queryPanel` / templates directly and **skips** `queryDialog` when `BaseModule` is missing (readonly panel still works). Editor pages load `module_main` and register the full query dialog stack.

Boot order: session gate → CKEditor `instanceReady` → `EditorBootInit.runQuery` (see [`editorBootInit.js`](../../js/editorBootInit.js)).

---

## Class and key methods

### QueryBaseModule

**Files:** [`src/query-comment-system/`](../../query-comment-system/) (see README for per-class files)

| Method | Role |
|--------|------|
| `initialize()` | Wait for editor, load config, set role state |
| `postInitializeModule()` | Call `initializeSubModules()` on editor |
| `initializeSubModules()` | Register panel, restore, templates, dialog submodules |
| `loadConfiguration()` | Read `commentQueryGroup`, role responses from `I_CONFIG` |
| `loadQueriesFromDOM()` | Parse editor markers into `_state.queries` / `comments` |
| `getQuery(queryId, process)` | Resolve item from state maps |
| `getAllQueries()` | All query objects from state |
| `getCollationPendingQueries()` | Queries needing collator verify (see below) |
| `openVerifyDialog(queryId, options)` | Wrapper → `queryDialog.openVerify` |
| `operationInsertOrUpdate(...)` | Central save path for dialog/panel/workflows |
| `createQuery(queryData)` | Insert new query/comment marker |
| `addResponse(queryId, responseData)` | Append response to query |
| `updateQueryOrCommentItem(queryId, updates)` | Patch state + DOM |
| `evtFromEditor(e, query)` | Open dialog on marker click |
| `evtDelete(e)` | Global delete handler |
| `validateSubmitOptions(options, payload)` | Demand-based submit validation |
| `persistFinalQuerySnapshot()` | Pre-signoff DB persist |

### QueryPanelModule (~line 5052)

| Method | Role |
|--------|------|
| `initialize()` | Bind panel DOM, wait for parent templates |
| `render()` / `refresh(hardReload)` | Rebuild panel list |
| `switchPanel(panelType)` | Query vs comment tab |
| `filterQueries(...)` | Status/role filters |
| `handleTabClick` | `#addcmt` → open dialog |
| `quickButtonHandler` | Panel quick-reply submit |
| `setReplyMode(mode)` | Toggle `globalQuickReplyMode` |

### QueryDialogModule (~line 9148)

| Method | Role |
|--------|------|
| `createDialog()` | Insert `#queryDialog` markup + verify footer |
| `open(queryId, process, options)` | Main entry |
| `openVerify(queryId, options)` | Collator verify queue entry |
| `showLoop(queryId, process, options)` | Render thread + input; calls `setupVerifyMode` |
| `save()` | Build payload → `operationInsertOrUpdate` |
| `buildDialogItems(process, mode)` | Thread HTML |
| `buildDialogInputForm(mode)` | Reply input / collator quick UI |
| `handleDialogQuickReply(e)` | Footer/body quick button handler |
| `ensureVerifyStepperChrome()` | Create/relocate `.verify-stepper` footer |
| `updateVerifyStepperChrome(mode)` | Show footer, quick buttons, nav state |
| `buildVerifyQueue()` | Pending queries + comments queue |
| `setupVerifyMode(queryId, process, mode)` | Enable `_verifyMode` |
| `clearVerifyMode()` | Disable stepper |
| `navigateVerify(delta)` | Prev/Next |
| `advanceVerifyAfterAction()` | Auto-advance after quick reply |
| `hasCollatorQuickDecision(item)` | Skip if approved DOM or collator replied |
| `shouldSkipVerifyItem(item)` | Decision + collator-authored comment |
| `canShowVerifyQuickReplies(item, mode)` | Hide quick when edit or sameUserRole |
| `isCollatorAuthoredComment(item)` | Comment by collator role |

### QueryTemplates (~line 8164)

| Method | Role |
|--------|------|
| `setUpParentKeys()` | Bind role, collator, quick reply config |
| `renderQuickReplyButtonRow(buttons)` | HTML for Approved/Pending/TS Notes |
| `shouldShowDialogQuickReply(mode)` | Body quick buttons (false in verify mode) |
| `shouldShowVerifyInputShell(mode)` | Hidden textarea for TS Notes in verify |
| `isFreeTextQuickReplyButton(text)` | `add` / `instruction` / `notes` → free text |
| `renderItemWithMode(item, isComment)` | Panel list item HTML |

### QueryRestoreModule (~line 6572)

Backup scan, compare live DOM, re-insert missing markers.

### AttachmentModule (~line 3763)

`setupFileInput`, `validateFile`, `uploadFiles`, `normalizeAttachments` for dialog and panel.

### QueryUtils (~line 9097)

Static helpers: debounce, fetch, sanitize.

---

## Initialization order

```
DOMContentLoaded
  → registerDirectModule('querySystem', QueryBaseModule)
  → getModule('querySystem')
       → initialize()
       → postInitializeModule()
            → new AttachmentModule()
            → registerModule: queryPanel, queryRestore, queryTemplates (lazy)
            → registerModule: queryDialog (onthefly, getQueryDialogModuleConfig)
            → await getModule × 4
            → dialogModule.parent = queryModule
            → window.queryDialog = dialogModule
```

`getQueryDialogModuleConfig()` at bottom of `query.js` defines `commands`, `contextMenuHandler`, template path.

---

## Demand-based submit validation

Validation rules are **per-open**, not global.

```
Caller → queryDialog.open(null, process, options)
       → showLoop stores options in dialog._options
       → save() → operationInsertOrUpdate(..., { options: submitOptions })
       → validateSubmitOptions(...)
```

| Option | Meaning |
|--------|---------|
| `isAttachmentRequired` | Block save without attachment |
| `hasAllowedMultipleAttach` | When `false`, only one file |
| `isInputContentRequired` | Block save with empty text |
| `hasContentLimit` | Apply `contentRules` length checks |
| `forceOpen` | Open despite normal gates |
| `addFlag` / `addAttr` | Workflow DOM flags |

Example (figures workflow):

```javascript
window.queryDialog.open(null, 'comment', {
    forceOpen: true,
    isAttachmentRequired: true,
    hasAllowedMultipleAttach: true,
    isInputContentRequired: contentRequired,
    hasContentLimit: false
});
```

---

## Collator quick reply

| Setting | Behavior |
|---------|----------|
| `globalQuickReplyMode` | Collators default `true` in `setUpParentKeys` |
| `quickReplyButtons` | From `roleConfigResponses.responses` |
| Panel | Buttons inline on list items |
| Dialog (non-verify) | `buildDialogInputForm` shows quick row |
| Dialog (verify) | Quick in footer; body shows hidden shell for TS Notes |

Free-text buttons: text contains `add`, `instruction`, or `notes` (`isFreeTextQuickReplyButton`).

---

## Collator verify internals

### Queue (`buildVerifyQueue`)

1. `getCollationPendingQueries()` → sorted query entries `{ id, process: 'query' }`
2. Filter `shouldSkipVerifyItem`
3. Comments from `_state.comments` — exclude current user mail, collator-authored, skipped
4. Concatenate: queries first, then comments

### Pending query filter (`getCollationPendingQueries`)

```javascript
// Exclude:
// - DOM data-collation-status === 'approved'
// - state collationStatus === 'approved'
// - lastResponse.sameUserRole (collator already replied)
// Include:
// - state pending|holding (even if DOM has default 'pending' stamp)
```

### Skip decision (`hasCollatorQuickDecision`)

```javascript
// Skip when:
// - DOM data-collation-status === 'approved'
// - lastResponse.sameUserRole
// Do NOT skip for DOM 'pending' alone (default load stamp)
```

On collator load, queries with `lastResponse` get default DOM stamp:

```javascript
// query.js ~1936-1944
collationStatus = /approved|verified|resolved/i.test(content) ? 'approved' : 'pending';
$(node).attr('data-collation-status', collationStatus);
```

### Verify footer DOM

```html
<div class="verify-stepper dialog-verify-footer d-none px-3 py-2">
    <div class="verify-quick-actions"></div>
    <div class="verify-nav-actions">
        <span class="verify-stepper-count"></span>
        <button class="verify-prev-btn">Prev</button>
        <button class="verify-next-btn">Next</button>
    </div>
</div>
```

Styles: [`QueryCommentModule.scss`](../../static/css/Dialogs/QueryCommentModule.scss) — `.dialog-verify-footer.verify-stepper` single flex row, quick left, nav `margin-left: auto`.

### Verify state

| Property | Role |
|----------|------|
| `_verifyMode` | Stepper active |
| `_verifyQueue` | `{ id, process }[]` |
| `_verifyIndex` | Current position |

`showLoop` calls `setupVerifyMode` unless `options.skipVerifyRebuild` (nav/advance paths).

---

## Configuration

| Source | Key |
|--------|-----|
| `I_CONFIG` | `commentQueryGroup` children |
| `IsContextMenu('commentQueryGroup')` | `SHOW_CONTEXT_GROUP` |
| `roleBasedResponses` | Per-role quick reply buttons |
| Client XML | `responses_*` keys per role/client |

---

## Globals

| Global | Type |
|--------|------|
| `window.queryModule` | `QueryBaseModule` |
| `window.queryModule.dialogModule` | `QueryDialogModule` |
| `window.queryDialog` | `QueryDialogModule` (must not be HTMLElement) |
| `MODULE_LIST.queryDialog` | Legacy instance map |

---

## Related files

| File | Role |
|------|------|
| [`src/query-comment-system/`](../../query-comment-system/) | Split runtime sources (concat at build) |
| [`src/static/css/Dialogs/QueryCommentModule.scss`](../../static/css/Dialogs/QueryCommentModule.scss) | Panel + verify footer |
| [`snippet/editor6.html`](../../../snippet/editor6.html) | `#addcmt`, panels |
| [`docs/query-system-docs.md`](../../../docs/query-system-docs.md) | Reply modes, role matrix, UI specs |

---

## When changing verify/skip logic

Smoke checklist:

1. Undecided closed query (author last reply) → `openVerify` shows single-row footer with quick + nav
2. DOM `approved` → skipped from queue
3. Collator Pending reply (`sameUserRole`) → skipped
4. Collator-authored comment → skipped
5. Prev/Next disabled at queue ends
6. After Approved quick reply → auto-advance or close
