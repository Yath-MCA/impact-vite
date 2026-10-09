---
title: EDIT CITATION TEXT - Structure-preserving display text edit
description: Freely edit citation display text, optionally change linked reference, and retain formatting tags inside xref.
---

# Instructions

- Module class: `EditCitationTextModule`; registry ID: `editCitationTextDialog`
- Dialog ID: `#EditCitationTextDialog`; config flag: `editCiteText` under `citeGroup`
- Role scope: single file [`xref_role_config.json`](./xref_role_config.json), declared in `EDIT_CITATION_TEXT_MODULE_CONFIG.supportingFiles` and loaded through `ContextHelpers.loadModuleResource`. Context prefetch and module initialization share the same `alreadyLoaded` cache; `initLoop` only consumes `window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG`. Openable when `enable: true` (bibr + floats + chapter/part/section/appendix/equation). `disp-formula` key stays `false` and blocks that role key even though `equation.selector` lists the alias. Per-role `linkedContentType` / `linkedFieldLabel` drive the Linked field; rebuild so gulp copies JSON to `assets/{version}/modules/edit_citation_text/`
- Do **not** call `namedCitation`, Cross Citation regen, or `Citation_Module` Modify path
- Do **not** change `ref-type`, `data-role`, `class`, `data-name` on the xref itself
- `rid` / `href` may change only via **Change** corresponding reference when `allowChangeRef` is true (bibr only today)
- Retain inner formatting (`span.font`, italic, bold, sup/sub) when present — do not wipe with bare `textContent`
- Do **not** change track code mappings without updating `ShowTracking_support_data.json`
- Existing **Edit Citation** (`modCite` / `EDIT_CITATION`) remains for multi-ref / regen flows

**Role → `linkedContentType` cheat sheet:**

| Type | Roles | Linked shows |
|------|-------|--------------|
| `reference` | `bibr` | mixed-citation / ref text |
| `title` | `chapter`, `part`, `section`/`sec`, `appendix` | plain title |
| `caption` | `fig`, `table`, `boxed-text`/`box-text`, `equation` | caption title (not float label) |

# Operations

## 1. OPEN (`show` / `showLoop`)

Open the minimal dialog for the xref under the cursor.

**Flow:**
1. Context menu `editCiteText` → `executeCommand` selects `a.xref`
2. `show('edit', target)` → `showBefore` → `resolveRoleConfig`; abort if missing / role disabled
3. `showLoop` stores `editState.roleConfig`, fills Display Text with **xref-only** text, fills Linked field via `getLinkedTargetInfo` (role-aware); `applyRoleConfigToUi` toggles Wrap / Change / same-rid and sets `linkedFieldLabel`
4. `initializeElements` + `setupEventListeners` — rebind when `#cite_display_text` node changes after remount (`_boundTextInput`)
5. **Wrap selection** (if `allowWrap`): **enabled only when wrap is feasible** (paren surround or sibling page/prefix) **and Display Text is not dirty**. Typing in Display Text disables the button until text is reverted to the opened value. When enabled, it resolves surround from DOM, **auto-selects that range in the editor**, then fills Display Text (≤5 words outside xref; sets `rangeSelected`). Button becomes **Update wrap** when the editor selection changes. Dialog open still defaults to xref-only (no auto fill).
   - Extra-word count: `et al.` / `n.d.` / `[1848]` reprint years count as one token each; `and` / `&` are separators
   - Page suffixes join flush after the cite (`, p. …` — never `</a> , p.` / `Year p.`)
   - Same path works for narrative `Assmann (2008)`, `Abousnnouga and Machin (2013)`, `(PVAO, n.d.)`, `(Mohamed & Chew, n.d)`, `(Olick et al., 2011)`, `de la Paz, 2012`, diacritics, year-only, incomplete paren years, Chicago reprint `(Thackeray [1848] 1950, 25)` (outer `()` wrap; `[1848]` stays in body)
6. **Other citations with this reference** (if `allowSameRidNav`): grid of same-role/same-rid cites + Prev/Next; navigate only when Display Text / rid are not dirty
7. Apply stays disabled until Display Text (`normalizeSpace`) or linked rid differs from original

**Linked field (`#cite_linked_rid`):** read-only. Content depends on `linkedContentType` in [`xref_role_config.json`](./xref_role_config.json):
- `reference` (`bibr`): `.mixed-citation` / ref text; year kept when truncated
- `title` (chapter / part / section / appendix): plain title text (ignore `target`, PageID/senter, font wrappers)
- `caption` (fig / table / boxed-text / equation): caption title (not float label like `Box 1.1`)
Full text in input `title`; Change/relink Display Text rewrite stays bibr-only.

**Entry points:**
- Context menu: **Edit Citation Text** on `a.xref` when `resolveRoleConfig` succeeds (role `enable: true` in JSON)
- Hidden when deleted (`data-remove`), para-locked, role `enable: false`, or `editCiteText` config off

**Key Methods:**
- `resolveXrefNode(xrefNode)` — find `a.xref` from arg / selection
- `resolveRoleConfig` / `getXrefRoleKey` / `applyRoleConfigToUi` — role gate + UI options + Linked field label
- `showBefore(IsEdit, xrefNode)` — gate open
- `showLoop(IsEdit, xrefNode)` — populate form
- `getLinkedTargetInfo` / `getTitleInfoFromRid` / `getCaptionInfoFromRid` / `getPlainLinkedText` / `getTargetByRid` / `formatLinkedDisplayLabel` / `setLinkedFieldDisplay` — role-aware Linked field
- `handleUseSelection` / `hasWrapRangeAvailable` / `updateWrapSelectionState` / `selectSurroundRangeInEditor` / `resolveSurroundFromXref` — wrap UX
- `collectSameRidCitations` / `renderSameRidSection` / `updateSameRidNavState` / `navigateToSameRidIndex` — same-rid grid nav
- `findLastDateMatch` / `dateMatchEndIndex` / `splitEditedTextByMode` — year or `n.d.` as date end; absorb `)` after year
- `findWrapperBefore` / `findWrapperAfter` / `detectCitationMode` — prefer outer `()` so `[1848]` reprint years are not wrap delimiters
- `updateApplyState()` / `isTextDirty()` / `isRidDirty()` — Apply enablement + same-rid nav gate

## 2. CHANGE REFERENCE (`toggleRefPicker` / `onRefListClick`)

Bibr / `allowChangeRef` only. Non-bibr roles hide Change; do not invent float catalogs here.

**Flow:**
1. Click **Change** (`#change_cite_ref`) → open `#cite_ref_picker` with filter + truncated list
2. Catalog from `div.ref:not([data-remove])` (deduped by `id`); labels truncated (~40–60 chars) but **year always visible**; full text in `title`
3. Multi-space `rid` cites: toast (“use Edit Citation”) and do not open picker
4. Select a row → set `pendingRid` / `pendingHref`; update linked label via `setLinkedFieldDisplay`; **refresh Display Text** to `Surname, Year` (`refreshDisplayTextForRelink`; keeps trailing `p.`/`pp.` and see/cf. prefix)
5. Enable Apply (text and/or rid dirty)

**Key Methods:**
- `collectReferenceCatalog()` / `renderRefList(filter)`
- `getRefInfoFromRid` / `formatRefDisplayLabel` / `extractYearFromRef` / `extractSurnameFromRef`
- `buildNameDateDisplay` / `refreshDisplayTextForRelink`
- `toggleRefPicker()` / `hideRefPicker()`
- `onRefFilterInput()` / `onRefListClick(e)`

## 3. APPLY (`handleApply`)

Update display text and/or linked rid; stamp tracking attrs; retain formatting.

**Flow:**
1. Abort if Apply disabled or Display Text empty
2. If xref body text changed and formatting present: remap via `buildPreservedHtml` / `setXrefContent` (multi-node large rewrite falls back to plain text); `<del>` uses previous HTML
3. If xref body text changed and no formatting: plain `textContent` path
4. Prefix/suffix **only** when `rangeSelected` (after Wrap/Update wrap): prefer `writeXrefSiblingSurround` (page beside `a.xref`, including inside existing `<insert>`); classic `( xref )` still uses `setPrefixText` / `setSuffixText` when paren close text is the surround node
5. If rid dirty: `applyLinkedReference` sets `rid`, `href`, and `data-cke-saved-href`
6. `buildEditAttributes` → `cite-text-direct-01` / `cite-text-indirect-01` / `cite-text-relink-01` (rid-only with no text change)
7. `applyAttributes` + `IMPACT_SELECTION._SNAPSHOT({ save: true, unlock: true })` + close

**Display Text typing:**
- Straight `'` converts to typographic apostrophe `’` on keypress/paste
- Joining surround parts never inserts a space before `,;:.)]}`; page-like parts without a leading comma are normalized to `, …` (avoids `1973 , 5` and `Year p. 123` / `</a> , p.`)
- Surround split uses last date token (numeric year or `n.d.`) so page suffixes after no-date cites still separate correctly; reprint cites keep `[YYYY]` in the body and use the last year as the date end
- Citation wrap detection prefers `()` over `[]`/`{}` so Chicago reprint `(Thackeray [1848] 1950, 25)` wraps on outer parens
- Closing `)` immediately after the date stays on the xref body (`Assmann (2008)`); incomplete `(1996` is not given a forced `)`
- Target DOM for page: `<insert><a class="xref">…n.d</a>, p. 234</insert>` — never page inside the link; never a second `a.xref` for the page

## 4. SYNC FROM REFERENCE (`syncFromRefChange`)

Called by Edit Reference Text after any author surname / bare string-name / year Apply (`ReferenceChangeDetails`).

**Flow:**
1. Find `a.xref` with matching `rid` / `href` (multi-space rid token-safe); skip `data-remove` / roles without `allowSyncFromRef`
2. Replace old name token(s) from `changed.surnames[]` and/or year in cite plain text; global per name; skip if neither old token present
3. Write via `setXrefContent` (parent `<insert>`) or `applyTrackedChange`; retain format when possible
4. Stamp `cite-text-sync-01`; leave sibling page text outside the xref

**Key Methods:**
- `syncFromRefChange(details)` / `applyRefChangeTokens` / `xrefLinksToRid`

## 5. CANCEL (`handleCancel` / `resetDialog`)

Close without DOM changes; clear `editState`; hide ref picker; clear `_eventsBound` / `_boundTextInput` so next open rebinds.

# Parameter / attribute rules

| Attribute | Action |
|-----------|--------|
| `ref-type`, `data-role`, `class`, `data-name` | Preserve |
| `rid`, `href`, `data-cke-saved-href` | Updated together when Change reference selected |
| Inner format tags (`span.font`, italic, bold, sup/sub) | Retain when present (large rewrites may fall back to plain) |
| `data-override` | Removed by this dialog flow |
| `data-track-code` | `cite-text-direct-01`, `cite-text-indirect-01`, `cite-text-relink-01`, or `cite-text-sync-01` |

# Related modules

- `Citation_Module` / `Cite_NameDate` — insert/edit linked refs (regenerates text); use for multi-rid
- `hyperlink_module` — pattern source for BaseModule dialog; not bibliographic cites
- `edit_reference_text` — sibling for reference leaf-field free edit + HTML sanitize pattern
