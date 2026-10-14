# Edit Reference Text Module

Minimalist structure-preserving reference editor: **Edit Field → Preview → tabs (Citation Preview | Suggestion)** — plus author/editor pattern analysis.

**Agent runbook:** [skills.md](./skills.md)  
**Developer guide:** [DEV.md](./DEV.md)  
**QA checklist:** [QA.md](./QA.md)

---

## Files

| File | Role |
|------|------|
| `index.js` | `EditReferenceTextModule` — analysis, click-to-edit, Apply, cite sync |
| `context.js` | Registry + `editRefText` menu |
| `template.html` | Dialog shell (Edit Field, Preview, below tabs) |
| `styles.scss` | Dialog layout, tab strip, citation **grid**, preview leaf colors, hide `del` in preview |
| `skills.md` / `DEV.md` / `QA.md` | Docs |

---

## Purpose

| Menu | Module | Purpose |
|------|--------|---------|
| Edit Reference | MultiRef | Full CEG form / rebuild |
| **Edit Reference Text** | this | Click preview → edit leaf at top; suggest missing; add author/editor |

Primary interaction: **click a Preview segment** → Edit Field (top) opens with field **Apply** / **Revert**. Preview updates only after field Apply. Dialog footer Apply commits the whole reference (blocked if Edit Field still open).

Dirty Edit Field + click another segment → `AlertNewDialog` (**Update** / **Revert** / **Stay**).

Tall textareas (`TALL_TEXTAREA_TOKENS`): `source`, `article-title`, `chapter-title` use **5** rows (`article-title` / `chapter-title` also use Summernote).

Field HTML handling:

- `richText: true` fields use Summernote and preserve sanitized inner HTML.
- `allowHtml: true` fields without `richText` use a lightweight `contenteditable` editor and preserve sanitized visible inner HTML.
- Number-style fields (`year`, `volume`, `issue`, `fpage`, `lpage`) remain plain text.

---

## Module Registration

| Setting | Value |
|---------|-------|
| Registry ID | `editReferenceTextDialog` |
| Class | `EditReferenceTextModule` |
| Dialog ID | `#EditReferenceTextDialog` |
| Group | `ReferenceGroup` |
| Command | `editRefText` |
| Config | `<functionality name="editRefText" show="true"  showForAU="false" showForCO="true" showForCE="true" showForPM="true" showForED="true" showForJM="true" showForPR="true" showForCoRole="true" />` |

---

## Architecture

```
showLoop
  → scanLeafFields / orderFieldsFromDocument (peer patterns for Add author only)
  → syncSuggestionTabVisibility (Suggestion only UAT/local)
  → Edit Field | Preview | tabs (Citation Preview | Suggestion)
        │
  click preview / suggestion → Edit Field + field Apply/Revert
        │
  footer Apply → leaf updates + pending inserts + optional cite sync + track-codes
```

---

## Sections

1. **Edit Field** — `#ref_active_editor` + field `#ref_field_apply` / `#ref_field_revert`
2. **Preview** — `#ref_preview_host` with `.ref-preview-seg[data-field-key]` (person-group order matches editor; all authors shown)
3. **Tabs** (`#ref_below_tabs_section`) — `activateBelowTab` / `syncSuggestionTabVisibility`
   - **Citation Preview** — `#ref_citation_preview_list` grid of document `a.xref` cites (read-only)
   - **Suggestion** — `#ref_suggestion_scroll`; chips + Add author/editor/etal — **visible only** when `IS_UAT_DOMAIN || IS_LOCAL_HOST`

---

## Tracking

| Tag | `data-track-code` | Show Tracking |
|-----|-------------------|---------------|
| `<insert>` | `ref-text-01` (`TRACK_CODE_EDIT`) | Reference text edited |
| `<del>` / `<delete>` | `ref-text-del-01` (`TRACK_CODE_LEGACY_DEL`) | Reference text deleted |

Inside-leaf: semantic span wraps `<insert>` (new) and `<del>` (old). Dialog Preview hides deleted text (value-built + CSS).

Footer Apply that changes **any author surname** / bare string-name and/or year syncs document cites **only if** **Update linked citations** is checked → `notifyCitationSync` → `EditCitationTextModule.syncFromRefChange` (`cite-text-sync-01`). Checkbox is **hidden** until those field changes are preview-committed and cites exist; defaults **off** when shown (`updateSyncCitationsCheckboxState`).
