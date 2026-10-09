# MultiRef Reference Form

**Agent runbook:** [SKILL.md](./SKILL.md)  
**Workflow documentation:** [ref-form-frmqry-workflow.md](../../../../docs/editor-workflows/ref-form-frmqry-workflow.md)  
**Graphify output:** [GRAPH_REPORT.md](../../../../docs/graphify-out/GRAPH_REPORT.md) | [graph.html](../../../../docs/graphify-out/graph.html)

`ref_form` is the legacy MultiRef reference dialog used to insert, edit, query-update, and delete bibliography references from the IMPACT editor. It owns the `#MultiRefDialog` UI, maps reference XML/HTML into form fields, rebuilds the preview, applies tracked reference changes, and optionally updates linked citations.

## Files

| File | Role |
|------|------|
| `context.js` | Registers `MultiRefModule` with `ContextHelpers`, exposes `ReferenceGroup` commands, gates context-menu visibility, and handles delete-reference confirmation. |
| `index.js` | Main `MultiRefModule` implementation: mappings, validation, DOI/plain-text import, form-to-preview conversion, insert/update/delete support, query response handling, author delimiters, tracking, and citation sync. |
| `template.html` | Dialog shell for reference type selection, DOI/plain-text/form modes, author rows, query response fields, footer buttons, and preview panel. |
| `styles.scss` | Dialog styles for the reference form, preview, field state, and mode-specific visibility. |
| `sample.json` | Small sample data used by this module area. |

## Module Registration

| Setting | Value |
|---------|-------|
| Module/global | `MultiRefModule` |
| Registry ID | `MultiRefModule` |
| Dialog ID | `#MultiRefDialog` |
| Group | `ReferenceGroup` |
| Script path | `./ref_form/index.js` |
| Template path | `./ref_form/template.html` |

Registered commands:

| Command | Action | Purpose |
|---------|--------|---------|
| `MULTI_REF_FORM_QRY` | `query` | Open the reference form from a missing/query workflow. |
| `GOTO_CITE_MENU` | `gotoCite` | Jump from a reference to linked citations. |
| `MULTI_REF_FORM_OPEN` | `open` | Insert a new reference. |
| `MULTI_REF_FORM_EDIT` | `edit` | Edit an existing reference through the full form. |
| `DEL_R_ITEM_MENU` | `deleteRef` | Confirm and delete a reference. |

## Runtime Flow

1. `context.js` registers the module on `DOMContentLoaded`.
2. Toolbar/menu actions call `GlobalEditor.execCommand("MULTI_REF_FORM_OPEN")` or the context-menu command handler.
3. `executeCommand` resolves the current selection through `IMPACT_SELECTION` and `CommonUtils`, then calls `window.MultiRefModule.show(id, params)`.
4. `showBefore` and `showLoop` initialize `trackManager`, config, scope flags, cloned reference DOM, current mode, and dialog fields.
5. Users work in DOI, Form Based, or Plain Text mode; `template.html` ids are consumed by `ELEMENTS` and `M_FUN` handlers.
6. Insert/update operations pass through `handleReferenceOperation`, then `performInsertOperation` or `performUpdateOperation`.
7. Reference DOM updates use existing delimiter, author-group, validation, and tracking helpers.
8. When configured author/year changes require it, `UPDATE_CITATIONS` updates linked `a.xref` citation text.

## Preview Render Flow

1. A field edit/input triggers `mFunScope.queueFreshPreviewRender(TARGET_ID)` (the DTD-mapped id).
2. It computes `pendingKeys` from `M_CONFIG.NewElm`, sorts them by `STYLE_ORDER`, and sweeps `Remove_New_Elm(key)` for each pending key to clear any stale preview wrapper.
3. It sets `M_SCOPE.FRESH_RENDER_KEYS = pendingKeys`, then calls `UpdatePreview()` inside a `try/finally` so `FRESH_RENDER_KEYS` always resets to `[]` afterward, even on error.
4. `UpdatePreview` sorts `renderEntries` by `STYLE_ORDER` and calls `insertPendingPreviewTemplates(renderEntries, self)`, which stages a `<insert data-update="key">` wrapper per fresh key, positioned via `STYLE_ORDER`-based anchor lookup — before inserting, it removes any existing `[data-update="key"]` node first (editor keys use a `^=` prefix match; all other keys use an exact match) to prevent duplicate wrappers.
5. `UpdatePreview`'s per-entry loop then finds that staged wrapper via `findInsertedPreviewNode(key, self)` (`querySelector`, first match) and patches its prefix/template/suffix content with `replaceChildren`.

`findInsertedPreviewNode` only ever returns the *first* matching `[data-update="key"]` node — the dedup step in `insertPendingPreviewTemplates` is what keeps that assumption valid. Any change to this pipeline that can leave more than one wrapper alive per key will silently show stale duplicate content in the preview.

## Important Concepts

`GlobalAttributes` and `templateStringCollection` define the JATS-like span structure used for references and citations.

`elMapping` links reference elements to form controls, style ids, DTD-dependent field names, moved groups, titles, mandatory validation labels, and citation-update fields.

`M_SCOPE` carries lifecycle state such as insert/edit/query mode, current model, current reference id, cloned reference DOM, query state, and citation-update flags.

`M_FUN` is the module's method group for dialog mapping, DOI fetch, plain-text parsing, preview updates, validation, query response handling, author delimiter updates, and citation sync.

The Graphify report already exists at `docs/graphify-out`. Use it for orientation around the module's large function graph, but keep source-of-truth behavior in `context.js`, `index.js`, and `template.html`.

## Verification

Docs-only changes can be verified by checking links and relative paths. Code changes should start with syntax checks:

```txt
node --check src/modules/standalone/ref_form/context.js
node --check src/modules/standalone/ref_form/index.js
```

Manual smoke coverage should include:

| Area | Expected result |
|------|-----------------|
| Insert Reference | Dialog opens from `#insertRefmenu`; DOI/Form Based/Plain Text modes switch correctly. |
| Insert with citation | A new `.ref` and linked `a.xref` are inserted with expected labels. |
| Edit Reference | Existing `.mixed-citation` loads into fields and updates with tracked changes. |
| Query workflow | Missing/query fields show response controls and update the query when submitted. |
| Delete Reference | Context-menu delete confirms renumber/missing-citation text before `DEL_REF_FIRE`. |
| Citation sync | Author surname/year changes update linked citations only through the existing sync path. |
