# QC Validation — Developer Guide

Architecture and wiring for Internal Validation (`qualityCheckerDialog`). See also [README.md](./README.md) and [QA.md](./QA.md).

## Architecture

```
QcValidationCore.js          Shared SELECTOR + checks + showLoop/fire helpers
        │
        ├── QcValidationModule.js      extends BaseModule (editor)
        └── QcValidationTrackModule.js plain class + dialogModule (Track View)
```

| Concern | Editor | Track View |
|---------|--------|------------|
| Base class | `BaseModule` | None (uses legacy `dialogModule`) |
| Entry | `index.js` → `QcValidationModule` | `QcValidationTrackModule.js` only |
| Registration | `context.js` via `moduleSystem` | `bootstrapQcValidationTrack()` |
| Template | `template.html` via BaseModule | Same `template.html` fetched at bootstrap |
| Finalize | CO finalize → QC → FinalizeDialog | No finalize wiring |

## Tab layout

Dialog body uses Bootstrap tabs. Top-level tabs:

| Tab key | UI label | Notes |
|---------|----------|--------|
| `citation` | Citation | Parent nav only; subs **Missing Item** \| **Order** each have their own confirm |
| `dtd_error` | DTD Error | Duplicate IDs + Broken Xref Targets + Unused Destinations |
| `text_related` | Text Related | Double Spaces in Tags (`process: double_space`); sibling-skip + parent clear gate (see below) |
| `comments_queries` | Comments & Queries | Collation pending (`process: collation_pending`) — pending/holding items for collator verify |

### Citation subs

| Sub key (`data-qc-tab` / SELECTOR `tab`) | Pill label | Checks |
|------------------------------------------|------------|--------|
| `missing_citation` | Missing Item | Aff / Figures / Tables / Refs / Foot-End Notes (`process: citation_checking`) |
| `citation_order` | Order | Reference cite clusters (`citation_order_bibr`) + Foot/End note order (`citation_order_notes`) |

SELECTOR entries keep `tab: "missing_citation"` / `tab: "citation_order"` so shells still render into the correct sub-container via `getTabContainer`. Issue buckets stay separate in `process_items_by_tab`. `QC_TABS` lists both Citation subs plus the other top-level tabs so each confirm is independent (`missing_citation`, `citation_order`, `dtd_error`, `text_related`, `comments_queries`).

## Messages / labels (`messages.json`)

Static chrome and dynamic runtime copy live in [`messages.json`](./messages.json) as **language bags**. Do **not** `import` the JSON into Core/Module — load via **`supportingFiles`** (same pattern as edit citation/reference):

```javascript
// context.js → registerModule
supportingFiles: [{
  name: 'messages',
  type: 'onthefly',
  when: 'initLoop',
  path: './qc_validation/messages.json',
  variable: 'QC_VALIDATION_MESSAGES'
}]
```

Pipeline: `supportingFiles` → `ensureSupportingFiles` / `ContextHelpers.loadModuleResource` → `window.QC_VALIDATION_MESSAGES` → `getModuleMessages()` (caches on `this._moduleMessages`). Descriptor also exposed as `window.QC_VALIDATION_SUPPORTING_FILES` for Track bootstrap.

```json
{ "en": { "labels": {}, "sections": {}, "runtime": {} }, "fr": { "labels": {}, "sections": {}, "runtime": {} } }
```

Default lang is **`en`**. Active lang: `IMPACT.USER_ENV_INFO.lang` (via BaseModule `getModuleLangCode()` / QC alias `getQcLangCode()`). Missing keys in the active bag fall back to **`en`**.

**Canonical API (BaseModule)** — shared by all modules with a messages bag:

| Method | Role |
|--------|------|
| `moduleMsg(path, vars, fallback)` | Resolve `labels.*` / `runtime.*` / dotted paths; `{{token}}` interpolation |
| `moduleSectionTitle(title)` | Map SELECTOR section titles via `sections` |
| `getLangBag(lang?)` | `messages[lang]` bag, else `messages.en` |
| `getModuleLangOverride(path)` | Optional `IMPACT.lang[lang][moduleId]` override |
| `applyMessagesJsonLabels(options?)` | Fill `[data-lang-lab]` from JSON lang bag (badge-safe) |
| `setAllLabels(options?)` | Label bridge (see below) |

**QC Core compat wrappers** (Track + existing call sites; do not mass-rename yet):

| Alias | Delegates to |
|-------|----------------|
| `qcMsg` | `moduleMsg` |
| `qcSectionTitle` | `moduleSectionTitle` |
| `getQcMessages` | `getLangBag` |
| `getQcLangCode` | `getModuleLangCode` |
| `applyQcStaticLabels` | `applyMessagesJsonLabels` |

Track constructs Core without subclassing BaseModule; wrappers call `BaseModule.prototype.*.call(this)`. Track `bootstrapQcValidationTrack` hydrates the bag via `ContextHelpers.loadModuleResource` before `init`.

**`moduleMsg` / `qcMsg` precedence:** `IMPACT.lang[lang][moduleId][key]` (optional global override; QC module id `qualityCheckerDialog`) → `messages[lang].path` → `messages.en.path` → fallback string.

**`setAllLabels` bridge (common when `messages.json` is available):**

Any module that registers `supportingFiles` with `name: 'messages'` (or sets `this._moduleMessages`) inherits the same two-pass path from **BaseModule**:

1. **Editor (`BaseModule.setAllLabels`):** IMPACT.lang.**en** first, then `applyMessagesJsonLabels({ skipGlobalSupplied: true })` from the module messages bag. When active lang is `en`, JSON skips keys already in the module / `common` blocks (first pass won). When active lang is `fr` (or other), JSON still applies the lang bag so translations can override BaseModule’s English. When `skipGlobalSupplied` is false (Track), `getModuleLangOverride` may still win over the JSON bag.
2. **QC editor (`QcValidationModule`):** thin bridge — calls BaseModule `setAllLabels` (messages from supportingFiles / `getModuleMessages`). Keep `qcMsg` wrappers on Core for runtime copy and Track.
3. **Track (`QcValidationCore`):** `applyQcStaticLabels` → `applyMessagesJsonLabels` only (no IMPACT.lang first pass).

Template chrome uses `data-lang-lab` keys matching `labels.*` / `en.js` `qualityCheckerDialog`. `showLoop` calls **`this.setAllLabels()`** only (bridge owns both passes).

Global [`en.js`](../../js/lang/en.js) / [`fr.js`](../../js/lang/fr.js) `qualityCheckerDialog` blocks remain optional overrides for the first pass.
Sections render into `.qc-tab-container[data-qc-tab="..."]`. Issues are tracked in both `process_items_list` (flat, for `missing_cite_ids`) and `process_items_by_tab`.

`.qc-tab-container` is the **sole scrollport** (`height: 18em`, `overflow-y: auto`). Parent `.qc-validation-tab-content` uses **`min-height: 22em` only** (no fixed height) so dialog height stays stable without making both `atTop` and `atBottom` true on every pane.

**Scroll sync (±1 tab):** scrolling/wheeling the current `.qc-tab-container` walks the full `QC_REVIEW_ORDER` path bidirectionally: `missing_citation` ↔ `citation_order` ↔ `dtd_error` ↔ `text_related` ↔ `comments_queries`. Bottom / wheel-down → **next** only; top / wheel-up → **previous** only. No wrap. Arrival latch is **same-direction only** (`top` blocks further next; `bottom` blocks further prev) and clears when the user leaves the edge or when both edges are true (`noOverflow`). ~500ms cooldown after each switch; forward arrives at top, back at bottom. Wheel also works on non-overflow panes at the edge. Hints: “Scroll for next →” / “← Scroll for previous”. `getNextQcTabKey` / `getPrevQcTabKey` / `bindQcTabScrollSync` / `handleQcTabScrollSync`.

**Last tab restore:** `_lastQcReviewTab` stores the active `QC_REVIEW_ORDER` key (updated by `activateQcTab` and Bootstrap `shown.bs.tab`). Close unmounts the DOM but keeps the instance field; `showLoop` remounts then calls `activateQcTab(_lastQcReviewTab)` so reopen lands on the previous step (first open still defaults to Citation → Missing Item).

Tab strip and content share the same width bound (`width: 100%`, `max-width: 32em`); `.qc-validation-tabs` uses flex so `.nav-item` links grow evenly under badges.

`getTabContainer(tab)` resolves **only** the live `.qc-tab-container[data-qc-tab="${tab}"]` under `#qualityCheckerDialog` (refreshes `Panel` if detached). It does **not** fall back to the first tab container or stale `args.Containers`.

Section shells (`row_id` / `col_id`) are **not** in `template.html` — they are created at runtime by `createValidationEntry` in `showLoop` / `ensureValidationColumn`, then verified by `assertValidationColumns()` on open.

### Tab / section status badges

After checks update (`updateTabConfirmState` → `updateTabStatusBadges`):

| State | Visual |
|-------|--------|
| Pass (`getTabErrorCount` === 0, no ignore rows) | Green `✓` (`.qc-tab-badge--pass`) |
| Warn (ignore-only) | Orange count (`.qc-tab-badge--warn`) |
| Error (`getTabErrorCount` > 0) | Red count (`.qc-tab-badge--error`) |

Citation **parent** rolls up Missing Item + Order (error sum, else warn sum, else pass). Section `.item-head` trailing `.qc-section-badge` uses the same colors when the column has missing (red) or only ignores (orange).

### Per-tab confirm

- Checkbox `I confirm I reviewed [Tab/Sub]` is shown only when that confirm key has errors (`updateTabConfirmState`), with a **Review required** hint (`.qc-confirm-hint`).
- **Missing Item** and **Order** each have their own checkbox under the Citation parent (no single parent `citation` confirm).
- Clean tabs/subs hide the checkbox (no confirm required).
- `fire()` requires every errored `QC_TABS` checkbox checked, then the shared ≥20-char force-submit remark when any issues remain. `activateQcTab` still opens the Citation parent + matching sub when a Citation sub fails confirm.

### Ignore rules and messages

SELECTOR `ignore` is evaluated only by **`shouldIgnoreElement`** (used both when skipping elements in `checkItems` and when deciding ignore vs missing rows in `runCitationCheck`). Supports `closest` (function or CSS array; `"Bibliography"` uses `shouldIgnoreBibliography`), `querySelector`, and `textContent`. There is no separate `checkIgnore` helper.

Ignore / pass copy:

| Situation | UI |
|-----------|-----|
| All elements ignored (early exit) | Optional header `All items were cited.` + **one** collapsed `.ignore-items` summary (`data-ids`, first also `data-id`) — `N item(s) were/was ignored based on rules.` |
| Multiple identical ignore rows in a section | Collapsed by `collapseIdenticalIgnoreRows` into one summary row with `data-ids` (click cycles jumps) |
| Single ignored element | Same summary singular copy + `data-id` / `data-ids` |
| Empty cites + ignore rule | Same ignore sentence path → collapse |
| Empty cites + not ignored | Missing text + `data-id` |
| All cited pass | `All items were cited.` (`.passing-items` — non-clickable) |

Every `.ignore-items` row that represents an editor node carries `data-id` (and `data-ids` when collapsed; `data-unique-cluster` when applicable) so `bindIssueJumpClicks` can jump. Non-xref jumps use `[id="…"],[data-id="…"]` via `getTargetSelector`. Editor jump uses `scrollIntoView({ block: "nearest", inline: "nearest" })` so the dialog chrome does not thrash.

### Double Spaces in Tags

Hybrid detection in `checkDoubleSpaces`:

1. **Sibling-skip (primary)** — strip query/comment chrome from the track tag text (`getTrackTextExcludingComments` / `stripQueryCommentChrome`: `ckcommentsfull`, `Query_Start`/`Query_End`, `comment`/`AQ`/`response`, …). When checking edges, walk past that chrome via `getAdjacentMeaningfulSibling` to the next real text or insert/del.
2. **Parent clear gate** — clone closest `.p` / `[data-name="p"]`, strip the same chrome, remove `del`s, keep insert text. If that cleared string has **no** `/ {2,}/`, never flag (blocks wrapper-only false positives). Pattern `text #<query/comment>#` is ignored unless a real double remains after clear (e.g. `University` + nbsp-insert + ` Ethics`).

Intentional `&nbsp;` only inside comment markers does not count; a lone `&nbsp;` insert next to a leading space in body text still counts.

### Citation Order checks

| Process | Behavior |
|---------|----------|
| `citation_order_bibr` | Cluster adjacent `data-role="bibr"` xrefs; require ascending numeric order + `RangeFormatter` (`consecutiveThreshold: 3`) ranging. Multi-location repeats of the same rid are allowed. **Skipped** when `iREF_SCOPE.IS_NAME_DATE`. Non-numeric cite text is ignored. |
| `citation_order_notes` | Roles `fn` / `en` / `endnote` / `end-note` / `endNotes`. Flag same rid cited from more than one live location; cite text must match target label number; first-appearance label order must be sequential; sibling clusters use the same ascending + ranging rules as bibr. |

When a numeric cluster fails order/ranging, `validateCiteNumberCluster` stamps one `data-unique-cluster` key (via `GENERATE_ID`) on every DOM xref in that cluster and on the issue row. `getTargetSelector` for `cite_ord_*` columns prefers `[data-unique-cluster="…"]` so jumps land on the stamped cluster instead of an ambiguous rid.

### Comments & Queries (collation pending)

Report/confirm only — does **not** approve/reject inside QC. Pending rules match [`query-comment-system`](../query-comment-system/DEV.md) (`getCollationPendingQueries`).

| Process | Behavior |
|---------|----------|
| `collation_pending` | Prefer `window.queryModule.getCollationPendingQueries()` (excludes DOM/state `approved`, excludes `lastResponse.sameUserRole`, includes `pending\|holding`). If `queryModule` is missing, scan editor `[data-class="ckcommentsfull"][data-collation-status]` for pending/holding (skip approved). Shows a **stats strip** (Pending / Holding / Approved / Listed). Empty → “No pending collation items.” (confirm hidden). Non-empty → table (Label / Status / Collation / Id) + `recordIssue` per row so tab confirm appears. Row click jumps via shared `bindIssueJumpClicks`; **Open verify** is a small primary `button.qc-open-verify` → `queryModule.openVerifyDialog(id, { forceOpen: true, reply: true })` so collator verify opens even when normal pre-open gates would block. When verify closes while QC is still open, `queryDialog.postCloseModule` calls `refreshCommentsQueriesTab()` (activates Comments & Queries and re-runs **only** this tab—not full `showLoop`). |

Jump-to-editor clicks for missing/ignore/collation rows use **`bindIssueJumpClicks`** (single binder; pass rows are not bound). Active/inactive QC tab header colors and badges live in [`CommonDialog.scss`](../../static/css/Dialogs/CommonDialog.scss) under `#qualityCheckerDialog`; Citation sub-pills use `.qc-citation-subs`. Row accents: missing red / ignore orange / pass muted green left borders.

### DTD xref checks

| Process | Behavior |
|---------|----------|
| `duplicate_ids` | Existing duplicate id scan |
| `xref_destination` | Live `a.xref[rid]` whose rid token(s) have no matching destination `id` |
| `unused_destination` | Citeable destinations (fig / table-wrap / ref / fn) with no live xref |

Helpers reuse `selectorCountArray` / `commonMethods.xrefSelectorBuilder` / `missingItemSelector`.

### Persist

`storeRecord` still writes `missing_cite_ids` from `process_items_list`. It also sends `qc_tab_summary` and `qc_tab_confirmed` keyed by `QC_TABS` (including Citation subs `missing_citation` / `citation_order`) without removing the legacy field.

## Editor flow

1. [`context.js`](./context.js) packed into `global_context` (editor page scripts).
2. On CO role: `moduleSystem.registerModule('qualityCheckerDialog', { path: './qc_validation/index.js', templatePath: './qc_validation/template.html', ... })`.
3. `#finalize` click → `openQcValidationDialog()` → module `show()` → `showLoop()` runs checks into the QC tabs.
4. `fire()` gates on per-tab confirm (when errors) + ≥20-character force-submit comments, then `FinalizeDialog.show()`.

Do **not** use `moduleClass: QcValidationModule` in `context.js` without the class in scope. Path-based load is correct for the ES module pack.

Skip register/finalize hooks when `IS_TRACK_VIEW`.

## Track flow

1. Page: [`snippet/editor6TrackView.html`](../../../snippet/editor6TrackView.html).
2. Loads `e6_common.js` + `e6_Track.js` (deferred). **`module_main.js` stays commented out.**
3. End-of-body `<script type="module">` imports:

```js
from './assets/${{VERSION}}$/modules/qc_validation/QcValidationTrackModule.js?_${{TIMESTAMP}}$';
```

Bare `assets/...` fails in the browser (`Relative references must start with "/", "./", or "../"`).

4. Poll until `IS_TRACK_VIEW`, `dialogModule`, `USER_INFO` exist → `bootstrapQcValidationTrack()`.
5. Bootstrap fetches shared [`template.html`](./template.html), merges legacy dialog shell, registers via `registerDialogInstance`, calls `init()` → Track `initLoop()` adds profile “Show Validation Log”.
6. `handleTrackView()` hides footer and disables remarks when viewing prior log. Tabs still show; submit/finalize stay disabled.

Do **not** inline a second dialog HTML string in TrackModule — edit `template.html` only.

## Pipelines

| Bundle | Used on | QC relevance |
|--------|---------|--------------|
| `e6_common` | Editor + Track | Globals, `createLegacyDialogShell` (`legacyDialogShell.js`) |
| `e6_Track` | Track only | Track UI; **do not** concat QC ES modules here |
| `module_main` | Editor only | `BaseModule`, `moduleSystem` |
| `global_context` | Editor only | `context.js` |
| `single_module` | Both (as static assets) | Copies `qc_validation/*.js` + `template.html` under `modules/qc_validation/` |

Gulp note: `processSingleModuleJS` uses `{ base: 'src/modules' }` for `single_module` so siblings land next to `index.js`.

## Do / don’t

**Do**

- Keep validation logic in `QcValidationCore.js`.
- Tag new SELECTOR entries with `tab` + `process`.
- Use path registration for editor.
- Import Track with `./assets/.../QcValidationTrackModule.js`.
- Call `init()` after `dialogModule` assign on Track.

**Don’t**

- Uncomment `module_main` on Track View.
- Put `import`/`export` QC files into `e6_Track` concat.
- Import `QcValidationModule.js` / `index.js` on Track.
- Use bare `assets/...` as an ES module specifier.

## Key functions (Core / adapters)

| Symbol | Role |
|--------|------|
| `SELECTOR` | Check definitions with `tab` + `process` |
| `initLoop` | Wire UI; editor wires finalize/submit; Track only profile menu |
| `showLoop` | Clear tab panes, create section shells, assert columns, run checks with progress, reset confirms; calls `setAllLabels` (bridge) |
| `qcMsg` / `getQcMessages` / `applyQcStaticLabels` / `setAllLabels` | Compat wrappers → BaseModule `moduleMsg` / `getLangBag` / `applyMessagesJsonLabels`; bag on `_moduleMessages` |
| `refreshCommentsQueriesTab` | Partial rerun of Comments & Queries only (after verify close) |
| `createValidationEntry` | DOM-build section row/column (`row_id` / `col_id`) |
| `bindIssueJumpClicks` | Shared jump-to-editor click binder for issue rows |
| `bindSubmitHandlers` | Single CO submit / comments input bind on show |
| `assertValidationColumns` | After shell render, verify every SELECTOR `col_id`; recreate if missing |
| `ensureValidationColumn` | Live container lookup + recreate column if missing before checks |
| `updateTabConfirmState` | Show confirm only on tabs with errors; toggle force-submit; calls `updateTabStatusBadges` |
| `updateTabStatusBadges` / `getTabBadgeState` | Pass / warn / error badges on tabs + Citation rollup; section head counts |
| `getNextQcTabKey` / `getPrevQcTabKey` / `bindQcTabScrollSync` / `handleQcTabScrollSync` | Full bidirectional ±1 scroll/wheel sync; same-direction latch; clears on noOverflow |
| `_lastQcReviewTab` / `getActiveQcReviewTab` / `rememberQcReviewTab` | Restore last review tab after remount |
| `handleTrackView` | Load remarks; Track read-only UI |
| `getTabContainer` | Live exact `data-qc-tab` lookup under Panel (no first-tab / stale cache fallback) |
| `shouldIgnoreElement` | Single ignore API for skip-before-check and missing-cite ignore rows (`closest` / `querySelector` / `textContent`; Bibliography via `shouldIgnoreBibliography`) |
| `appendIgnoredItemRow` / `collapseIdenticalIgnoreRows` / `appendCollapsedIgnoreSummary` | Ignore rows → unique summary with `data-ids` + singular/plural copy |
| `resolveOrStampElementId` | Resolve id/del_id/oid/data-id or stamp `data-id` via `GENERATE_ID` (no parent walk) |
| `stampUniqueCluster` / `getTargetSelector` | Stamp Order cluster key on DOM xrefs; jump prefers `[data-unique-cluster]` for `cite_ord_*` |
| `checkItems` | Per-selector citation / DTD / text / citation-order / collation-pending logic |
| `runCitationOrderBibrCheck` / `runCitationOrderNotesCheck` | Citation Order tab runners |
| `runCollationPendingCheck` | Comments & Queries tab — pending/holding collation table + confirm |
| `recordIssue` | Push to flat list + per-tab buckets |
| `fire` / `storeRecord` | Confirm + remarks gate; persist; editor finalize handoff |
| `bootstrapQcValidationTrack` | Track mount helper |

## Rebuild / verify

```bash
npx gulp process-pages
# or
npx gulp
```

Confirm under `dist/assets/<ver>/modules/qc_validation/`:

- `index.js`, `QcValidationCore.js`, `QcValidationModule.js`, `QcValidationTrackModule.js`, `template.html`
