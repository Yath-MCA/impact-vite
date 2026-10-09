---
title: SUPP - Supplementary Material Management
description: Use this skill for supplementary file upload, replacement, query responses, and editor DOM updates.
---

# Instructions

- Module class: `SupplementaryMaterial`; registry ID: `SuppMaterialModule`
- Dialog ID: `#SupplementaryMaterialDialog`; config flag: `SupplimentaryDialog` (note spelling)
- Do not change `data-track-code` values (`suppmat-01`, `suppmat-02`, `suppmat-03`) without updating `ShowTracking_support_data.json`
- PLOS client detection uses `commonMethods.getClientCode({ format: "upper" }) == "PLOS"` — not client config XML

# Operations

## 1. OPEN (`showLoop`)

Opens the supplementary files dialog and sets workflow mode.

**Flow:**
1. `resetState()` — clear staged files, query input, file list
2. `initializeElements()` — bind submit/cancel/file input; scan `.supplementary-material` in editor
3. Determine mode from `queryElement`:
   - **Query workflow** (`query_workflow=true`): query is NOT inside PLOS `[sec-type="supplementary-material"]`; show query tags + `#confirmationInput`; submit label = "Submit your Response"
   - **PLOS CRUD flow** (`isCrudFlow()`): PLOS client + query inside supp section; hide query section; submit label = "Submit"
   - **Standalone**: no `queryElement`; file management only; hide query section
4. `generateFilesList({ mode: 'dialog' })` — render existing files (excludes `sub-article` items)
5. `updateSubmitButtonState()` — enable submit button

**Entry points:**
- Query auto-open: `query.js` → `checkSupportModule()` sets `openSupportModule: "SuppMaterialModule"` when query matches supp pattern AND doc has `.supplementary-material` elements
- PLOS title click: `context.js` → `onContentDomUpdate` → `SuppMaterialModule.show()` when `ISEndOfBlock` on supp section title (journals only)
- Command: `SHOW_SUPP` via `context.js` (`showDialog`)

**Key Methods:**
- `showLoop(queryElement, options)` — main entry (called by `BaseModule.show()`)
- `isCrudFlow(queryElement)` — PLOS section-scoped CRUD detection
- `toggleQueryDiv(show, showInput, hideAddNewItem)` — query section visibility
- `generateQueryTags(queryElement)` — render non-current-user query comments

## 2. ADD (`handleValidFile` add path)

Stage a new supplementary file for upload.

**Flow:**
1. User clicks `#add_files_suppl` → `initiateFileUpload()` sets `_state.lastClickData.action = "add"`
2. Hidden `#fileUploadInputSupp` opens file picker
3. `VALIDATE_UPLOAD_FILE(file, { limit: 100, show_alert: true })` — 100 MB max
4. `handleFileNamingConversion()` — PLOS: `{prefix}.s{NNN}.{ext}`; others: original name
5. Render `.file-upload-item.add` row with file-type select + Summernote caption + **Commands** remarks (reuses replace remarks UI with shared Editor label)
6. Auto label preview: `S{n} {Fig|Table|Movie|Text|Data|File}.` via `getNextLabelNumber({ forItem })` (counts editor + other staged adds of same type)
7. Focus: remarks Summernote inits first with `focus: false`; caption inits second and focuses `#caption_group .note-editable` (re-asserted shortly after so remarks cannot steal focus). Summernote inits immediately (no 500ms delay). Per-field `onFocus`/`onPaste` bind shared `_activeNote` to that input so Caption/Commands paste does not cross-wire (SummernoteManager unchanged).
8. Push to `_state.files` and `formData.files`
9. On submit: `syncReplaceRemarks()` → upload as `New` → `insertFileEntry()` → `createReplaceRemarkCommand(insertedId, remark)` with `data-insert-from='supp-replace-dialog'`

**Editor message on ADD (shared remarks/command path):**
- Same helpers as replace: `createReplaceRemarkArea({ mode: 'add', label })`, `syncReplaceRemarks()`, `createReplaceRemarkCommand()`
- Label: *When adding or replacing supplemental files, please include a message to the Editor explaining the reason for the file addition/replacement.*
- Same label on replace rows (shared `EDITOR_REMARK_LABEL`)
- Mandatory min 5 chars before submit (`invalidEditorMessageWarning` on add)

**Label renumbering:**
- PLOS filename (`.sNNN.`) and S{n} label preview both derive from **active** files only: non-deleted editor `.supplementary-material` nodes plus staged `add` rows in `_state.files` / dialog DOM
- `getActiveSupplementaryFileNames()` — shared source for PLOS `handleFileNamingConversion()` (max active `.sNNN.` + 1; no sticky batch counter)
- `getNextLabelNumber(category, { forItem, ignoreStaged })` — excludes `<del>`-wrapped editor files; staged siblings of the same category get distinct `S{n}` previews; `refreshStagedAddLabelPreviews()` runs on type change / add / remove / editor delete
- Submit uses synced `labelPreview` (or `ignoreStaged` fallback) so panel staging does not inflate DOM labels

**Key Methods:**
- `handleFileUpload(event)` — file input change handler
- `handleValidFile(file, event)` — add/replace branching
- `PanelListUpdates(fileObject)` — append row; init remarks Summernote (`focus: false`) then caption (focus `.note-editable`); column grid matches header (`col-5/2/2/2`, remove in Download col)
- `getFileContentType(name)` — infer Fig/Table/Data/Movie/File from extension (default: `File`)
- `fileTypeSelectHtml()` / `fileLabelPreviewHtml()` — label UI
- `getActiveSupplementaryFileNames` / `getNextLabelNumber` / `refreshStagedAddLabelPreviews` — active-file numbering and unique staged labels
- `createReplaceRemarkCommand` — tracked comment on new caption after insert (same path as replace)

## Dialog row status

| Class | Phase | Badge | Color |
|-------|-------|-------|-------|
| `add` | Staged new upload (pre-submit) | Pending Add | Indigo border/bg |
| `new` | Post-submit new (`data-file-type="new"`) | New File | Emerald border/bg |
| `pending-replace` | Staged replace (pre-submit) | Pending Replace | Orange border/bg |
| `replaced` | Post-submit replace (`data-file-type="replaced"`) | File Replaced | Lime border/bg |

Pre-submit staged rows use `add` / `pending-replace`; post-submit dialog refresh maps editor `data-file-type` to `new` / `replaced` via `generateFileItemHtml()`. Status badges for `new` / `replaced` are informational only — `.replace_file` remains available on those rows so users can replace again after insert or a prior replace.

## 3. REPLACE (`handleValidFile` replace path)

Replace an existing published supplementary file.

**Flow:**
1. User clicks `.replace_file` on existing row (including `new` / `replaced` status rows) → `lastClickData.action = "replace"` with `existingFileId`, `existingFileName`, `existingLabel`
2. File picker opens; validated file pushed to `formData.files`
3. Existing row marked `pending-replace` in-place (no new row); download switches to preview button
4. **Editor message** Summernote injected below row (same long label as ADD); mandatory min 5 chars before submit. On re-replace, existing `data-insert-from="supp-replace-dialog"` comments are loaded via `collectReplaceRemarkCommands()`:
   - **Same user/role:** prefill Summernote; store `data-existing-comment-id` / `existingCommentId`; submit **updates** that comment
   - **Other users:** read-only `query_info` spans with label = `data-rolename` (or `data-role`) + `data-username`; Summernote stays empty for a new remark
5. Extension on displayed name updated if replacement has different extension
6. On submit: `syncReplaceRemarks()` → upload as `Replaced`; `UpdateReplaceFile()` updates editor DOM (including `mimetype` from the new extension via `mimetypeList`); `createReplaceRemarkCommand(elmId, remarkHtml, existingCommentId?, priorRemark?)` inserts or updates tracked comment on caption via `queryModule.operationInsertOrUpdate({ process: 'comment' })`

**Key Methods:**
- `collectReplaceRemarkCommands(suppEl)` — load prior replace remarks from editor commands
- `formatReplaceRemarkLabel()` — build other-user span label (`rolename|role` + `username`)
- `createReplaceRemarkArea()` / `injectReplaceRemarkArea()` — shared remark Summernote UI (same Editor label for ADD and REPLACE; ADD does not auto-focus remarks; replace focuses remarks after pick)
- `syncReplaceRemarks()` — sync remark HTML for both staged add and replace rows (+ `existingCommentId` / `priorRemark` on replace)
- `createReplaceRemarkCommand(elmId, remarkHtml, existingCommentId, priorRemark)` — insert (null id) or update existing tracked comment; used for both ADD and REPLACE (`data-insert-from='supp-replace-dialog'`)
- `UpdateReplaceFile(elmId, extn, fileName, fileUniqueName, response)` — update attrs (`xlink:href` ext, `mimetype` from new ext, sn/on/db-id) + PLOS extension track-changes
- `getPreviewDownloadBtnHtml()` — staged file download before submit

## 4. DELETE (`deleteSupplementaryFile`)

Remove a supplementary file from the editor DOM.

**Flow:**
1. User clicks `.delete_file` → `AlertNewDialog.fire('supply_Delete')`
2. On confirm: row gets `item_deleted` class; `deleteSupplementaryFile(id)` wraps element in tracked `<del>`

**Note:** Delete column is hidden in template (`ds-none`). Code exists but UI is not exposed.

**Key Methods:**
- `handleFileDeletion(target)` — confirmation + DOM wrap
- `deleteSupplementaryFile(ID)` — replace element with `<del>` wrapper

## 5. SUBMIT (`FIRE_SUBMIT`)

Validate, upload files, update editor DOM, and optionally save query response.

**Flow:**
1. `validateSubmit()` — mode-specific rules (see Validation Rules). On exception returns `false` (no silent undefined). Caption/Commands text read via resilient Summernote helpers (`.note-editable` fallback).
2. `syncFileTypeSelections()` / `syncReplaceRemarks()` — collect label type + caption; Editor message / replacement remarks for add and replace (robust ADD row→state match + Summernote read fallbacks)
3. If files staged: build upload params → `FileUploadModule.makeRequest()` via `API_UPLOAD_MULTI`
4. On `results.r == 1`: `appendResponseintoEditor(results)` — `insertFileEntry()` + `createReplaceRemarkCommand()` for New (resolves node via `getById`/DOM; re-reads remark from panel if state empty); `UpdateReplaceFile()` + `createReplaceRemarkCommand()` for Replaced
5. If query workflow: `appendResponse()` → `queryModule.operationInsertOrUpdate({ from: "supp_module" })`
6. `cleanupAndClose()` — close dialog; refresh query panel after 2.5s if query context

**Upload params (`paramsJson`):**
- `subfolder: 'suppl_data'`
- `recordtype: 'SupplementFile'`
- `action_type` — JSON map of filename → `New` | `Replaced`
- `file_type` — array of unique action types
- `upload_data` — JSON array of `{ [orgname]: { action, supp_sn } }`
- **New or replace:** if any existing editor `.supplementary-material` has `data-db-id`, `collectExistingSuppDbPayload()` sends `_id`, `file_sn` (`data-file-sn`), `file_on` (`data-file-on`), `ext` (from sn or on). Replace-target `_id` preferred when replacing; that target’s sn/on are removed via `filterExistingFilesForCurrentReplace`
- Falls back to `updateExistsData()` (query same-user attachment merge) when editor scan finds no `data-db-id`

**Key Methods:**
- `FIRE_SUBMIT()` — submit entry point
- `validateSubmit()` — pre-submit validation
- `insertFileEntry(...)` — new file DOM; sets `data-db-id`, `data-file-sn`, `data-file-on`, `data-file-type="new"`. PLOS caption: user text in `.title`, extension in last `.p` `(EXT)`; empty description `.p` is **not** emitted (omit until real description is wired later via truthy Mustache `description`)
- `UpdateReplaceFile(...)` — replace DOM; sets `data-db-id`, `data-file-sn`, `data-file-on`, `data-file-type="replaced"`, `mimetype` from new extension
- `appendResponse(queryId, response, fileResponse, tempFiles)` — query integration
- `collectExistingSuppDbPayload()` — editor scan → `_id` / `file_sn` / `file_on` / `ext` from `data-file-*`
- `updateExistsData()` — merge prior attachment attrs for same-user query edits (fallback)
- `filterExistingFilesForCurrentReplace()` — drop the file being replaced (by `data-file-on` / `data-file-sn`)
- `getReplaceDbIdFromState()` — thin wrapper returning `collectExistingSuppDbPayload()._id`

# Parameter Naming Rules

| Parameter / Attribute | Meaning | Example |
|-----------------------|---------|---------|
| `data-file-sn` | Server file serial number | `"12345"` |
| `data-file-on` | Original filename on disk | `"article.s001.tif"` |
| `data-folder-name` | Upload folder action | `New` or `Replaced` |
| `data-file-type` | DOM element file state | `new` or `replaced` |
| `data-db-id` | Database record ID from upload response | response `id` |
| `data-user-comment-box` | Query comment text | AQ = author query (`data-name="AQ"`) |
| `data-track-code` | Show Tracking code | `suppmat-01`, `suppmat-02`, `suppmat-03` |
| `xlink:href` | Published supplementary filename | `pgen.1011685.s001.tif` |
| `data-org-name` | Staged file original name (preview rows); replace button on existing rows = published `xlink:href` | browser file name / `pgen.1011685.s001.tif` |

**Separator:** `||` used to combine multi-file attrs on query response elements (`SEPARATORS.FILE_ATTRIBUTES`).

# Case Sensitivity

- `FILE_TYPES`: `New`, `Replaced` (upload action_type)
- DOM `data-file-type`: lowercase `new`, `replaced`
- Label pattern: `S{n} {Type}.` — Type is `Fig`, `Table`, `Movie`, `Text`, `Data`, or `File`

# Client Variants

| Client | Behavior |
|--------|----------|
| **PLOS** | Auto-renamed files (`{prefix}.s{NNN}.{ext}`); rich caption DOM (`plosFileEntry` template); CRUD flow from `[sec-type="supplementary-material"]`; extension diff with track-changes on replace |
| **Other journals** | Original filename kept; hidden `<span class="supplementary-material" content-type="data-supplement">` template (`newClientFileEntry`) |

# Validation Rules

| Rule | Applies when |
|------|--------------|
| File-type select required | New file rows (`.file-upload-item.add`) |
| Editor message required (min 5 chars) | Staged replace rows (`.file-item.pending-replace`) |
| Editor message required (min 5 chars) | Staged add rows (`.file-upload-item.add` → `.supp-replace-remark-input`) |
| Caption min 5 chars (plain text) | New file rows with Summernote caption |
| `#confirmationInput` response required | `query_workflow === true` |
| At least one file in `formData.files` | `query_workflow === false` |
| File size ≤ 100 MB | All uploads via `VALIDATE_UPLOAD_FILE` |
| `suppl_close_dialog` confirmation | Cancel with staged files |

# Tracking Codes (Show Tracking)

| Code | Trigger | Message |
|------|---------|---------|
| `suppmat-01` | `insertFileEntry()` | Supplementary Material File Added |
| `suppmat-02` | `UpdateReplaceFile()` | Supplementary Material File Replaced |
| `suppmat-03` | Delete (if used) | Supplementary Material File Deleted |

Config: `src/js/dialogModules/ShowTracking_support_data.json`

# Query Integration

**Auto-routing pattern** (`query.js` → `checkSupportModule`):
- Document has `.supplementary-material` elements (`suppFilesCount > 0`)
- Query content matches: `/we have received(?: the following)? files for publication as supplementary material/i`
- Sets `openSupportModule: "SuppMaterialModule"`

**Query response attrs:** `data-model: "Supplement"` passed to `operationInsertOrUpdate`.

# Left Panel Floats List (PLOS)

`#losupp` is populated by the supp module via `ModuleRegistry.initializeModule()` → `initialize()` → `generateFilesList({ mode: 'toc' })` → `renderSuppFloatList()`. It is **not** populated by `editor_open.js`.

**Display format:** Label + Caption + filename with extension (from `xlink:href`) — e.g. `S5 Fig. Molecular docking results. article.s005.tif`

**Navigation `data-id`:** `.caption .title` element id (matches `editor_sync_scrollspy.js` scroll-spy / `postNavigation`)

**Source DOM:** `.sec[sec-type="supplementary-material"] .supplementary-material` with `.caption[data-label]` and `.caption .title`

**Skips:** elements inside `<del>` or `.sub-article`

**Refresh:** after submit (`cleanupAndClose`), delete, and `appendResponseintoEditor` via `refreshSuppFloatList()`

**Non-PLOS:** `#supp_items` section hidden

**Cold load:** PLOS client config sets `SuppMaterialModule` with `default-invoke="true"` so the list fills on editor open.

# File Locations

| File | Role |
|------|------|
| `src/modules/supp/index.js` | Main module (`SupplementaryMaterial`); owns `#losupp` via `initialize()` |
| `src/modules/supp/context.js` | Registry, `SHOW_SUPP` command, PLOS click handler |
| `src/modules/supp/template.html` | Dialog template (`#SupplementaryMaterialDialog`) |
| `src/modules/supp/supp.css` | Dialog styles |
| `src/js/editor_sync_scrollspy.js` | `postNavigation`, scroll-spy, `setElmFocus` for supplementary-material |
| `snippet/editor6.html` | `#supp_items` / `#losupp` floats panel section |
| `src/js/query.js` | `checkSupportModule()` routing |
| `src/js/dialogModules/ShowTracking_support_data.json` | Tracking code messages |
| `src/clientconfig/*/config.xml` | `<functionality name="SupplimentaryDialog" show="true"/>` |

# Known Limitations

- Delete button column hidden in UI (`ds-none` in template); `deleteSupplementaryFile` code exists
- `sub-article` supplementary items excluded from file list (`isSubArticleItem`)
- PLOS `pi_info` / ext-link reuse is partially stubbed in `insertFileEntry`
- Legacy methods `handleFileReplacement`, `updateFormData` appear unused by current flow
- Nightwatch tests in `test/supp-material-tests.js` use stale selectors

# Full Documentation

See [README.md](./README.md) for architecture, UI layout, API payload details, and testing references.

**Mirror copy:** [docs/supp/skills.md](../../../docs/supp/skills.md) — keep in sync with this file.
