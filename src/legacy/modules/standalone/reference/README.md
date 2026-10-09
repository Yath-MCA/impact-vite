# Reference Dialog

Reference UI uses an **isolated MultiRef-style shell** under this module (`#ReferenceDialog`, `reference_*` field ids), while [`ref_bridge`](../ref_bridge/README.md) owns insert / edit / FRM_QRY DOM construction.

`MultiRefModule` (`#MultiRefDialog`) remains bundled from `src/_deprecated/ref_form` for compatibility during migration.

## Architecture

| Layer | Source |
|-------|--------|
| UI chrome + static fields | [`template.html`](./template.html) (`#ReferenceDialog`), [`styles.scss`](./styles.scss) (gulp) |
| DOM / field mapping + i18n | [`messages.json`](./messages.json) → `REFERENCE_MESSAGES` (`config` + `en`/`fr` labels) |
| Shared logic + FormChrome | [`common.js`](./common.js) |
| DOI / URL / PMID adapter | [`link_adapter.js`](./link_adapter.js) → live `hyperlink_module.resolveReferenceLink()` |
| Mode adapters | [`insert_mode.js`](./insert_mode.js), [`edit_mode.js`](./edit_mode.js), [`query_mode.js`](./query_mode.js) |
| Preview / insert / edit / query DOM | `ref_bridge` via mode handlers |

## Loading order (BaseModule)

1. [`context.js`](./context.js) registers `path` → `index.js`, `templatePath`, and `supportingFiles` (messages)
2. [`UnifiedModuleSystem`](../../_runtime/UnifiedModuleSystem.js) loads template, then `messages.json` at `initLoop` → `REFERENCE_MESSAGES`
3. `common.js` reads `REFERENCE_MESSAGES.config` lazily (first `showLoop` / `initializeElements`)
4. `link_adapter.js` delegates reference links to the live standalone hyperlink module; its hyperlink-owned fallback covers startup/tests before the dialog instance is available

`context.js` `templatePath` must match `messages.json` → `config.assets.template`.

## Pre-Vite loading

| Asset | How it loads |
|-------|----------------|
| **Styles** | Gulp bundles [`styles.scss`](./styles.scss) — path in `config.assets.styles` |
| **JS** | Dynamic `import()` in `_importDependencies()` on `index.js` and mode files; [`common.js`](./common.js) has one static dependency, [`link_adapter.js`](./link_adapter.js) |

## Files

| File | Role |
|------|------|
| `context.js` | Thin webpack entry — path, templatePath, messages supportingFiles; `resolveDebounce` → `window.referenceResolveDebounce` |
| `messages.json` | Canonical DOM ids, token map, field schema, asset paths, labels |
| `common.js` | Payload, collect, FormChrome, citations, query workflow, field UI helpers |
| `link_adapter.js` | Single reference-side adapter for DOI, URL/URI, `pub-id`, and PMID descriptors |
| `index.js` | Event adapter, DOI fetch, submit routing (debounce via `window.referenceResolveDebounce`) |
| `insert_mode.js` / `edit_mode.js` / `query_mode.js` | Thin bridge adapters |

## Manual smoke

1. Context menu opens `#ReferenceDialog`.
2. Deprecated `MultiRefModule` still loads from `ref_form` paths while migration compatibility is required.
3. DOI / Form / Plain tabs, preview debounce, insert/edit/FRM_QRY unchanged behavior.

## Insert Notes

Plain-text insert uses Summernote on `#reference_plain_value` in production so inline formatting is preserved. Keyup, paste, and toolbar/programmatic changes schedule the same debounced `handleDebouncedFormInput()` path used by the dialog; that path refreshes preview and, in name-date mode, calls the existing `API_ANYSTYLE_CROSS_REF_API` flow for `plainCite`.

Plain-text insert intentionally keeps state minimal. `collectPlainTextIntoState()` reads only the Summernote HTML and `#reference_plain_text_cite`; it does not refresh open-form values, authors, editors, translators, or DOI state. `FormChrome.renderPlainTextInsert()` also short-circuits the structured field UI, leaving only the insert-method controls, plain-text editor, optional cite-label input, preview, and footer actions.

When an in-text citation is inserted, it is always an anchor element created through `createReferenceElement('a', ...)` with the standard `xref` / `bibr` attributes. For plain-text name-date insert, the editable `#reference_plain_text_cite` value is the final source of truth at submit time; AnyStyle/`namedCitation` may prefill it, but submit wraps the current edited value instead of caching earlier citation HTML.

Books clients (`!IS_JOURNAL`) expose both insert actions. The primary button inserts the reference plus the in-text citation; `#reference_insert_ref_wo_cite` sets the `refOnly` path and appends the reference without inserting citation HTML. Journal-only interest-level attributes such as `data-interest-level="special"` and `data-interest-level="outstanding"` must not be treated as part of the books insert contract.

Inserted references record the submit method on the outer `.ref` as `data-ins-type="doi_form"`, `data-ins-type="open_form"`, or `data-ins-type="plain_text"`. Plain-text references also set `data-cite-label` when AnyStyle/name-date cite generation provides a non-empty label. The inserted reference internals are wrapped as `insert[data-track-code="ref-01"] > span.mixed-citation`; numbered journal labels are wrapped separately when a numbered label is generated.

Books edit/query title/source/collab demand fields still use plain Summernote (no toolbar / no keyboard formatting) and carry leaf `innerHTML`. Author/editor names and publisher fields (`publisher-name`, `publisher-loc`) are temporarily normal inputs until that rich path is re-enabled. Debounced updates reuse the insert/DOI-fetch full-template preview path (`refreshPreview` → `buildReferenceFromPayload`).

Edit and query opens may receive a clicked child leaf or `.mixed-citation` node. `resolveRefNode()` must normalize that input back to the owning outer `.ref` before `ref_bridge.prepareTemplate(...)`, otherwise edit prefill will not read context values.

DOI, URL, and PMID values stay independent as `values.doi`, `values['ext-link']`, and `values['object-id']`. Fetch validation, preview, insertion, edit, reopen, and tracked href recovery all pass through `resolveReferenceLinkField()`. The bridge uses the returned semantic token for the active CEG slot and does not infer link type from text or client names.

**Strict CEG-order rule:** when the active style has a non-empty `order`, that order is the only field membership and placement authority for insert panel visibility, preview, and generated citation DOM. DOI/API response keys provide values only; an API-only field is retained in the fetch snapshot but cannot create a rendered field or orphan. Existing document leaves absent from the order keep the edit/query orphan policy. Fallback field order applies only when no usable style order is loaded.

Query mode mirrors the legacy dynamic response contract. When a user fills missing reference data and clicks the normal update action, the module builds `Label: value` response lines from the keyed missing values, saves them through `queryModule.operationInsertOrUpdate(...)`, and closes the active query. `Update with Command` uses the explicit response textarea instead. Query/comment nodes are kept outside `.mixed-citation` before the live mixed citation is rebuilt.

Batch plain-text insertion is local-test-only through `InsertReferenceMode.insertPlainTextBatchForLocalTesting(...)`. The dialog splits Summernote HTML into paragraphs, resolves each paragraph independently through the existing AnyStyle/CrossRef endpoint, and stores ordered `bulkPlainEntries` containing the untouched paragraph HTML, API response, generated cite label, resolved type, and status. Successful entries are reused while their paragraph HTML is unchanged. The batch loop reuses the normal single-reference `submit()` and `applyBuilt()` flow so generated ids and labels stay sequential; a failed citation lookup inserts that paragraph as reference-only.

While Bulk insert is selected, the shared Citation Text control is hidden and whole-editor citation lookup is skipped. Clearing Bulk insert removes the prepared entry cache and restores the normal editable single-reference citation control. API metadata never replaces or restructures the original paragraph HTML used for `.mixed-citation`.

## Automated tests

```bash
npx vitest run tests/unit/ref_bridge/refBridgeHybridUi.test.js
npx vitest run tests/reference-pipeline.test.mjs
node --check src/modules/standalone/reference/common.js
node --check src/modules/standalone/reference/index.js
node --check src/modules/standalone/reference/query_mode.js
```
