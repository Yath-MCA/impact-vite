# Edit Citation Text — Developer Guide

Companion to [README.md](./README.md) and [skills.md](./skills.md).

---

## Class and key methods

**Class:** `EditCitationTextModule` extends `BaseModule`  
**File:** [`index.js`](./index.js)

| Method | Role |
|--------|------|
| `resolveXrefNode(xrefNode)` | Resolve `a.xref` from arg / `IMPACT_SELECTION` / editor selection |
| `showBefore(IsEdit, xrefNode)` | Gate open via `resolveRoleConfig` (enabled role + single-rid when required) |
| `showLoop(IsEdit, xrefNode)` | Bind UI, populate text + rid, apply `roleConfig` options, snapshot HTML/formatting/`pendingRid` |
| `applyRoleConfigToUi(roleConfig)` | Toggle Wrap / Change / same-rid; set dialog title + Linked field label (`linkedFieldLabel`) |
| `resolveRoleConfig(xref)` / `getXrefRoleKey` / `matchesRoleSelector` | Static helpers; shared with context menu via `window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG` |
| `initLoop()` | Apply the role map already loaded by `supportingFiles` to the module class |
| `setupEventListeners()` | Rebind when `#cite_display_text` remounts (`_boundTextInput`) |
| `isTextDirty()` / `isRidDirty()` / `isDirty()` | Dirty flags for Apply |
| `updateApplyState()` | Enable Apply when text or pending rid is dirty (and text non-empty) |
| `toggleRefPicker` / `onRefListClick` / `renderRefList` | Change corresponding reference (year-aware truncated list; bibr only) |
| `collectReferenceCatalog()` | Build `{ id, label, year }` list from document refs |
| `getLinkedTargetInfo` / `getTitleInfoFromRid` / `getCaptionInfoFromRid` / `getPlainLinkedText` / `getTargetByRid` / `formatLinkedDisplayLabel` / `setLinkedFieldDisplay` | Role-aware Linked field content (`reference` / `title` / `caption`) |
| `getRefInfoFromRid` / `extractYearFromRef` / `formatRefDisplayLabel` | Bibliographic linked/picker labels (bibr / `linkedContentType: reference` only) |
| `handleUseSelection` / `selectSurroundRangeInEditor` / `resolveSurroundFromXref` / `hasWrapRangeAvailable` / `updateWrapSelectionState` / `normalizeSurroundSuffix` / `onEditorSelectionChange` / `countExtraWordsOutsideXref` / `tokenizeSelectionWords` / `shouldWriteSurround` / `joinDisplayParts` / `formatSuffixText` / `removeAdjacentWhitespaceTextNodes` | **Wrap selection**: enabled only when wrap feasible; auto-selects surround; ≤5 extras; flush page commas |
| `collectSameRidCitations` / `renderSameRidSection` / `updateSameRidNavState` / `focusCitationInEditor` / `navigateToSameRidIndex` | Same-rid grid + Prev/Next after Linked reference; nav only when `!isDirty()`; editor select before dialog refresh |
| `findWrapperBefore` / `findWrapperAfter` / `findOpenWrapperIndex` / `detectCitationMode` | Prefer outer `()` over `[`/`]` so reprint years like `[1848]` stay in cite body |
| `findLastDateMatch` / `dateMatchEndIndex` / `splitEditedTextByMode` | Date end for surround split (year or `n.d.`; absorb trailing `)`; split whenever Wrap selection set `rangeSelected`) |
| `writeXrefSiblingSurround` / `shouldUseXrefSiblingSurround` / `findPostXrefSurroundSibling` | Keep page outside `a.xref`; re-edit under existing `<insert>` |
| `extractSurnameFromRef` / `buildNameDateDisplay` / `refreshDisplayTextForRelink` | Refresh Display Text on Change |
| `hasFormatting` / `sanitizeHtml` / `buildPreservedHtml` / `setXrefContent` | Retain format wrappers on text apply |
| `buildEditAttributes(mode, flags)` | Track user attrs + direct/indirect/relink `data-track-code` |
| `applyTrackedChange(el, newText, prevText, options)` | Insert `<del>` (HTML when formatted) + wrap xref in `<insert>` |
| `applyLinkedReference(node)` | Write pending `rid` / `href` |
| `applyAttributes(node, attributes)` | Stamp attrs via `trackManager.updateAttributesOnly`; also copies `data-track-code` onto parent `<insert>` when present |
| `handleApply(e)` | Text and/or rid update + attrs + snapshot + close |
| `syncFromRefChange(details)` / `applyRefChangeTokens` / `xrefLinksToRid` | Rid-scoped any-author surname/string-name/year token sync from Edit Reference Text (`changed.surnames[]`) |
| `handleCancel()` / `resetDialog()` | Clear state, hide picker, reset bind flags |

**Constants:**

| Name | Value |
|------|--------|
| `TRACK_CODE_LEGACY` | `cite-text-01` |
| `TRACK_CODE_DIRECT` | `cite-text-direct-01` |
| `TRACK_CODE_INDIRECT` | `cite-text-indirect-01` |
| `TRACK_CODE_RELINK` | `cite-text-relink-01` |
| `TRACK_CODE_SYNC` | `cite-text-sync-01` (auto-sync from Edit Reference Text) |
| `REF_LABEL_MAX` | `40` (linked field; list rows use ~60; year always kept) |
| `DATE_RE` / `DATE_RE_GLOBAL` | Numeric year or `n.d.` / `n.d` / `nd` (last match preferred when splitting) |
| `PRESERVE_ATTRS` | `class`, `data-name`, `data-role`, `ref-type`, `rid`, `href`, `fid` |
| `FORMAT_SELECTOR` | `span.font`, `span[data-name=font]`, italic/em, `i`, `b`/`strong`, `sup`/`sub` |
| `XREF_ROLE_CONFIG` | Runtime map from [`xref_role_config.json`](./xref_role_config.json) (not config.xml) |
| Dialog `_id` | `EditCitationTextDialog` |
| `canUnmountComponentWhileClose` | `true` |

**Template selectors:**

| Control | Selector |
|---------|----------|
| Display Text | `#cite_display_text` |
| Use / Update wrap | `#cite_use_selection` (disabled when no wrap range) |
| Linked field | `#cite_linked_rid` (label from `linkedFieldLabel`) |
| Change button | `#change_cite_ref` |
| Ref picker / filter / list | `#cite_ref_picker` / `#cite_ref_filter` / `#cite_ref_list` |
| Same-rid section | `#cite_same_rid_section` / `#cite_same_rid_grid` / `#cite_same_rid_prev` / `#cite_same_rid_next` |
| Apply / Cancel | `#apply_cite_text` / `#cancel_cite_text` |

---

## Structure contract

### Immutable (must not change on Apply)

- `class`, `data-name`, `data-role`, `ref-type`, `fid` on the xref
- Inner formatting tags when present (remap text; do not strip)

### Mutable

- Text / HTML content of the xref (and track wrappers)
- `rid` / `href` when user picks a new reference via **Change**
- `data-track-code` (`cite-text-direct-01`, `cite-text-indirect-01`, `cite-text-relink-01`, or `cite-text-sync-01`) — may be stamped on both parent `<insert>` and `a.xref` with the same value; Show Tracking skips the child when the parent already has the identical code (no attribute removal)
- Default track user attrs from `commonMethods.Default.getAttributes(['dt','drn','du','wsc_i_e'])`

### Example

```html
<!-- Before -->
<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr"
   rid="CIT0026" href="#CIT0026">Larsson <em class="italic" data-name="italic">et al.</em> 2016</a>

<!-- After text Apply (formatting retained via remap) -->
<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr"
   rid="CIT0026" href="#CIT0026"
   data-track-code="cite-text-direct-01">Larsson and colleagues 2016</a>

<!-- After rid-only Change (inner HTML untouched) -->
<a class="xref" data-name="xref" data-role="bibr" ref-type="bibr"
   rid="CIT0030" href="#CIT0030"
   data-track-code="cite-text-relink-01">Larsson <em class="italic" data-name="italic">et al.</em> 2016</a>
```

---

## Apply enablement / remount

- Dirty compare uses `normalizeSpace()` on Display Text vs `originalEditableText` (xref-only on open)
- Also dirty when `pendingRid !== rid`
- Default Display Text is **xref-only**; surrounding paren text is **not** auto-composed on dialog open
- **Wrap selection** / **Update wrap**: enabled only when a wrap range is feasible (paren indirect **or** pre/post surround siblings) **and** Display Text is not dirty (`!isTextDirty()`); disabled for direct xref-only or after typing in Display Text (re-enables if text is reverted). On click, `resolveSurroundFromXref` + `selectSurroundRangeInEditor` (`selectRanges`) highlights the surround — user need not drag. Label flips to **Update wrap** when the editor selection changes away from the last applied wrap. `updateApplyState` refreshes wrap button state on each Display Text input
- **Other citations with this reference** (section after Linked reference): CSS grid of same-rid cites + Prev/Next + `N of M`; bordered panel (`#cite_same_rid_section`); navigation enabled only when form is not dirty (`!isDirty()`). On navigate: `focusCitationInEditor` → `showLoop` → focus Display Text
- At most **5 words outside** the xref body: `qtd in`, `p. 281`, `&`, long institutional authors, etc.
- Word tokenization treats `et al.` / `et al`, `n.d.` / `n.d`, and `[1848]`-style reprint years as **one** token each (`tokenizeSelectionWords`); `\band\b` and `&` are separators (not counted)
- Date detection for surround split / label year uses last match of numeric year **or** `n.d.` (`findLastDateMatch` / `DATE_RE`) — e.g. `(PVAO, n.d.)`, `(Mohamed & Chew, n.d)`, `(Thackeray [1848] 1950, 25)` → last year `1950` then page
- Wrapper detect prefers bibliographic `()`; `[YYYY]` reprint years are not treated as cite wrappers (`findOpenWrapperIndex` / pair-aware `findWrapperAfter`)
- After the date token, a closing `)` is kept on the xref body (`dateMatchEndIndex`) so narrative `Assmann (2008)` does not push `)` into the suffix; incomplete `(1996` is unchanged
- After successful Wrap/Update wrap, `rangeSelected` is set and Apply may write prefix/suffix
- Surround split runs whenever `rangeSelected` (not only when paren detect said `indirect`); page/`p.` stays **outside** `a.xref` via `writeXrefSiblingSurround` when the cite is under `<insert>` or has no classic paren close node
- Re-edit under an existing `<insert><a>…</a>, p. …</insert>` updates the sibling page in place; cite body uses `setXrefContent` (no nested wrap)
- Without using Wrap selection, Apply updates xref body only
- `joinDisplayParts` / `normalizeSurroundSuffix` / `formatSuffixText` flush-join page suffixes (`, p. 123`); `removeAdjacentWhitespaceTextNodes` prevents `</a> , p.` in the DOM
- Display Text converts straight `'` → `’` on keypress/paste
- Listeners: `input`, `change`, `paste`, `compositionend`, `keydown`, `keypress`, `beforeinput`; editor `selectionChange` while dialog open
- On close/reset: clear selection listener, `_eventsBound`, `_boundTextInput`, `_boundPanel` so remounted dialog rebinds

---

## Track changes

- If xref is already inside `<insert>`: update content via `setXrefContent` (preserves formatting when present)
- Otherwise: `getDelNode()` with previous **HTML** when formatted, else plain text; wrap xref in `getInsNode()`
- Prefer `window._trackManager` when available

Do **not** call `namedCitation` / `SORTING` / wrap rebuild from `Cite_NameDate.js`.

---

## Formatting retention

Allowlisted nodes (`FORMAT_SELECTOR`):

- `span.font` / `span[data-name="font"]` (keep `pi-value`, `gid`)
- `em.italic` / `em[data-name="italic"]`, `i`
- `b` / `strong`
- `sup` / `sub` (and `data-name` variants)

Strategy:

1. Text unchanged and not refreshed → do not touch children
2. No formatting → `textContent`
3. Formatting present → `buildPreservedHtml` remaps plain text into existing wrappers
4. Multi-node + large rewrite (e.g. single-word → dual-word author) → fall back to plain escaped text write
5. Sanitize strips only `script`/`style`/`on*`

---

## Change corresponding reference

- Button `#change_cite_ref` opens `#cite_ref_picker` with filter + truncated list
- Catalog: `div.ref:not([data-remove])` (deduped by `id`) with `{ id, label, year }` (+ surname via `getRefInfoFromRid`)
- Year from `.year` / `[data-name="year"]`, else last date-like match in label (`\d{4}` or `n.d.`) via `extractYearFromLabel` / `findLastDateMatch`
- Surname from first `.surname` / `.collab` / `.anonymous` (dual-word names supported)
- On select: `refreshDisplayTextForRelink` sets Display Text to `Surname, Year` (keeps trailing `p.`/`pp.` and indirect see/cf. prefix)
- Display labels via `formatRefDisplayLabel` — truncation never drops the year
- Full label remains in row `title` for hover
- Single-select; multi-space `rid` → toast to use Edit Citation
- On Apply: set `rid`, `href`, and `data-cke-saved-href` together so CKEditor navigation matches

---

## Context registration

**File:** [`context.js`](./context.js)

| Setting | Value |
|---------|-------|
| Module ID / `window` key | `editCitationTextDialog` |
| Command name | `editCiteText` |
| Action | `edit_cite_text` |
| Group | `citeGroup` |
| Order | `134` |
| Visibility | `canShowValidation.client_key = 'editCiteText'` |

Menu shows when ascent is `a.xref`, `resolveRoleConfig` returns a config (role `enable: true`, not `data-remove`, single-rid when `requireSingleRid`), and client `editCiteText` is on.

---

## XREF role config (JSON)

Single source of truth: [`xref_role_config.json`](./xref_role_config.json). Not nested under `config.xml`. Client XML only toggles the top-level menu: `editCiteText` `show="true|false"`.

Declared in `EDIT_CITATION_TEXT_MODULE_CONFIG.supportingFiles` and loaded by
`ContextHelpers.loadModuleResource(...)` from
`assets/{iVersion}/modules/edit_citation_text/xref_role_config.json`
(gulp copies `src/modules/**/*.json`).

- **Context menu:** prefetch on `DOMContentLoaded` sets `window.EDIT_CITATION_TEXT_XREF_ROLE_CONFIG`
- **Module initialization:** ModuleSystem checks `alreadyLoaded`, then ensures matching `when: "initLoop"` files before `initialize` / `postInitializeModule`
- **Dialog:** `initLoop` consumes the window map; it performs no fetch
- **`dependencies: []`** stays empty — supporting files are separate from module dependencies

Default: roles with `enable: true` in JSON are openable (many float/structural roles ship enabled; Change/Wrap/sync stay off until catalogs exist).

```json
"fig": { "enable": true, "linkedContentType": "caption", "linkedFieldLabel": "Linked figure", ... }
```

Edit the JSON and rebuild; no seed object in `context.js` / `index.js` to keep in sync.

| Option | Purpose |
|--------|---------|
| `linkedContentType` | `reference` \| `title` \| `caption` — what `#cite_linked_rid` shows |
| `linkedFieldLabel` | Label text for the Linked field (e.g. `Linked chapter`) |
| `canonicalRole` | Alias collapse (`sec`→`section`, `fig`→`figure`, `box-text`→`boxed-text`) |
| `allowWrap` | When `false`, hide Wrap selection |
| `allowChangeRef` | When `false`, hide Change + ref picker |
| `allowSameRidNav` | When `false`, hide same-rid section |
| `allowSyncFromRef` | When `false`, skip cite in `syncFromRefChange` |

### Role inventory (mirrors JSON)

| Key | enable | linkedContentType | linkedFieldLabel | Notes |
|-----|--------|-------------------|------------------|-------|
| `bibr` | true | reference | Linked reference | Wrap / Change / sync on |
| `boxed-text` | true | caption | Linked box | Selector also matches `box-text` |
| `appendix` | true | title | Linked appendix | |
| `equation` | true | caption | Linked equation | Selector also matches `disp-formula` |
| `chapter` | true | title | Linked chapter | |
| `part` | true | title | Linked part | |
| `section` | true | title | Linked section | Selector also matches `sec` |
| `sec` | true | title | Linked section | `canonicalRole: section` |
| `fig` | true | caption | Linked figure | Selector also matches `figure`; `canonicalRole: figure` |
| `table` | true | caption | Linked table | |
| `disp-formula` | false | caption | Linked equation | Disabled key wins over selector fallback — `data-role=disp-formula` stays closed; use `equation` role (or flip this key to `true`) |

### Linked field content rules

`showLoop` fills `#cite_linked_rid` via `getLinkedTargetInfo(rid, roleConfig)` — **not** `getRefInfoFromRid` for every role.

| `linkedContentType` | Roles (typical) | Source text |
|---------------------|-----------------|-------------|
| `reference` | `bibr` | `.mixed-citation` (fallback whole `#rid`); year-preserving truncate |
| `title` | `chapter`, `part`, `section`/`sec`, `appendix` | Prefer direct-child `.title`, then `.book-part-meta .title-group .title`, then `.title` |
| `caption` | `fig`/`figure`, `table`, `boxed-text`/`box-text`, `equation` | Prefer `.caption .title`, then `.caption .p`, then caption / direct title |

Plain text via `getPlainLinkedText`: strip `.target` / `target`, `.PageID` / `.senter` / PIs, unwrap `.font` / italic / bold / sup / sub. Full untruncated string goes in the input `title` tooltip. Float **label** (e.g. `Box 1.1`) is not used for the Linked field.

Change / ref picker / `refreshDisplayTextForRelink` remain **bibr-only** (`allowChangeRef`).

Non-bibr roles ship with Wrap/Change/sync off until float catalogs exist; same-rid nav can stay on once `enable: true`.

---

## Client config

Under `<functiongroup name="citeGroup">`:

```xml
<functionality name="editCiteText" show="true" showForAU="false" showForCO="true" showForCE="true" showForPM="true" showForED="true" showForJM="true" showForPR="true" showForCoRole="true" />
```

Present in journal/book `src/clientconfig/**/config.xml` files. When `show="false"` or missing, `evaluateVisibilityFromConfig` hides the command (except test env).

---

## Show Tracking

Entries in [`src/js/dialogModules/ShowTracking_support_data.json`](../../js/dialogModules/ShowTracking_support_data.json):

| Code | Message |
|------|---------|
| `cite-text-01` | Citation text edited (legacy) |
| `cite-text-direct-01` | Direct citation text edited |
| `cite-text-indirect-01` | Indirect citation text edited |
| `cite-text-relink-01` | Citation linked reference changed |

---

## Build notes

1. Webpack auto-discovers `src/modules/edit_citation_text/index.js`
2. Gulp concatenates `src/modules/**/context.js` into global context
3. Template bundle reads `templatePath` from context config
4. Rebuild after template or context changes

---

## Future merge (not implemented)

- Teach `namedCitation` / Cross Citation **Modify** to skip regen when `data-override="true"` (or confirm clear)
- Optionally fold UI into Cross Citation as a “Manual text” mode after override semantics are stable
- Rich Display Text editor if users need to *add* formatting (not only retain)
- Multi-rid chip editor inside this dialog
