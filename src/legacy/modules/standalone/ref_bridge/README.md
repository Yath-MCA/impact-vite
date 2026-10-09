# RefBridge

Builds a full reference `<div class="ref">…<span class="mixed-citation">…</span></div>` structure
from either the in-document template (an existing sibling `.mixed-citation`) or a client's
`refStyling_*.xml` config, merged per `resolveSourcePolicy()`.

## JSON payload API (return HTML/DOM)

Primary builders **return** DOM (and `outerHTML`) — callers own append/replace into the editor.

| Method | Role |
|--------|------|
| `normalizePayload(payload)` | Map camelCase JSON → `{ refType, values, authors }` |
| `buildReferenceFromPayload(payload, options?)` | Insert: return `{ refNode, html, preview, state, mixedCitation, mixedCitationHtml }` |
| `buildEditReferenceDom(state\|payload, options?)` | Edit: return cloned `.ref` with tracked leaf changes + `mixedCitation` |
| `buildQueryReferenceDom(state\|payload, options?)` | Query: return cloned `.ref` with missing fields filled + `mixedCitation` |

Example insert payload:

```js
{
  type: 'journal', // book | ed-book
  author: [{ index: 0, surname: 'Ayaz', givenname: 'Yasar' }],
  year: '1999',
  articleTitle: '...',
  source: '...',
  fpage: '1',
  lpage: '10',
  doi: '10.1000/example'
}
```

Key map: `articleTitle`→`article-title`, `givenname`→`given-names`, `doi`→`ext-link`,
`chapterTitle`→`chapter-title`, `publisherName`→`publisher-name`, `publisherLoc`→`publisher-loc`.

When `author[]` is present, the bridge emits
`person-group[person-group-type=author]` → `string-name` → `surname` / `given-names`.
If `author[]` is empty, flat `surname` / `given-names` fields are used (legacy path).

### Contributor / trim (CEG)

| Method | Role |
|--------|------|
| `getContributorTrim(refType, groupName)` | Read `<trim name="author\|editor\|…">` → `{ count, after, insert, style, delim }` |
| `applyContributorTrim(people, trim, { forceEtal })` | Keep first `after` when `length >= count` (MultiRef); optional manual etal |
| `getContributorGroup(refType, groupName)` | `<group>` first/rest name order |
| `createPersonGroup(people, { groupType, etal, etalDelim, nameOrder })` | Build `person-group` |
| `resolveContributorGroupContext(refType, groupType, delimiters, delimitersLast)` | One read: order, trim, styleIds, delimiter maps |
| `buildContributorPersonGroup(people, groupType, refType, options)` | Single entry for author / editor / translator groups |

Payload may include `editor[]` / `translator[]` (same `{ index, surname, givenname }` shape), `collab` (institution name leaf), and `etal: true` to force author etal under the limit. Trim is style-driven (CMS-18 journal often `count=4 after=1`; ANNWEH `count=6 after=1`).

**Collab / etal order slots:** CEG `order` lists `author`, then often `‡ref_etal`, then `‡ref_auCollab`. The bridge emits one author `person-group`; when etal is inside that group (trim or manual), the order-slot `etal` entry is a delimiter placeholder only (no duplicate `.etal` leaf). `collab` always emits as a `.collab` leaf when `values.collab` is set.

`applyInsertReference` / `applyEditReference` / `applyQueryMissingUpdate` wrap the return APIs and
apply into the live document by default (`options.apply !== false`). Pass `apply: false` to get
return-only behavior from the apply helpers.

### Plain text insert

`buildPlainTextReference({ text, refType, plainCite }, { rid })` returns an inserted `.ref` whose
mixed citation is built directly from the provided HTML:

```html
<div class="ref" data-name="ref" data-role="ref" data-new="s" data-ins-type="plain_text" data-cite-label="Marti 2008b">
  <insert data-track-code="ref-01">
    <span class="mixed-citation" data-name="mixed-citation" publication-type="journal" data-plain-text="true">...</span>
  </insert>
</div>
```

The bridge strips `script`, `style`, and inline event handler attributes from that HTML, but it does
not parse it into structured reference leaves. `data-cite-label` is only emitted when `plainCite` is
non-empty.

### Insert metadata and wrappers

New insert builds stamp the outer `.ref` with `data-ins-type` when the caller provides a supported
method: `doi_form`, `open_form`, or `plain_text`. Insert-mode mixed citations are wrapped in
`insert[data-track-code="ref-01"]`, using `window._trackManager.getInsNode(...)` when available and a
minimal `<insert>` fallback for tests/no tracker. Numbered journal labels can also be wrapped by the
standalone insert adapter before the reference is appended.

Edit/query rebuilds do not add new reference insert wrappers. They continue to use their own
leaf-level insert/delete tracking for changed or missing content.

### CrossRef / DOI

RefBridge owns CrossRef fetch, normalize, config, and audit logging in `RefBridgeCrossRef` (same file as `RefBridge`; instance methods delegate to it). Legacy `window.CROSS_REF_API`
is a thin delegate shim created by RefBridge for backward compatibility.

| Method | Role |
|--------|------|
| `loadCrossRefConfig()` | Lazy-load `cross_ref_api` client config via `GET_CONFIG_ITEM` |
| `fetchDoi(doi, options?)` | DOI lookup via `API_CROSS_REF_API`. With `onSuccess` / `callback`: bridge-owned ajax handler parses `response.restext`, invokes callback with **raw parsed JSON**, optionally records audit. Without callback: legacy MultiRef path via `JSON_2_DIALOG`. |
| `fetchPlainTextBibliography(text, options)` | Plain-text bibliography lookup via `API_ANYSTYLE_CROSS_REF_API` (requires callback). |
| `filterCrossRefData(response)` | CrossRef REST / array normalize (MultiRef plain-text cite). |
| `parseFlatDoiApiResponse(jsonObj)` | Flat backend DOI payload parser (MultiRef DOI fetch). |
| `normalizeCrossRefResponse(response)` | Bridge field shape `{ type, doi, author, title, journal, year, … }`. |
| `recordCrossRefResponse(response, options?)` | Audit `UserPreference` insert via `commonfn.callajax`. |
| `resolveCrossRefEndpoint(apiPath)` | Localhost rewrite to `/impactapinew/{endpoint}`. |

Callback options for fetch methods:

```js
bridge.fetchDoi('10.1000/example', {
  onSuccess(parsed) { /* raw JSON from response.restext */ },
  onError(response, err) { /* optional */ },
  record: true,           // default true — writes audit via sendRecordDb
  recordType: 'fetch_doi' // or 'fetch_plainText'
});
```

Callers normalize with `normalizeCrossRefResponse(parsed)` in `onSuccess` (WIP Reference does this in `applyDoiResponse`).

### Reference DOI / URL / PMID leaves

`createLeafNode`, document readback, and tracking lookup use the shared
`reference/link_adapter.js` contract. The adapter delegates to
`hyperLinkDialog.resolveReferenceLink(...)` and returns a canonical semantic token plus the
client/DTD-specific element type (see [`hyperlink_module/link-helper-scope.md`](../hyperlink_module/link-helper-scope.md)).

| Semantic token | Possible element output |
|----------------|-------------------------|
| `doi` | `pub-id`, DOI `ext-link`, or client-configured `uri` |
| `ext-link` | URL `ext-link` or `uri` |
| `object-id` | PMID `object-id[pub-id-type=pmid]` |

The bridge does not re-run DOI regexes, expand partial DOI text, coerce `uri` to `ext-link`, or
choose a slot from element shape. It builds the returned `displayValue`, `href`, and `attributes`.
The hyperlink-owned fallback is used only when the live dialog has not initialized.

### Journal abbreviation output

When the active `Journal-Ref` style declares `abb_expansion="‡ref_titleJournal"` and
`abb_out="EXP"`, the bridge resolves `values.source` to a full journal title before slot rendering.
The resolver loads `src/clientconfig/journals/abbr.json` in the browser, treats the first tabbed
column as the full title, and matches all later abbreviation columns case-insensitively while
ignoring punctuation and extra spaces. Existing full-title values are left unchanged. `abb_out="ABB"`
and `abb_out="A.B.B"` are not expanded by this pass.

## CMS18 style names

`refTypeToStyleName()` maps the form's `refType` to the `<style name="...">` attribute value in
`src/clientconfig/books/oso/ceg/refStyling_CMS 18.xml`. Only these three styles are active
(everything else in that file is commented out):

| refType    | XML style name   |
|------------|------------------|
| `journal`  | `Journal-Ref`    |
| `book`     | `Book-Ref`       |
| `ed-book`  | `EditedBook-Ref` |

## Runtime config loading

`getStylePattern()` (and therefore `getConfigTemplate()`) reads `this.globalObject.iREF_SCOPE.DOC`
synchronously — `RefBridge` never fetches the style XML itself. That XML is fetched once, at page
boot, by `CegConfig` (`src/js/_initialScriptLoader.js`), which is instantiated as
`LoadingConfig.CEG_CONFIG` and carries the `FILE_NAME`/`URL`/`IS_LOADED`/`IS_RETRY`/`ORDER`/`STYLE`/
`TYPE` state for that fetch. On a successful response, `CegConfig.prototype.handleResponse` sets:

```js
iREF_SCOPE['DOC'] = response.responseXML;
```

— the exact global `getStylePattern()` reads. By the time any editing session runs (and `RefBridge`
is instantiated), this fetch has already completed as part of the app's initial batch config load
(`LoadingConfig.prototype.load`, alongside `META_CONFIG`/`CLIENT_CONFIG`/`LANG_CONFIG`/`ICO_FILE`).

If `CEG_CONFIG` hasn't loaded (a book/journal with no CMS-style config, or a load failure —
`CegConfig` retries and logs via `ErrorLogTrace('CEG_CONFIG_FETCH'/'CEG_CONFIG_HANDLE', ...)` on its
own), `iREF_SCOPE.DOC` is simply absent or stale. `getStylePattern()` guards for `!doc ||
!doc.querySelector` and returns `null`, which `getConfigTemplate()` turns into the empty fallback
template (`{ fields: [], delimiters: {}, source: 'fallback' }`), and `resolveSourcePolicy()` /
`mergeTemplateSources()` correctly fall through to the document-based path. `RefBridge` does not
need its own fetch, retry, or loaded-state tracking — that already lives in `CegConfig`, and
duplicating it inside `RefBridge` would create a second, competing source of truth for
`iREF_SCOPE.DOC`.

When a loaded style exposes a non-empty `order`, insert rendering treats its normalized tokens as a
strict allow-list and ordering contract. Payload and DOI/API keys provide values but cannot create
additional leaves. This restriction is insert-only: edit/query can retain document-sourced leaves
outside the order so the established orphan review workflow can relocate and track them. An empty
fallback template keeps the legacy payload/document field behavior.

## styleId -> token map

`styleIdToToken()` translates a CMS18 `‡ref_*` style id (as used in a `<style>` element's `order`/
`missing` attributes and its `<delimiter><element first= next=>` entries) into the field token used
throughout this codebase (the same tokens as `GlobalAttributes`/`templateStringCollection` in
`src/modules/standalone/ref_form/index.js`). `‡ref_titleJournal` and `‡ref_titleBook` both resolve to
`source` — they never appear in the same style's `order` list, so there is no collision there. The
delimiter map, however, keys on the real style-id pair first (see "Delimiter resolution" below)
specifically because token pairs like `ext-link->ext-link`-adjacent entries (`‡ref_idDOI` and
`‡ref_URL` both map to `ext-link`) WOULD collide if delimiters were keyed by token alone. Pseudo-ids
that appear in `order`/`missing` but are not real style ids (`author`, `editor`, `URLprefix`,
`URLSuffix`) resolve to `''` and are filtered out by `getConfigTemplate()`.

## Group expansion (`author`/`editor` pseudo-tokens)

The real CMS18 XML never lists individual author/editor name style ids directly in a `<style>`
element's `order`/`missing` attributes — it lists the literal placeholder token `author` or `editor`,
and the real per-field ids (`‡ref_auSurname`, `‡ref_auGivenName`, `‡ref_edGivenName`,
`‡ref_edSurname`, etc.) live inside a separate `<group name="author" first="...">` /
`<group name="editor" first="...">` element in the same style.

`getConfigTemplate()` calls `getGroupFirstMap(style)` to build a `{groupName: [realStyleIds]}` map
from every `<group>` element's `name` and `first` attributes (keeping only the FIRST `<group>` per
name if a style defines more than one — e.g. `EditedBook-Ref` has two `<group name="editor">`
elements), then calls `expandGroupTokens(rawList, groupMap)` to splice those real ids into the
`order`/`missing` lists in place of the pseudo-token, before token-mapping and filtering.

## Delimiter resolution

`getConfigTemplate()` builds each `<delimiter><element first= next=>` entry into TWO map keys: the
real style-id pair (`‡ref_pubdateYear->‡ref_idDOI`) and the token pair (`year->ext-link`). The
style-id key is unambiguous — style ids never collide — and `resolveDelimiter()` prefers it whenever
both fields being joined carry a `styleId` (which config-sourced fields always do). The token key is
kept only as a fallback for token-only lookups and for document-sourced fields, where `styleId` and
`token` are already identical.

Group pseudo-tokens (`author`/`editor`) that appear as a `first`/`next` attribute in a `<delimiter>`
entry are resolved via `resolveDelimiterBoundaryId()` to the group's actual last (for `first=`) or
first (for `next=`) real, non-empty-token id before building either key — this is what makes the
delimiter immediately after an author/editor name group (a very common position, e.g. right before
the year) resolve correctly instead of silently falling back to a plain space.

### Redundant leading-dot collapsing

A leaf/group's own trailing text can already end in a period — most commonly an abbreviated
given-name (`"R."`). If the delimiter resolved for the boundary right after it also starts with a
period (e.g. `". "` before the title), appending it literally would produce a double dot (`"R.."`).
`renderCitationSlots()` runs every resolved delimiter (including the terminal one) through
`collapseRedundantDelimiterDot(delim, precedingNode)` before appending it: if `precedingNode`'s
`textContent` already ends in `.` (allowing trailing whitespace) and `delim`'s first character is
also `.`, only the delimiter's leading dot is dropped — the element's own dot is data and is never
touched. This is a single, general render-time guard (not a per-style `ReplaceDelim` rule in the CEG
XML — the config's own `CleanupAfterStyling` block only covers one narrow, unrelated case: an article
 title ending in `?`/`!`, and isn't wired into this codebase at all).

### Redundant delimiter-prefix collapsing

Before appending an inter-field delimiter, `collapseRedundantDelimiterPrefix(delim, next)` compares
the delimiter suffix with the beginning of the next leaf's resolved display value. A matching
meaningful overlap, such as `https://doi.org/`, is removed from the delimiter only. The leaf text,
href, and state value are preserved. This is dynamic and applies to any configured style; it does
not check CMS18, a client name, or a hard-coded DOI slot.

## CEG `<punctuation>` and `<elide>` (page-range) support

Two CEG XML elements this codebase previously ignored entirely:

- `<punctuation style="STYLEID" AddBefore="…" AddAfter="…">` — wraps a specific styleId's leaf
  boundary with literal text (e.g. curly quotes around `‡ref_titleArticle`/`‡ref_titleChapter`).
  Only `AddBefore`/`AddAfter` are implemented; `SingleQuoteEndPunc`/`RemoveEndPuncOnSingleQuote`
  are read by nothing here and are out of scope.
- `<elide first="‡ref_pageFirst" next="‡ref_pageLast" trim="…" expand="…">` — shortens or expands
  `.lpage` relative to `.fpage` (e.g. `145–149` ↔ `145–9`). `expandOrTrimPageRange()` is a direct
  port of the legacy `shortenRange()` in `src/_deprecated/ref_form/index.js`, verified against its
  documented example table.

**Punctuation wrap is a leaf-boundary case, not a field-value case.** `getDocumentWrapText()`
(returned as `getDocumentTemplate().wrapText`) captures, for every token with a real
`getPunctuationRuleForToken()` match, the exact rule-length slice nearest the leaf on each side —
never the whole adjacent span, since that would swallow real delimiter text sitting right next to
it (a leaf's boundary and the inter-leaf delimiter routinely share one merged Text node whenever
the DOM came from HTML string parsing, which is how every existing stored citation loads).
`renderCitationSlots()` emits the `AddBefore`/`AddAfter` text for every build mode. At submit,
`applyPunctuationWrapTracking()` — a leaf-boundary analogue of `applyDelimiterTracking()` — uses
`isolateWrapNode()` (`Text.splitText`) to carve out just that rule-length slice from the leaf's
immediate sibling text, leaving the delimiter portion of a shared node completely untouched, and
wraps only the slice that actually changed. It **must run before** `applyDelimiterTracking()`:
once delimiter tracking replaces a shared span with `<del>`/`<insert>` elements, there is no Text
node left for wrap tracking to split. Like delimiters (and unlike `originalValues`), the document
side is recomputed fresh from `source` at submit time — no `state`/`{mode}.js` plumbing was added.

**Page-range elide reuses the existing field-comparison pipeline** rather than a new mechanism:
`runApplyUpdate()` transforms `values.lpage` through `expandOrTrimPageRange()` before it reaches
`compareField`/`decideFieldTrack`, so an unchanged (but shorthand-typed) range produces no wrapper,
and a real change is tracked using the transformed text that actually gets written to `.lpage`.

## Known limitation: bare `suffix` in Book-Ref/EditedBook-Ref groups

`Book-Ref` and `EditedBook-Ref`'s `<group name="author">` elements list a bare `suffix` token (not
`‡ref_auSuffix`) in their `first` attribute — inconsistent with `Journal-Ref`, which correctly uses
`‡ref_auSuffix`. This appears to be a data quirk in the client's own XML, not something this codebase
should silently "correct" by guessing intent. `styleIdToToken('suffix')` returns `''` (unrecognized),
so the suffix field is silently dropped for books/edited-books — acceptable since `suffix` is not a
prominent field in this codebase's vocabulary (it's absent from `defaultFieldOrder`).

## Document read-back (edit / query)

`getDocumentTemplate()` parses `.person-group[person-group-type=author|editor|translator]` into
`authors[]` / `editors[]` / `translators[]`, detects in-group `.etal` for `values.etal`, and excludes
person-group inner leaves from flat field scanning (`.collab` and other mixed leaves remain).

`prepareTemplate({ mode: 'edit', refNode })` returns these arrays for WIP edit/query prefill.

## `field.original` lifecycle (edit/query only; insert never has one)

`original` is a plain property on each field object in `state.fields` (looked up by `.token`,
never a separate map). It exists purely to let `track.js` diff "what was on the page when the
dialog opened" against "what's in the form now" at save time.

**Created once, at open (or ref-type switch), nowhere else:**

1. `index.js: show()` → `this.prepareTemplate()` (dialog open only — also re-runs on a manual
   ref-type switch mid-edit, `index.js: handleTypeChange` → `this.prepareTemplate()`).
2. `ref_bridge/index.js: getDocumentTemplate(refNode, refType)` is the only place `original` is
   ever assigned: `original: value` from the leaf's live DOM text, `source: 'document'`.
3. `ref_bridge/index.js: getConfigTemplate()` fields never carry `original` at all — they're
   derived from the CEG XML, not the document.
4. `ref_bridge/index.js: mergeTemplateSources(configTemplate, documentTemplate, policy)` picks one
   side as `primary` per token; only `primary`'s copy of a token survives merge. When
   `resolveSourcePolicy()` returns `'config-first'` (books under a `refstyle === 'cms18'` client),
   the config copy — which has no `original` — wins over the document copy for every token defined
   on both sides, so `field.original` itself is still lost for that token.
5. `{mode}.js: withTemplate(state, template, bridge)` spreads `template.fields` into `state.fields`
   — whatever `original` survived step 4 rides along untouched.

**Fixed:** `prepareTemplate()` now also builds `state.originalValues`/`state.originalInlineFormats`
directly from `documentTemplate.fields`, before `mergeTemplateSources` runs, so they are immune to
the `config-first`/`document-first` policy choice. `track.js`'s `applyUpdate` prefers
`originalValues[token]` when present, falling back to `field.original` for any caller that hand-builds
`state` without going through `prepareTemplate()` (existing tests and any direct API caller).
`field.original`/`field.inlineFormat` remain on the field object unchanged — they are not removed.

**Every subsequent tick preserves it, never recomputes it:** `index.js: collectIntoState()` (runs
on every debounced form-input change) calls `common.js: reconcileMappedFieldsFromValues(state)`,
which restamps `.value` from `state.values` but explicitly keeps the existing `original`:

```js
original: current.original != null ? current.original : (templateField.original || '')
```

**Preview never reads it:** `index.js: refreshPreview()` → `buildReferenceFromPayload()` →
`buildReferencePreview()` only resolves `.value` (via `resolveFieldValue`) — `original` plays no
role in what the live preview renders.

**Consumed only at submit**, in the leaf/ref rebuild path:
`{mode}.js: submit()` → `applyEditReference()` / `applyQueryMissingUpdate()` → `runApplyUpdate(mode,
{ mixed, source, fields, values, originalValues, originalInlineFormats })` → `track.js:
ReferenceTrack.applyUpdate()`, which resolves each field's effective original as
`originalValues[field.token] != null ? originalValues[field.token] : field.original` (preferring the
merge-immune map, falling back to the field object only for callers that bypass `prepareTemplate()`),
then calls `compareField({ original, current: values[token], leaf })` per field and
`writeLeafAction()` to wrap the diff in `<insert>`/`<del>` in the rebuilt DOM. `source` here is the
**original**, still-untouched `.ref` node (or, for query, a `cloneNode(true)` snapshot taken before
rebuilding) — `mixed` is the freshly rebuilt DOM the new leaf actions get written into.

## Identity-aware original for an already-tracked leaf

When a leaf already carries `<insert>/<del>` from a prior edit round, `getDocumentTemplate()` (via
`buildDocumentLeafField()`) resolves the next round's `original` by who the existing pair belongs
to, using `resolveTrackedLeafOriginal(el, token)`:

- No `<insert>`/`<del>` at all → unaffected, falls through to the existing untracked-leaf logic.
- `<del>` present and it belongs to the current user (`commonMethods.IS_SAME_USER_AND_ROLE`,
  checked via the existing `isSameUserTrackNode`) → `original` is the `<del>`'s own content — the
  true original stays the anchor while this round's edit supersedes the user's own stale insert.
- `<del>` present but owned by a different user, or identity cannot be determined at all (no track
  manager, no `commonMethods`, missing `data-username`/`data-rolename`) → `original` is the
  `<insert>`'s own content — a different reviewer's edit is tracked as a change from the currently
  visible state, not from the document's original genesis text. The "cannot determine" case
  deliberately takes this branch too: it's the safer default, since it never silently reverts a
  visible value back to a stale original the current reader may not know about.
- `<insert>` with no `<del>` (a pure pending addition) → same-user keeps `original: ''`
  (unchanged); different-user/unknown resolves to the insert's own value.

`value` is never affected — it's always the currently-visible content, exactly as before. This
fixes a real bug: plain (non-Summernote-rich) fields previously had no `<del>`-check at all, so
`original` silently collapsed to the same value as `value` (the insert's content) the moment a
plain field was reopened after being tracked once. Rich fields (`article-title`/`chapter-title`/
`source`) already checked `<del>` via `getRichLeafOriginalHtml`, but unconditionally — this unifies
both paths under one identity-aware method.
