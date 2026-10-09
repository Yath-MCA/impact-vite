---
title: EDIT REFERENCE TEXT - Field-Apply-gated preview
description: Structure-preserving reference leaf edit with Edit Field → Preview → tabs (Citation Preview | Suggestion); preview updates only on field Apply.
---

# Instructions

- Module class: `EditReferenceTextModule`; registry ID: `editReferenceTextDialog`
- Dialog ID: `#EditReferenceTextDialog`; config: `editRefText` under `ReferenceGroup`
- Section order: **Edit Field → Preview → tabs (Citation Preview | Suggestion)**; default tab Citation Preview
- **Suggestion** tab visible only when `IS_UAT_DOMAIN || IS_LOCAL_HOST` (hidden on live) — `isSuggestionTabAllowed` / `syncSuggestionTabVisibility`
- Preview does **not** live-update while typing — only after field **Apply** (`_previewValue`)
- Field **Revert** restores original / last preview commit and collapses Edit Field
- Dirty Edit Field + click another Preview/Suggestion → `AlertNewDialog` (**Update** / **Revert** / **Stay**); Update or Revert then opens the clicked field; Stay keeps current
- Footer **Apply** aborts with toaster if Edit Field still has an open field (`_activeFieldKey`)
- `TALL_TEXTAREA_TOKENS`: `source`, `article-title`, `chapter-title` use **5** rows; article/chapter titles also Summernote (`richText`)
- `allowHtml: true` retains visible inner HTML via a lightweight `contenteditable` editor when `richText` is false; `surname`, `given-names`, `collab`, `publisher-loc`, `publisher-name`, and `comment` preserve visible inner HTML; number fields stay plain text
- Idle Edit Field: `#ref_edit_idle_hint` visible; `#ref_edit_collapse` collapsed. Open field → expand collapse
- Suggestion chips: missing **non-person** virtuals (dominant + peer `uniqueTokens` gaps)
- **Add author** only when same-`publicationType` peer has `authorList.length > 1`
- **Add editor** when `bookAuthorRole === 'edited'` (XML editor group or `(Ed.)`/`(Editor)` hint after authors)
- Approach #2 analysis only (style-guide = next phase)
- Do **not** call MultiRef CEG rebuild / `STYLE_ORDER`
- Track codes — **inside-leaf** insert+del children of semantic span:
  - `<insert>` → `ref-text-01` (`TRACK_CODE_EDIT`)
  - `<del>` → `ref-text-del-01` (`TRACK_CODE_LEGACY_DEL`) via `stampTrackCode`
- Italic **source**: keep surrounding `<em>`/`<i>`; put insert/del inside that wrapper (`getFormatWrapper` / `getTrackContentHost`)
- New suggested fields: `appendLeafAtPosition` — position + prev/next delimiters, **append only** (no gap `deleteContents`)
- Dialog Preview hides `del`/`delete` in `#ref_preview_host` ([`styles.scss`](./styles.scss)); Citation Preview uses CSS **grid**
- Re-open / re-edit: `getVisibleLeafText` / `getVisibleLeafHtml` (insert preferred; del excluded); `allowHtml` fields store sanitized visible HTML, while citation sync converts surname HTML back to plain text

# Operations

## 1. OPEN (`showLoop`)

1. Resolve `div.ref` + `.mixed-citation`
2. Scan leaves (document-order name parts + bare `string-name`); order via `orderFieldsFromDocument` (not peer-dominant). Peer patterns still drive Add author / gap virtuals
3. Init each field `_previewValue = original` (visible leaf text, or visible leaf HTML for `allowHtml` / `richText`)
4. `syncSuggestionTabVisibility`; idle Edit Field hint; Preview from `_previewValue`; default **Citation Preview** tab

## 2. EDIT FIELD (top, collapse)

- Click preview → `openFieldInEditor` / `mountFieldInEditor` + `setEditFieldExpanded(true)`
- Typing → draft in `stagedValue` only (no preview change)
- Field **Apply** → `commitActiveToPreview` → collapse → `updatePreview` + `updateSyncCitationsCheckboxState`
- Field **Revert** → restore original/`_previewValue` → collapse → `updatePreview` + sync checkbox refresh
- Dirty switch to another segment → `resolveDirtyBeforeSwitch` / AlertNewDialog Update/Revert/Stay

## 3. PREVIEW

- Built from `_previewValue` / pending `_previewSurname|_previewGiven`
- Person-group order matches the open reference in the editor; all authors/name parts shown (including bare `string-name`)
- Segments keyboard-activatable (Enter/Space)

## 3b. CITATION PREVIEW

- Lists document `a.xref` cites for the open ref `id` (`collectDocumentCitationsForRid` / `renderCitationPreview`)
- Grid layout (`.ref-citation-preview-ul`); read-only; empty hint when none; count on tab when present
- Refresh after footer Apply (after cite sync when opted in)
- Checkbox **Update linked citations** (`#ref_sync_citations` / `#ref_sync_citations_label`): **hidden** until ≥1 cite **and** any author surname / bare string-name and/or year would sync (after field Apply); default unchecked when shown; footer Apply syncs only when checked

## 4. SUGGESTION (UAT/local only)

- `extractPatternFromMixed` → `tokens`, `uniqueTokens`, `publicationType`, `authorList`
- `canAddAuthor` = any same-type peer with `authorList.length > 1`
- Non-person virtual chips from pattern + peer gaps (e.g. `uri`)
- `updateStaticAddButtons` / `buildPersonShapeInfo` / staged inserts (`#ref_staged_inserts`)
- Scrollable suggestion area

## 5. FOOTER APPLY

1. If `_activeFieldKey` → warning toaster; return
2. Collect `buildReferenceChangeDetails()` when any author surname / bare string-name and/or year changed (`changed.surnames[]`)
3. Commit `_previewValue` leaves + pending inserts via `_trackManager` (insert/del **inside** leaf)
4. Stamp insert `ref-text-01` / del `ref-text-del-01` via `stampTrackCode`
5. If details present **and** `#ref_sync_citations` checked → `notifyCitationSync` via `moduleSystem` / `ContextHelpers` → `syncFromRefChange` (rid-scoped token replace; format retained)
6. `renderCitationPreview` refresh; snapshot + close

# Key methods

- `setEditFieldExpanded`, `commitActiveToPreview`, `discardActiveDraft`
- `resolveDirtyBeforeSwitch`, `isActiveEditDirty`, `openFieldInEditor`, `mountFieldInEditor`
- `handleFieldApply`, `handleFieldRevert`, `getPreviewCommittedValue`
- `getVisibleLeafText`, `getVisibleLeafHtml`, `appendLeafAtPosition`
- `orderFieldsFromDocument`, `scanLeafFields`
- `applyTrackedChange`, `applyTrackedChangeHtml`, `stampTrackCode`, `getTrackingCode`, `getTrackContentHost`, `getFormatWrapper`
- `updatePreview`, `updateFooterApplyState`, `refreshSuggestionUi`, `updateStaticAddButtons`, `buildPersonShapeInfo`
- `collectDocumentCitationsForRid`, `renderCitationPreview`, `activateBelowTab`, `syncSuggestionTabVisibility`, `isSuggestionTabAllowed`
- `isSyncCitationsChecked`, `resetSyncCitationsCheckbox`, `updateSyncCitationsCheckboxState`
- `buildReferenceChangeDetails`, `notifyCitationSync`
