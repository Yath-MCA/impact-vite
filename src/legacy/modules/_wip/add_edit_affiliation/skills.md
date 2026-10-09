---
title: ADD/EDIT AFFILIATION - Runtime DOM field editor
description: Structure-preserving affiliation editing with runtime field discovery, staged Preview updates, and final source commit.
---

# Instructions

- Module class: `AddEditAffiliationModule`
- Registry ID: `addEditAffiliationDialog`
- Dialog ID: `#AddEditAffiliationDialog`
- Command: `addEditAffiliation` under `AuthorGroupModule`
- Edit layout: **Edit Field -> Preview -> Cancel/Update footer**; `#aff_add_section` is hidden.
- Insert layout: **Add Another Affiliation -> Preview -> Cancel/Add footer**; the selected `.aff` is the insertion anchor.
- It does not alter author affiliation xrefs.
- Never hard-code affiliation child names such as `institution`, `country`, or `addr-line`.
- Discover fields from the selected affiliation DOM in document order.
- Use child-index paths to address unknown or repeated structures.
- Skip PI, query/comment, non-editable, removed, and deleted subtrees.
- Keep dynamic values out of raw HTML; use DOM creation and `textContent`.
- Field Apply changes staged state only; footer Update writes changed paths to the source affiliation.
- Field Revert restores the original value, refreshes Preview, and closes Edit Field.
- Cancel discards staged state without changing source DOM.
- Footer Update is blocked while an Edit Field is open.
- On successful Update, call `IMPACT_SELECTION._SNAPSHOT({ save: true, unlock: true })`.
- On successful insert, stamp only the inserted clone with `affiliation_dialog_01`, `data-time`, `data-username`, and `data-rolename`.
- Never stamp staged, cancelled, or edit-mode affiliations with the insertion tracking code.
- `context.js` is concatenated into a classic script. Do not add `import` or `export` syntax there.
- `index.js` must load `affiliation-dom.js` with its cached inline dynamic import; do not restore a top-level static import.
- Log catch paths with `ErrorLogTrace`.

# Operations

## 1. Context Eligibility

1. Resolve the selected element or closest `div.aff` / `[data-name="aff"]`.
2. Ask `paraLock` whether the selection is locked.
3. Reject `data-remove` and `data-delete` targets.
4. Require at least one editable text node or empty non-void leaf outside protected subtrees.
5. Return `addEditAffiliation: CKEDITOR.TRISTATE_OFF`.

## 2. Open

1. `showBefore` resolves and validates the source affiliation.
2. `showLoop` dynamically loads DOM helpers and clones the source into `stagedRoot`.
3. `discoverAffiliationFields(stagedRoot)` returns ordered path records.
4. Store `value` and `originalValue` for dirty detection.
5. Render cloned affiliation HTML and replace editable ranges with focusable spans using safe DOM APIs.
6. A valid pasted `.aff` is sanitized, assigned the next `AF` ID, and staged as one new sibling.

## 3. Edit Field

- Preview click or Enter/Space -> `openField(index)` and active-range highlight.
- Input -> enable Apply when draft differs from staged value.
- Apply -> `applyAffiliationFieldValue(stagedRoot, path, draft)` -> update field value -> render Preview -> collapse.
- Revert -> apply `originalValue` to `stagedRoot` -> render Preview -> collapse.

## 4. Footer Update

1. Reject missing/detached targets and an open Edit Field.
2. For each dirty field, resolve the same path against the original affiliation.
3. Change only the target text node or empty leaf.
4. Preserve the `.aff` node, attributes, child elements, and protected nodes.
5. Save/unlock snapshot and close.

# Dynamic Field Rules

```text
label = data-name -> first non-aff class -> tag name -> Text
value = trimmed meaningful text
identity = child-index path from .aff root
```

Editable targets:

- non-whitespace text nodes; and
- empty non-void leaf elements.

Protected targets:

- `contenteditable="false"`
- `[data-pi]`
- `[data-remove]`
- `[data-delete]`
- `data-class` containing `ckcomments`
- `data-name` equal to `AQ` or `query`
- `data-role` containing `query` or `comment`
- HTML void elements

# Key Methods

## DOM helper

- `discoverAffiliationFields`
- `applyAffiliationFieldValue`
- `isEditableAffiliation`
- `resolveAffiliationNode`

## Dialog

- `resolveAffiliationNode`
- `showBefore`
- `showLoop`
- `renderPreview`
- `openField`
- `handleFieldApply`
- `handleFieldRevert`
- `isDirty`
- `handleFire`
- `handleCancel`

# Verification

```powershell
npx vitest run tests/unit/add_edit_affiliation
npx jshint src/modules/standalone/add_edit_affiliation/affiliation-dom.js src/modules/standalone/add_edit_affiliation/context.js src/modules/standalone/add_edit_affiliation/index.js
npx gulp local
```

Expected focused result: all affiliation tests pass; JSHint exit 0; local build exit 0.

# Do Not

- Do not replace runtime traversal with a field-name allowlist.
- Do not replace the complete `.aff` via `innerHTML`.
- Do not expose PI/query/comment nodes as editable fields.
- Do not update contributor xrefs as a side effect of affiliation text editing.
- Do not introduce ESM syntax in `context.js`.
- Do not claim the repository-wide unit suite is green while its unrelated baseline failures remain.

