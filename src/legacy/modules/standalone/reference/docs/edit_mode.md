# Edit mode — inputs / outputs

Shared open and preview live in [reference_dialog_flow.md](reference_dialog_flow.md). This file is the edit contract. Edit does not use insert method switch, type-switch confirm, or `validateBeforeSubmit()`.

## Runtime path

- Trigger is `REFERENCE_FORM_EDIT` on `.ref` or a child leaf. `resolveRefNode()` walks up to the owning `.ref` before `prepareTemplate({ mode: 'edit' })`.
- Insert-method radios stay hidden. `insertMethod` is `open_form`. Type stays locked to the existing `publication-type`.
- `handleUpdate()` returns immediately when `canSubmit` is false. Otherwise it calls `collectIntoState()`, then `submit()` via `buildEditReferenceDom()`, then `applyBuilt()` onto the live `.ref`.
- After a real change it runs `syncCitationsAfterEdit()` and closes.
- Preview uses the shared full-template rebuild. Submit does not use the insert builder.

## Triggers

| Source | Action |
|--------|--------|
| Context menu `REFERENCE_FORM_EDIT` on `.ref` or a child leaf | `dialog.show('edit', { element \| id })` |

## UI inputs

| Control | Notes |
|---------|--------|
| Insert-method radios | Hidden; forced `open_form` |
| Type | Usually locked to existing `publication-type` |
| Authors / editors / fields | Populated from `prepareTemplate` + document leaves |
| Preview | Live from bridge after debounced edits |

## State keys

`mode: 'edit'`, `refNode`, `refType`, `values`, `fields` (with `original`), `authors`, `editors`, `canSubmit`, `template`, `citationSyncDetails` (via bridge helper)

## Payload / submit state

Built from collected form values + existing `fields`/`original` for track changes:

```js
{
  refNode,
  refType,
  fields,   // includes original text
  values,
  authors,
  editors
}
```

## Bridge calls

| Method | Role |
|--------|------|
| `prepareTemplate({ mode: 'edit', refNode })` | Document-first field list after open input is normalized to the owning `.ref` |
| `buildEditReferenceDom(state)` | Return clone with insert/del leaves |
| `buildCitationSyncDetails` | Year / surname sync metadata |

## DOM output

- Return: cloned `.ref` with tracked leaf updates (and rebuilt person-groups when authors/editors change)
- Apply: `replaceChild` / mixed-citation child swap onto live `refNode`

Existing `pub-id`, DOI `ext-link`, URI, and PMID leaves are parsed through `resolveReferenceLinkField()`. A leaf containing only tracked `<del>` content recovers its active form value from `xlink:href`/`href`. Reopen therefore uses the inserted DOM, not the DOI lookup input or a prior fetch snapshot.

## Books edit — plain Summernote + full template rebuild

Journal edit (`IS_JOURNAL` / JATS) stays as-is: existing text inputs, **article-title only** as Summernote richtext; no books demand-field path.

For books (`!IS_JOURNAL` / book DTD):

1. **Demand field groups** carry leaf `innerHTML` (text + element nodes only): titles (`article-title`, `chapter-title`, `source`) and **collab**.
2. Those title/source/collab inputs use **plain Summernote**: no formatting toolbar and no keyboard formatting shortcuts. The editor only preserves / edits existing markup; it must not inject bold/italic via UI or Ctrl+B/I/U.
3. Author/editor surname + given-name fields and publisher fields (`publisher-name`, `publisher-loc`) are temporarily normal inputs until `ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE` is re-enabled.
4. Empty CEG-order leaves remain editable so the user can **fill any empty element**; missing values participate in the same path.
5. On debounced field update, preview uses the **same full-template rebuild** as insert / DOI fetch: `collectIntoState` → `buildReferenceFromPayload` via `refreshPreview`. Do not add a separate edit-only rebuild pipeline.
6. Submit still applies through `buildEditReferenceDom` / apply onto the live `refNode`.

`#reference_edit_all_field` remains the explicit enable-all escape hatch; default books edit is demand-group based.

## Errors

- No selection → `showBefore` blocks open
- `canSubmit` false → return before build. No insert toaster chain.
- After build, no change toasts the existing reason, usually `no-change` or `mixed-citation-missing`
