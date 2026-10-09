# Edit Reference Text — Developer Guide

See also [README.md](./README.md) and [skills.md](./skills.md).

---

## Layout

Compact `.ref-section` rows (tight padding/titles):

| Section ID | Content |
|------------|---------|
| `#ref_edit_field_section` | Idle `#ref_edit_idle_hint` + `#ref_edit_collapse` → `#ref_active_editor` + field Apply/Revert |
| `#ref_preview_section` | `#ref_preview_host` (idle hint covers “click to edit”; `.ref-preview-hint` unused in template) |
| `#ref_below_tabs_section` | Tabs: **Citation Preview** \| **Suggestion** — `syncSuggestionTabVisibility` shows Suggestion only if `IS_UAT_DOMAIN \|\| IS_LOCAL_HOST` |

Helpers: `activateBelowTab`, `isSuggestionTabAllowed`, `syncSuggestionTabVisibility`.

---

## Pattern analysis (approach #2)

`extractPatternFromMixed` returns:

- `tokens`, `delimiters`, `signature`
- `uniqueTokens`, `publicationType`, `authorList` (string-name nodes)

`canAddAuthor` = `sameTypePatterns.some(p => p.authorList.length > 1)`.

`bookAuthorRole`: `edited` if editor person-group or delimiter hint `(Editor)`/`(Eds.)`/…; else `contributed` for book pub types (`BOOK_PUB_TYPES` / `EDITOR_ROLE_MARKERS`).

`appendPeerGapVirtuals` adds missing non-person tokens from peer `uniqueTokens` (e.g. `uri`).

Style-guide suggestions = next phase.

---

## Tracking

Inside-leaf shape — semantic element stays outer; `<insert>` / `<del>` are children:

```html
<span class="year" data-name="year">
  <insert data-track-code="ref-text-01">2021</insert>
  <del data-track-code="ref-text-del-01">2020</del>
</span>
```

`stampTrackCode(node)`: `<del>` → `TRACK_CODE_LEGACY_DEL` (`ref-text-del-01`); else `TRACK_CODE_EDIT` (`ref-text-01`).

| Case | Behavior |
|------|----------|
| Existing leaf | Clear **content host** (format wrapper or leaf); append `<insert>` (new) + `<del>` (prev if non-empty); stamp codes |
| Italic source | Keep surrounding `<em>`/`<i>`; insert+del go **inside** the wrapper (`getFormatWrapper` / `getTrackContentHost`) |
| Re-edit (leaf already has insert/del) | Replace host children in place; no nested insert-in-insert |
| New leaf | Create token span; content in child `<insert>` (italic source: `<em><insert>…</insert></em>`) |
| New person / etal | Outer `string-name` / `.etal`; wrap body in child `<insert>` |

Italic source after edit:

```html
<span class="source" data-name="source">
  <em class="italic" data-name="italic">
    <insert data-track-code="ref-text-01">New Title</insert>
    <del data-track-code="ref-text-del-01">Old Title</del>
  </em>
</span>
```

### New leaf insert (append only)

`appendLeafAtPosition` — resolve prev/next anchors + pattern delimiters, then **only** insert nodes (no `Range.deleteContents`):

| Anchors | Sequence |
|---------|----------|
| prev | after prev: `beforeDelim` → leaf (+ `afterDelim` only if leaf is immediately before next) |
| next only | before next: leaf → `afterDelim` |
| neither | append `beforeDelim?` + leaf to mixed |

Preview: `#ref_preview_host del, delete { display: none }` in [`styles.scss`](./styles.scss) so Preview shows new text only (value-built + CSS guard).

`scanLeafFields` uses `getVisibleLeafText` / `getVisibleLeafHtml` (prefer `<insert>`, strip `<del>`/`<delete>`) so re-open does not put concatenated del text into `_previewValue` / Edit Field.

---

## Preview gating

| Event | Preview |
|-------|---------|
| `onFieldInput` | No update (draft → `stagedValue` only) |
| `handleFieldApply` | `commitActiveToPreview` → `updatePreview` + `updateSyncCitationsCheckboxState` |
| `handleFieldRevert` | Restore → `updatePreview` + sync checkbox refresh |
| Dirty switch | `resolveDirtyBeforeSwitch` → AlertNewDialog Update/Revert/Stay (`EDIT_REF_TEXT_DIRTY`) |
| `showLoop` / pending stage | `updatePreview` |

Committed display value: `field._previewValue` via `getPreviewCommittedValue`.

`updateFooterApplyState()` toggles `#apply_ref_text` from `isDirty()` (preview-committed values).  
`updateApplyState()` = preview + footer + sync checkbox.

---

## Collapse

`setEditFieldExpanded(true|false)`:

- Idle: show `#ref_edit_idle_hint`, remove `.show` on `#ref_edit_collapse`
- Active: hide hint, add `.show`, enable field actions

---

## Footer Apply guard

```js
if (this._activeFieldKey) {
  TOASTER_ALERT('Finish or revert the field in Edit Field before applying', { type: 'warning' });
  return;
}
```

DOM write uses `getPreviewCommittedValue` / pending `_previewSurname|_previewGiven`.

---

## Suggestion rules

Non-person virtual chips only; `PERSON_TOKENS` excluded. Tab itself gated to UAT/local.

Static buttons via `updateStaticAddButtons`:

| Button | Visible when |
|--------|----------------|
| **Add author** | `canAddAuthor` and role ≠ `edited` |
| **Add editor** | `bookAuthorRole === 'edited'` (or editor group present when not edited-role gate) |
| **Add et al.** | Author or editor group has names and lacks etal; no pending etal |

`#ref_staged_inserts` — staged person/etal chips with remove (`data-remove-insert`).  
`buildPersonShapeInfo` — shape badges in `#ref_person_shape_info`.

---

## Edit Field `makeInput`

Controls use Bootstrap `form-inline` / `form-group` via `makeInput(options)`.

| Config | Role |
|--------|------|
| `LABEL_BY_PUBTYPE` | Pub-type label overrides (e.g. `journal.source` → Journal Title, `book.source` → Book Title) |
| `TOKEN_LABELS` | Default labels when no pub-type override |
| `HELP_BY_PUBTYPE` / `HELP_BY_TOKEN` | Optional help under the control |
| `TALL_TEXTAREA_TOKENS` | `source`, `article-title`, `chapter-title` → **5** rows |
| Other textareas | `richText ? 3 : 2` rows |
| `richText` | Summernote (`initSummernoteInput`) and sanitized HTML value |
| `allowHtml` without `richText` | `contenteditable` div; reads/writes sanitized `innerHTML` |
| Plain fields | `input` / `textarea` `.value` |

`getFieldLabel(token, pubType)` / `getFieldHelp(token, pubType)` resolve display strings.  
**Help `<small>` is rendered only when a non-empty help string is configured** — empty maps mean no help UI.

---

## Preview segment colors + citation grid

Palette and dialog styles live in module [`styles.scss`](./styles.scss) (`$ref-element-colors` + `@include dialog-text-colors` on `#ref_preview_host`). Same color intent as MultiRef / `ref_form` (mirrored locally, not imported from shared partial).

Citation Preview list:

```scss
.ref-citation-preview-ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;
}
```

`.ref-citation-preview-list` max-height ~160px.

---

## Selectors / constants

`EditReferenceTextModule.SELECTORS` includes (among others):

- Edit: `activeEditor`, `editIdleHint`, `editCollapse`, `fieldApplyBtn`, `fieldRevertBtn`
- Preview: `previewHost`
- Tabs: `belowTabs`, `tabCitation`, `tabSuggestion`, `paneCitation`, `paneSuggestion`
- Citation: `citationPreviewList`, `citationPreviewEmpty`, `citationPreviewHeading`, `syncCitationsChk`, `syncCitationsLabel`
- Suggestion: `suggestionChips`, `personShapeInfo`, `stagedInserts`, `addAuthorBtn`, `addEditorBtn`, `addEtalBtn`
- Footer: `applyBtn`, `cancelBtn`

Key statics: `TRACK_CODE_EDIT`, `TRACK_CODE_LEGACY_DEL`, `TALL_TEXTAREA_TOKENS`, `SIMPLE_FIELDS`, `LEAF_SELECTOR`, `BOOK_PUB_TYPES`, `EDITOR_ROLE_MARKERS`, `PERSON_TOKENS`.

---

## Config / tracking

```xml
<functionality name="editRefText" show="true"  showForAU="false" showForCO="true" showForCE="true" showForPM="true" showForED="true" showForJM="true" showForPR="true" showForCoRole="true" />
```

| Code | Constant | Use |
|------|----------|-----|
| `ref-text-01` | `TRACK_CODE_EDIT` | `<insert>` / ref edit stamp |
| `ref-text-del-01` | `TRACK_CODE_LEGACY_DEL` | `<del>` stamp |

---

## Citation sync (after footer Apply)

When **any author surname** (Author 1, 2, …), bare **string-name**, and/or **year** leaf text changes, footer Apply builds a `ReferenceChangeDetails` payload and (if checkbox checked) calls `EditCitationTextModule.syncFromRefChange`:

```javascript
{
  rid: 'CIT0026',
  source: 'editReferenceText',
  changed: {
    surnames: [
      { old: 'Mokhtari', new: 'Smith', nameIndex: 1 }
    ],
    year: { old: '2010', new: '2011' } // optional
  },
  pubType: 'journal',
  authorCount: 2,
  hadEtal: true
}
```

- Payload collected via `buildReferenceChangeDetails()` **before** leaf DOM mutation (uses `field.original` vs preview commit)
- Delivered via `notifyCitationSync` **only when** `#ref_sync_citations` is checked → `ContextHelpers.waitForModuleSystem()` / `moduleSystem.getModule(...)` (not `moduleRegistry`)
- Checkbox **hidden** until cites exist **and** name/year would sync; default **off** when shown; refreshed on field Apply/Revert (`updateSyncCitationsCheckboxState`)
- Collab leaf used when no author surname/string-name changed
- Only surname / string-name / year drive cite sync; title/DOI changes do not
- Same-rid cite text replaces each matching old name token (global per name)
- `allowHtml` surname previews are converted back to plain text before building the sync payload

## Citation Preview

- `collectDocumentCitationsForRid` / `renderCitationPreview` list `bibr` xrefs for the open rid
- Populated on `showLoop`; refreshed after footer Apply (after cite sync when opted in)
- Empty hint when none found; heading / tab shows count when present
- Grid layout via `.ref-citation-preview-ul` (see styles above)

## Preview field order

- On open, `orderFieldsFromDocument` keeps **this reference’s** leaf order and live `getDelimiterBetween` gaps (e.g. `, and `)
- Bare `string-name` authors become preview segments (not swallowed into delimiters)
- Peer-dominant patterns remain for Add author / `appendPeerGapVirtuals` only
- `surname` and `given-names` use `allowHtml: true` to retain visible inner HTML; bare `string-name` remains plain text
- `collab`, `publisher-loc`, `publisher-name`, and `comment` also preserve visible inner HTML through `allowHtml: true`
- Number-style fields (`year`, `volume`, `issue`, `fpage`, `lpage`) stay plain text
