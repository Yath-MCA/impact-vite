# Add/Edit Affiliation - Developer Guide

See [README.md](./README.md), [QA.md](./QA.md), and [skills.md](./skills.md).

## Architecture

```text
context.js
  -> resolve selected/ancestor .aff
  -> lock/deleted/editable guards
  -> lazy load addEditAffiliationDialog

index.js
  -> showBefore validates the target
  -> showLoop clones the target
  -> affiliation-dom.js loads through inline import() and discovers runtime fields
  -> edit mode clones the selected .aff; insert mode sanitizes and stages one pasted .aff
  -> Edit Field Apply/Revert mutates the clone
  -> footer Update edits the selected .aff; footer Add inserts after the selected anchor
  -> IMPACT_SELECTION._SNAPSHOT({ save: true, unlock: true })
```

## Why Field Names Are Dynamic

Affiliation markup varies by client and document. Do not add selectors or allowlists for names such as `institution`, `country`, or `addr-line`.

The module treats DOM shape as data:

- walks nodes in source order;
- records child-index paths;
- edits individual text nodes or empty non-void leaf elements; and
- derives labels from available DOM metadata.

This keeps new or client-specific affiliation elements editable without code changes.

## `affiliation-dom.js`

### `discoverAffiliationFields(affElement)`

Returns ordered field records for a valid affiliation. Invalid, deleted, removed, or protected-only roots return an empty array.

Text fields retain only their meaningful value in state. Leading and trailing whitespace remain in the source text node and are restored around an applied value.

Empty unknown leaf elements are represented as `nodeKind: 'element'`, allowing a value to be added without inventing an affiliation tag.

### `applyAffiliationFieldValue(root, fieldPath, value)`

Resolves the recorded child-index path against a staged or source affiliation and changes only the target text node or empty leaf. It returns `false` when the path is stale, protected, or not editable.

### `isEditableAffiliation(affElement)`

Returns true when discovery produces at least one field.

## Protected Subtrees

`isProtectedElement` prevents edits inside editor-controlled or logically removed content:

| Marker | Reason |
|--------|--------|
| `contenteditable="false"` | Generated/editor-controlled content |
| `data-pi` | Processing-instruction marker |
| `data-remove`, `data-delete` | Removed or deleted content |
| `data-class` containing `ckcomments` | Comment/query wrapper |
| `data-name="AQ"` or `data-name="query"` | Query content |
| `data-role` containing `query` or `comment` | Query/comment content |

Keep protection rules structural. Do not replace them with a list of valid affiliation field names.

## Dialog State

`editState` is a plain object:

```javascript
{
    affiliation: originalAffiliation,
    stagedRoot: originalAffiliation.cloneNode(true),
    fields: [
        {
            path: [3, 0],
            label: 'Custom Place',
            value: 'North Campus',
            originalValue: 'North Campus',
            nodeKind: 'text',
            index: 0
        }
    ]
}
```

The original affiliation is not mutated during field editing. `newAffiliation` contains either the sanitized staged sibling or `null`; every field also carries `rootType: 'existing' | 'new'`.

## Edit Lifecycle

| Event | Behavior |
|-------|----------|
| Preview segment click | Opens its field in `#aff_active_editor` |
| Preview segment Enter/Space | Opens the same field and applies active-range styling |
| Add to Preview | Validates and sanitizes one pasted `.aff`, generates its ID, and adds its fields to Preview |
| Clear pasted affiliation | Removes the staged sibling without changing the selected affiliation |
| Input | Enables field Apply when draft differs from staged value |
| Field Apply | Writes draft to `stagedRoot`, refreshes Preview, closes Edit Field |
| Field Revert | Restores `originalValue` in `stagedRoot`, refreshes Preview, closes Edit Field |
| Footer Update | In edit mode, applies changed existing fields to the source `.aff` |
| Footer Add | In insert mode, inserts the staged affiliation immediately after the anchor `.aff` |
| Cancel/close | Drops `editState`; source DOM remains unchanged |

Footer Update remains disabled until at least one field differs from its original value. Update is also blocked while a field editor remains open.

## Context Bundle Constraint

`src/modules/standalone/**/context.js` files are concatenated into `global_context_editor.js` as a classic script. Therefore `context.js` must not contain ESM `import` or `export` statements.

The context file has a small local editable-content predicate for menu gating. `index.js` loads the complete field model with a cached inline `import('./affiliation-dom.js')` in `showLoop`.

The unit test `parses as a classic script for the concatenated context bundle` protects this build requirement.

## Safe Rendering

Preview HTML is cloned from sanitized staged DOM. Editable text nodes are replaced with focusable spans created through DOM APIs and populated through `textContent`; no affiliation value is interpolated into an HTML string.

## Error Handling

- Module catch paths call `ErrorLogTrace('AddEditAffiliationModule.<method>', message)`.
- Context catch paths call `ErrorLogTrace('addEditAffiliation.<operation>', message)`.
- Invalid or stale targets fail closed and do not write editor DOM.

## Build Outputs

The `single_module` pipeline emits:

```text
dist/assets/{version}/modules/add_edit_affiliation/
  affiliation-dom.js
  context.js
  index.js
  messages.json
  template.html
  *.min.js
  *.min.js.map
```

The template is also stored in `dist/assets/{version}/modules/templates.html` under `./add_edit_affiliation/template.html`. Source `styles.scss` is compiled into `dist/assets/{version}/css/dialog_module.css` through the existing global CSS pipeline.

## Extension Rules

- Add new behavior to the generic DOM/path model instead of adding affiliation-tag selectors.
- Keep author xref assignment outside this module unless the feature scope explicitly changes.
- Keep edit and insert state isolated. `show('edit', target)` must hide `#aff_add_section`; `show('insert', target)` must clear old state and show it.
- Preserve the one-sibling limit and use the selected affiliation only as the insertion anchor.
- Preserve the classic-script constraint in `context.js`.
- Add a failing unit test before changing discovery, mutation, or dialog behavior.

