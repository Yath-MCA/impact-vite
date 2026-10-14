# Supplementary Material Module

Manages supplementary file upload, replacement, download, and linked author-query responses in the IMPACT editor.

**Agent runbook:** [skills.md](./skills.md)

---

## Files

| File | Role |
|------|------|
| `index.js` | `SupplementaryMaterial` class — dialog logic, upload, editor DOM updates |
| `context.js` | Module registry (`SuppMaterialModule`), `SHOW_SUPP` command, PLOS click handler |
| `template.html` | Dialog markup (`#SupplementaryMaterialDialog`) |
| `styles.css` | Dialog and file-list styles |
| `skills.md` | Agent/development runbook |

---

## Purpose

Authors and production staff use this module to:

- View existing supplementary files already in the document
- Upload new supplementary files with label type and caption
- Replace existing supplementary files
- Respond to author queries about supplementary material
- Sync uploaded files into the editor DOM with tracking metadata

---

## Module Registration

| Setting | Value |
|---------|-------|
| Registry ID | `SuppMaterialModule` |
| Class | `SupplementaryMaterial` |
| Webpack entry | `src/modules/supp/index.js` (auto-discovered) |
| Load type | `ondemand` |
| Config flag | `<functionality name="SupplimentaryDialog" show="true"/>` |
| Dialog group | `SupplimentaryDialog` |

Enabled for most journal clients (LWW, Medknow, OUP, Brill, NIHr, Intellect, Sandbox, TNF, etc.). Medknow/OUP also enable `SuppMaterialModule` with `default-invoke="true"`.

---

## Architecture

```
Entry Points                    Dialog                         Backend
─────────────                   ──────                         ───────
Query auto-open ──┐
PLOS title click ─┼──► showLoop() ──► File ops ──► FIRE_SUBMIT() ──► FileUploadModule (API_UPLOAD_MULTI)
SHOW_SUPP command ┘              Query UI              │
                                                      ├──► insertFileEntry / UpdateReplaceFile
                                                      └──► queryModule.operationInsertOrUpdate
```

### Workflow modes

| Mode | Trigger | Query UI | Submit label |
|------|---------|----------|--------------|
| **Query workflow** | Query reply with supp pattern + doc has supp files | Visible | "Submit your Response" |
| **PLOS CRUD** | PLOS client, query inside `[sec-type="supplementary-material"]` | Hidden | "Submit" |
| **Standalone** | Direct open (no query element) | Hidden | "Submit" |

---

## How the Dialog Opens

### 1. Query auto-open

When a user opens a query reply, `query.js` → `checkSupportModule()` checks:

1. Document has at least one `.supplementary-material` element
2. Query content matches: `we have received ... files for publication as supplementary material`

If both match, `openSupportModule` is set to `"SuppMaterialModule"`. `showBeforeloop()` calls `SuppMaterialModule.show(el, { FROM_QRY: true })` before the standard query dialog.

### 2. PLOS title click (journals)

`context.js` registers `onContentDomUpdate` listener. On click within a supplementary-material section title (`[sec-type="supplementary-material"]` + `.title`), when `ISEndOfBlock` is true, calls `SuppMaterialModule.show()`.

### 3. SHOW_SUPP command

Registered in `context.js` as `showDialog` action (context menu integration; `ignore_menu: true`).

---

## UI Layout

Dialog: `#SupplementaryMaterialDialog`

### File list header

| Column | Content |
|--------|---------|
| Filename (col-5) | Published or staged file name |
| Label (col-2) | `S{n} {Type}.` label or existing label |
| Replace (col-2) | Replace button (existing files only) |
| Download (col-2) | Download published or preview staged file |
| Delete (col-1) | Hidden (`ds-none`) — not exposed in UI |

### Query section (`.supp_query_section`)

- **Query:** `.Query_Contents` — rendered query tags from other users/roles
- **Query Response:** `#confirmationInput` — current user's response text

### Footer

| Element | ID | Action |
|---------|-----|--------|
| Add New File | `#add_files_suppl` | Open file picker for new upload |
| Cancel | `#cancel_suppl` | Close dialog (confirms if files staged) |
| Submit | `#supply_submit` | Validate and upload |

Hidden file input: `#fileUploadInputSupp`

---

## Current Features

### File listing

- Scans editor DOM for `.supplementary-material` elements
- Excludes items inside `.sub-article`
- Shows filename, label, replace button, and download link per file
- Deleted items shown with `item_deleted` class

### Download

- **Published files:** `constructDownloadUrl()` → `{API_PATH}filedownload?appkey=xmleditor&file_sn=...&docid={DOC_ID}/suppl_data/&file_on=...`
- **Staged files (pre-submit):** client-side `URL.createObjectURL()` download

### Add new file

- File picker via hidden input
- 100 MB size limit (`VALIDATE_UPLOAD_FILE`)
- File-type select: Fig, Table, Movie, Text, Data, File
- Auto label preview (`S{n} {Type}.`) based on extension and existing labels
- Summernote caption editor (min 5 characters plain text)
- PLOS: auto-renamed to `{prefix}.s{NNN}.{ext}` pattern

### Replace file

- Click replace icon on existing row
- Staged in-place (`pending-replace` class); retains existing label
- Extension on displayed name updates if replacement differs
- Upload action type: `Replaced`

### Remove staged file

- Trash icon on `.file-upload-item` rows removes from `_state.files` and `formData.files` before submit

### Query response

- Displays query comments from other users/roles
- Pre-fills current user's existing response for editing
- Submits via `queryModule.operationInsertOrUpdate` with `data-model: "Supplement"`
- File attachments included in query response when files are staged

### Editor DOM updates

**New files** (`insertFileEntry`):
- PLOS: full `<div class="supplementary-material">` with caption, title, extension paragraph
- Other clients: hidden `<span class="supplementary-material" content-type="data-supplement">`
- Sets `data-track-code: suppmat-01`

**Replaced files** (`UpdateReplaceFile`):
- Updates `xlink:href`, `data-file-sn`, `data-db-id`, `data-file-type: replaced`
- PLOS: tracked extension diff in caption paragraph (`suppmat-02`)

### Dialog guards

- Cancel with staged files: `AlertNewDialog.fire('suppl_close_dialog')`
- Delete confirmation: `AlertNewDialog.fire('supply_Delete')`
- Validation highlights on missing label, caption, or query response

### Show Tracking

| Code | Event |
|------|-------|
| `suppmat-01` | New supplementary file inserted |
| `suppmat-02` | Supplementary file replaced |
| `suppmat-03` | Supplementary file deleted |

Configured in `src/js/dialogModules/ShowTracking_support_data.json`.

### Left panel — Supplementary File List (PLOS)

For PLOS documents, the floats panel (`#lof_list`) includes a **Supplementary File List** section (`#supp_items` / `#losupp`).

- Populated by `ModuleRegistry` → `SuppMaterialModule.initialize()` → `generateFilesList({ mode: 'toc' })` → `renderSuppFloatList()`
- `data-id` on list rows uses `.caption .title` id (aligned with scroll-spy in `editor_sync_scrollspy.js`)
- Display text: **Label + Caption** — e.g. `S5 Fig. Molecular docking results.`
- Refreshes after submit, delete, and editor DOM updates via `refreshSuppFloatList()`
- Hidden for non-PLOS clients and when no supplementary files exist
- PLOS config uses `default-invoke="true"` on `SuppMaterialModule` for cold editor load

---

## Upload API

Uses `FileUploadModule` with endpoint `API_UPLOAD_MULTI`.

### Request parameters (`paramsJson`)

```javascript
{
  subfolder: 'suppl_data',
  recordtype: 'SupplementFile',
  action_type: '{"original-name.pdf":"New","other.tif":"Replaced"}',  // JSON string
  file_type: ['New', 'Replaced'],
  upload_data: '[{"original-name.pdf":{"action":"New","supp_sn":"article.s002.pdf"}}]',  // JSON string
  // When same-user re-upload:
  _id: '...',
  file_sn: ['...'],
  file_on: ['...'],
  ext: ['...']
}
```

### Response handling

On `results.r == 1`:
- `results.file_sn`, `results.file_on`, `results.ext`, `results.action_type` drive DOM insertion
- `results.id` stored as `data-db-id`

---

## Supported MIME Types

From `mimetypeList` in `index.js`:

| Extension | MIME type |
|-----------|-----------|
| xlsx, xls, sheet, document | Excel formats |
| tiff, tif | `image/tiff` / `image/tif` |
| jpg | `image/jpeg` |
| png | `image/png` |
| mp4 | `video/mp4` |
| zip | `application/zip` |
| (other) | `application/octet-stream` |

### Auto content-type inference (`getFileContentType`)

| Extensions | Type |
|------------|------|
| jpg, jpeg, png, tif, tiff, gif, bmp, svg | Fig |
| xlsx, xls | Table |
| zip | Data |
| mp4, mov, avi, webm, mkv | Movie |
| pdf, doc, docx, txt, csv, rtf | File |
| (other) | File |

---

## Client Variants

### PLOS

- File naming: `{articlePrefix}.s{NNN}.{ext}` (e.g. `pgen.1011685.s001.tif`)
- Rich DOM template with caption, title, extension paragraph
- CRUD workflow when opened from supplementary-material section
- Extension change on replace uses tracked `<ins>`/`<del>` in caption

### Other journals

- Original browser filename preserved
- Minimal hidden `<span>` DOM entry
- Standard query workflow for author responses

---

## Testing References

| Resource | Notes |
|----------|-------|
| `src/modules/supp/test/supp-material-tests.js` | Nightwatch E2E tests — selectors partially stale |
| `src/static/workflows/workflows.json` | `supp` workflow entry |
| `docs/supp-material.md` | Top-level pointer to `docs/supp/` docs |
| `tests/unit/supp/suppFileList.test.js` | Unit tests for list extraction helpers |

---

## Related Code

| Location | Role |
|----------|------|
| `src/js/query.js` | `checkSupportModule()`, `showBeforeloop()` |
| `src/js/editor_sync_scrollspy.js` | `postNavigation`, scroll-spy for `#losupp` |
| `snippet/editor6.html` | `#supp_items` / `#losupp` HTML section |
| `src/js/commonEvtHandler.js` | `SupplementaryMaterialDialog` in allowed dialogs list |
| `src/modules/module_main.js` | `BaseModule.show()` → `showLoop()` |

---

## Known Limitations

- Delete UI column hidden; delete logic exists but is not user-facing
- `sub-article` supplementary items excluded from dialog file list
- PLOS ext-link / `pi_info` reuse partially implemented
- Legacy methods (`handleFileReplacement`, `updateFormData`) not used by current flow

---

**Mirror copy:** [docs/supp/README.md](../../../docs/supp/README.md) — keep in sync with this file.
