---
name: reference
description: >-
  Use when working on the Reference dialog under src/modules/standalone/reference,
  hybrid field UI (CEG order + local schema), sibling ref_bridge payload→HTML APIs,
  or insert/edit/query mode handlers. MultiRefModule (ref_form) remains bundled for compatibility.
---

# Reference Dialog (Hybrid UI)

Before editing, read:

- [README.md](./README.md)
- Mode contracts: [`docs/insert_mode.md`](./docs/insert_mode.md), [`docs/edit_mode.md`](./docs/edit_mode.md), [`docs/query_mode.md`](./docs/query_mode.md), [`docs/person_groups.md`](./docs/person_groups.md)
- [`../ref_bridge/README.md`](../ref_bridge/README.md)
- Reference owns [`template.html`](./template.html) + [`styles.scss`](./styles.scss) with `#ReferenceDialog` / `reference_*` ids — **do not** point back at `ref_form` template or `#MultiRefDialog`.

## Hard Rules

1. Keep `MultiRefModule` / `MULTI_REF_*` compatibility intact until deprecated `ref_form` is fully verified for removal.
2. Hybrid UI only: **static chrome** (type + DOI/Form/Plain) + **CEG field order** via `ref_bridge.prepareTemplate` + **local** field schema in [`messages.json`](./messages.json) `config.fieldUiSchema`.
3. Do not put text/number/richtext or row/col into `refStyling_*.xml`.
4. Rebuild `#reference_fields_host` on type/template change; debounced inputs must not wipe focused controls.
5. Use `Debounce_Event` (900ms) for form → preview; debounce helper lives in [`context.js`](./context.js) (`window.referenceResolveDebounce`); route insert/edit/query builds through ref_bridge return APIs.
6. Register menus from `context.js` without the old WIP feature gate.
7. DOI/URL/PMID values must go through [`link_adapter.js`](./link_adapter.js) → `hyperLinkDialog.resolveReferenceLink(...)`. `ref_bridge.createReferenceLinkLeaf` builds only from the returned descriptor. Do not add DOI regexes, client checks, element coercion, or separate readback selectors in `common.js`, `ref_bridge`, `track.js`, or mode handlers.
8. Plain-text insert is a Summernote-backed HTML path. Keep keyup/paste/change callbacks routed through the existing debounced input handler and AnyStyle lookup; do not add a second endpoint path.
9. Plain-text insert must collect only `plainText` and `plainCite`, and its render path must skip structured field/type visibility work.
10. New insert DOM must keep `.ref[data-ins-type]`, optional `.ref[data-cite-label]` for plain text, and `insert[data-track-code="ref-01"]` wrappers around inserted internals. Do not put insert-mode `data-track-code` on DOI/URL leaf spans.
11. When citation HTML is inserted, it must be an `a.xref[data-role="bibr"]` anchor. Plain-text name-date insert uses the current editable `#reference_plain_text_cite` value at submit time, not cached AnyStyle citation HTML.
12. Books clients (`!IS_JOURNAL`) have two insert actions: primary insert creates reference + citation, while `refOnly` / `#reference_insert_ref_wo_cite` appends the reference only. Do not apply journal `data-interest-level` behavior to books references.
13. Books edit/query title/source/collab demand fields use plain Summernote: **no formatting toolbar** and **no keyboard formatting**. Author/editor names and publisher fields are temporarily normal inputs until `ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE` is re-enabled. Journal edit stays on existing inputs with **article-title only** as richtext. Demand-leaf Summernote titles use normal transform/restore; preservable IMPACT spans (`span.font`, italic/bold) are cached via `data-format-id` instead of unwrapped. PasteFilter remains paste-only.
14. Books edit/query field updates must rebuild the full reference template through the existing insert/DOI-fetch preview path (`refreshPreview` → `buildReferenceFromPayload`). Do not add a parallel rebuild pipeline. Edit may fill empty CEG-order leaves the same way.
15. Insert placement: when `contextRef` is set (context-menu open) on books/name-date, place the new `.ref` **after** that anchor; otherwise append to `.ref-list`. Edit/query `contextRef` is the chosen live `.ref`.
16. Query mode must preserve `[data-class="ckcommentsfull"]` outside `.mixed-citation` before apply. Normal missing-field update generates `Label: value` response text and saves/closes through `queryModule.operationInsertOrUpdate(...)`; `Update with Command` uses the typed response textarea.
17. Edit/query open must normalize clicked child leaves, `.mixed-citation`, CKEditor element wrappers, and string ids back to the owning outer `.ref` before calling `ref_bridge.prepareTemplate`.
18. Production entry: `#insertRefmenu` and Citation insert use `REFERENCE_FORM_OPEN` / `referenceDialog.show('open')`. Missing-item query opens prefer `referenceDialog` via QueryBaseModule; legacy `show(el, { FROM_QRY: true })` is normalized to `show('query', { element, queryNode })`.
19. FormChrome query locks pass `shouldLockField(state, field)` (two-arg). Configured rich tokens always mount Summernote in query; lock with `setRichTextDisabled`, do not refuse init. Contributor rows lock in query respond mode via `shouldLockContributorInputs`.
20. Entry `debug.log` breadcrumbs in `common.js` use `referenceDebugLog` (once per parent window; labels may still say `reference_common:*`). `refreshPreview` wraps work with `referenceDebugBegin` / `referenceDebugEnd` so debounce ticks share one window.
21. Insert/edit/query track decisions live in the `ReferenceTrack` class in [`track.js`](./track.js): `decideFieldTrack`, `decideEtalTrack`, `decideTrimTrack`, plus the edit/query writer entrypoint `applyUpdate(...)`. Load it with `await import()` and `ReferenceTrack.create()`, not a top-level import. The handled insert/del cases are listed in [`tracking.md`](./tracking.md). Trim `count` / `after` / `insert` come from CEG `getContributorTrim(refType, 'author')`, not hardcoded 7/3/`et al`. Checkbox et al. track is not style trim. Style-trim et al. stays plain; authors past `after` are `<del>`. Rich and Summernote compare innerHTML, not plain text. Do not add a runtime JSON loader for these rules.
22. `ref_bridge.renderCitationSlots()` collapses a redundant leading dot on a resolved delimiter when the leaf/group immediately before it already ends in `.` (e.g. an abbreviated given-name `"R."` followed by a `". "` delimiter would otherwise render `"R.."`) — see [`../ref_bridge/README.md`](../ref_bridge/README.md#redundant-leading-dot-collapsing). This is a general render-time guard, not a per-style `ReplaceDelim` rule in the CEG XML; do not duplicate it there.
22a. The same renderer removes a delimiter suffix when it duplicates the beginning of the next leaf's resolved `displayValue`. This overlap check is value-driven, not DOI-, client-, or style-name-specific; the leaf value and href are never rewritten by delimiter cleanup.
23. `field.original` (edit/query only, never set for insert) is created exactly once per dialog open (or ref-type switch) by `ref_bridge.getDocumentTemplate()`, then preserved as-is on every debounced reconcile tick (`reconcileMappedFieldsFromValues`) and only ever read — never recomputed — at submit by `track.js`'s `compareField`/`writeLeafAction`. Do not add a second place that assigns or recomputes `original`; see [`../ref_bridge/README.md`](../ref_bridge/README.md#fieldoriginal-lifecycle-editquery-only-insert-never-has-one) for the full trace, including how `state.originalValues`/`state.originalInlineFormats` close the `config-first` merge gap for CMS-18 books (and any future style with the same policy). `track.js`'s `applyUpdate` resolves each field's effective original as `originalValues[token] != null ? originalValues[token] : field.original` — **`originalValues` membership, not `field.original` truthiness, is what decides "existing vs. new."** A missing/empty `field.original` after a config-first merge is not a signal that the field is new; `decideFieldTrack` only sees `'insert'`-worthy emptiness when `originalValues` also has no entry for that token (i.e. the token never had a document leaf at all). `decideFieldTrack` produces exactly four outcomes from `{ original, current }`: unchanged text → `none` (no wrapper); original present, current differs → `both` (`<insert>` new + `<del>` old); original empty/absent, current has text → `insert` only (a field the user added that was never in the document); original present, current cleared → `del` only (no empty `<insert>`). The same document-vs-config split applies to delimiters: `applyDelimiterTracking` compares against the document's own delimiter text (never the config's), wraps only the between-leaf text when it differs, and leaves the field leaves themselves untouched.
24. CEG `<punctuation style AddBefore/AddAfter>` and `<elide first/next trim/expand>` are handled: `ref_bridge.getPunctuationRule()`/`getPunctuationRuleForToken()`/`getPageElideRule()` read them from the active style; `renderCitationSlots()` emits the wrap text; `applyPunctuationWrapTracking()` (a leaf-boundary analogue of `applyDelimiterTracking()`, using `isolateWrapNode()`/`Text.splitText` to peel just the rule-length slice without disturbing shared delimiter text, and which must run **before** `applyDelimiterTracking()` in `runApplyUpdate()`) tracks wrap changes against the document; `expandOrTrimPageRange()` (a port of the legacy `shortenRange()`) transforms `.lpage` before it reaches the normal field-comparison pipeline. `SingleQuoteEndPunc`/`RemoveEndPuncOnSingleQuote` are intentionally unimplemented — do not assume they're handled. See [`../ref_bridge/README.md`](../ref_bridge/README.md#ceg-punctuation-and-elide-page-range-support).
25. A leaf that already carries `<insert>/<del>` from a prior edit round gets its next `original` from `ref_bridge.resolveTrackedLeafOriginal()`, not directly from the leaf's plain/rich content: same user reopening resolves to the `<del>`'s value (true original stays the anchor); a different user, or unresolvable identity, resolves to the `<insert>`'s value (the currently-visible state becomes the new baseline). `value` is unaffected either way. Do not read `<del>`/`<insert>` content directly in `buildDocumentLeafField()`'s rich/plain branches for this purpose — that bypasses the identity check. See [`../ref_bridge/README.md`](../ref_bridge/README.md#identity-aware-original-for-an-already-tracked-leaf).

## Insert methods

| Value | UI | Submit |
|-------|----|--------|
| `doi_form` | DOI + form panel | After fetch/fill → `buildReferenceFromPayload` |
| `open_form` | Form panel | `buildReferenceFromPayload` |
| `plain_text` | Summernote rich plain-text panel + cite label | `buildPlainTextReference` |

`plain_text` notes:

- `#reference_plain_value` stores formatted HTML for `span.mixed-citation.innerHTML`.
- `#reference_plain_text_cite` stores the editable AnyStyle/name-date cite label used for the inserted `a.xref` text and `.ref[data-cite-label]`.
- Name-date cite lookup should use parsed AnyStyle/CrossRef JSON through `namedCitation([jsonRef], { json: true })` when available, with fallback text only if that fails.
- Local batch testing belongs in `insertPlainTextBatchForLocalTesting(...)`; keep it hidden from production UI. Prepare each paragraph through the existing AnyStyle/CrossRef path, retain its original HTML as the mixed-citation source, and use API data only for the per-entry cite label and type. Failed cite generation inserts that entry reference-only.

Books insert notes:

- Show both “Insert with Citation” and “Insert Reference Only” when `shouldShowInsertRefOnly('insert')` is true.
- `refOnly: true` must suppress in-text citation insertion, even though the reference node is still appended.
- `data-interest-level="special"` / `"outstanding"` is journal-only; do not infer it from books insert buttons.

## Field schema keys

`control`: `text` | `number` | `richtext`  
`layout`: `full` | `half` | `third` → Bootstrap cols  
`refTypes`: optional allow-list per token

## Verification

```txt
npx vitest run tests/unit/ref_bridge
node --check src/modules/standalone/reference/common.js
node --check src/modules/standalone/reference/index.js
node --check src/modules/standalone/reference/insert_mode.js
node --check src/modules/standalone/reference/edit_mode.js
node --check src/modules/standalone/reference/query_mode.js
node --check src/modules/standalone/ref_bridge/index.js
```

**Pre-Vite convention:** styles ship via gulp (`config.assets.styles` in messages.json); runtime JS uses dynamic `import()` in mode/index `_importDependencies()`; mapping lives in `messages.json` `config`; `common.js` has only the shared `link_adapter.js` static dependency. `ref_bridge` lives beside this module under `standalone/ref_bridge`.

Manual smoke: switch DOI/Form/Plain; change journal↔book fields; debounced preview; Insert/Edit/Query.

Collab / etal matrix (form method):

1. Journal, 2 authors, no etal → preview shows both names, no `.etal`.
2. Journal, 5+ authors → preview shows 1 name + etal inside person-group.
3. Journal, collab only (empty authors) → `.collab` leaf in preview.
4. Journal, 1 author + collab → person-group + `.collab` in preview.
5. Ed-book + editor row → editor person-group in preview.
6. Edit existing ref with multi-author person-group → author repeater shows all names.
