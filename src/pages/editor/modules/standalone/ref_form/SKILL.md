---
name: ref-form
description: >-
  Use when changing the IMPACT MultiRefModule reference form, reference insert,
  edit, delete, DOI/plain-text import, author handling, citation sync, or
  ref_form context menu behavior.
---

# MultiRef Reference Form

Before editing this module, read:

- [README.md](./README.md) for module purpose, runtime flow, important files, and verification.
- [`context.js`](./context.js) for `ReferenceGroup` command registration, context-menu gating, and delete-reference confirmation flow.
- [`index.js`](./index.js) for `MultiRefModule`, `M_CONFIG`, `M_SCOPE`, `M_FUN`, insert/update operations, DOI/plain-text handling, preview generation, and citation updates. See [README.md § Preview Render Flow](./README.md#preview-render-flow) for how `queueFreshPreviewRender`, `UpdatePreview`, `insertPendingPreviewTemplates`, `findInsertedPreviewNode`, and `Remove_New_Elm` cooperate to render fresh field edits into `#MultiRefDialog`'s preview pane.
- [`template.html`](./template.html) for `#MultiRefDialog`, form controls, footer actions, and preview/query UI ids.
- [`styles.scss`](./styles.scss) when changing dialog layout or control visibility.
- [`docs/graphify-out/GRAPH_REPORT.md`](../../../../docs/graphify-out/GRAPH_REPORT.md) when you need graph-level orientation before touching this large module.

## Hard Rules

1. Preserve the existing `MultiRefModule` global/module contract; do not introduce a replacement reference editor for this flow.
2. Keep command wiring in `context.js` under `ReferenceGroup` unless the menu contract itself is being changed.
3. Reuse existing `M_CONFIG`, `M_SCOPE`, `M_FUN`, `ELEMENTS`, `trackManager`, `GlobalEditor`, `IMPACT_SELECTION`, `CommonUtils`, and `ContextHelpers` patterns.
4. Keep insert, edit, query, and delete behavior separated by existing scope flags such as `INSERT_MODE`, `EDIT_MODE`, `FROM_QRY`, `CURRENT_MODEL`, and `UPDATE_CROSS_CITE`.
5. Route reference insertion and updates through the existing operation helpers, especially `handleReferenceOperation`, `performInsertOperation`, `performUpdateOperation`, and `middlewareUpdate`.
6. Preserve DOI, form-based, and plain-text modes unless the requested change explicitly narrows one of those modes.
7. Preserve track-change semantics by using the existing `trackManager` helpers for inserted/deleted reference content and delimiters.
8. Treat citation synchronization as a linked side effect of reference year/name changes; verify affected `a.xref` behavior when touching `.year`, `.surname`, author groups, or `UPDATE_CITATIONS`.
9. Do not use unsafe raw HTML insertion for user/content-derived strings without reusing the module's existing sanitization/DOM-building path.
10. Use `ref_logError` or the surrounding `ErrorLogTrace` convention in catch paths.
11. When staging fresh preview content in `insertPendingPreviewTemplates`, always remove any existing `[data-update="key"]` wrapper for that key before inserting a new one — `findInsertedPreviewNode` only patches the first match, so leaving a stale duplicate wrapper behind will show the same template rendered twice in the preview.
12. DOI/URL leaves in insert Form Based (`appendItemToMixedHtml`) and `HandleNewElement` (`ADD_COMMON_ATTR`) must go through `buildReferenceLinkElement` → `hyperLinkDialog.getLinkTypeFromText`. Do not reintroduce local DOI/URI classification, `canAddPubId` / `followExtLik` overrides, or document prefix-frequency rewrite.
13. EDIT_MODE fresh preview must omit computed prefix/suffix when the same delimiter text already exists before the next DOI/URL leaf **or after the insert wrapper** (`omitExistingPreviewAffixes`). Keep the document delim; do not stamp a duplicate inside `<insert data-update>`.

## Verification

For docs-only changes, review links and headings. For code changes, at minimum run:

```txt
node --check src/modules/standalone/ref_form/context.js
node --check src/modules/standalone/ref_form/index.js
```

Manual smoke should cover opening Insert Reference, switching DOI/Form Based/Plain Text modes, inserting a reference with citation, editing an existing reference, deleting a reference from the context menu, and checking linked citation updates for author/year changes.
