# Reference module — test coverage, validation, and element-specific behavior

Status summary of the reference-citation module (`src/modules/standalone/reference/` +
`src/modules/standalone/ref_bridge/`) covering: what's unit tested, what gates submission in
each mode, and how individual citation elements are handled differently across modes. See the
per-mode contract docs ([insert_mode.md](insert_mode.md), [edit_mode.md](edit_mode.md),
[query_mode.md](query_mode.md)) and [../../ref_bridge/README.md](../../ref_bridge/README.md)
for full technical detail — this doc is a rollup.

## 1. Test coverage

Reference tests are split across the bridge, dialog, and hyperlink-module folders:

| Area | Files | Focus |
|---|---|---|
| `tests/unit/ref_bridge/` | 41 | Core citation-building engine: DOM construction, CEG style config parsing, delimiter/punctuation rules, author/editor/translator groups, CrossRef/DOI fetch, insert/del change tracking, rich-text handling |
| `tests/unit/reference/` | 9 | Dialog-level behavior: insert DOI validation, context-menu gating, type visibility, field freeze rules |
| `tests/unit/hyperlink/` | Resolver contract | Client-aware DOI/URL/`pub-id`/PMID descriptors and mode-neutral behavior |

Largest single files: `refBridgeHybridUi.test.js` (190 tests, hybrid insert/edit/query UI),
`refBridgeWipModes.test.js` (38 tests, mode-adapter contracts), `refBridgeCegPunctuationElide.test.js`
(29 tests, CEG punctuation/elide/field-ordering rules — includes this week's fixes, below).

**Current baseline:** 71 pre-existing test failures (tracked, not regressions — flagged and
stable across recent sessions), remainder passing. Every fix landed this week added net-new
passing tests with zero change to that baseline.

## 2. Validation per mode (what gates submit)

| Mode | Submit requires |
|---|---|
| **Insert** | Depends on method: plain-text needs non-empty text; DOI-form needs DOI content + author group + mandatory fields to all validate; open-form needs at least one author name OR one of year/source/title populated. Full submit chain additionally checks cursor position and duplicate-reference detection. |
| **Edit** | At least one field value or one author name is non-empty. Submit returns immediately (no error toast) when this fails. |
| **Query** | At least one field is flagged missing, or has a value. The two footer actions ("Update" vs "Update with Command") gate independently — the command variant instead checks whether the response textbox has text. |

## 3. Element-specific handling per mode

- **Rich text vs plain input:** Journal citations keep plain inputs except `article-title`
  (Summernote). Book citations use plain Summernote (no formatting toolbar/shortcuts) for
  `article-title`, `chapter-title`, `source`, and `collab` in both edit and query. Author/editor
  names and `publisher-name`/`publisher-loc` are temporarily plain inputs pending a config flag.
- **Book vs journal:** Books expose a second insert action ("ref only, no citation"); journal-only
  interest-level flags must not appear on books.
- **Author/editor/translator groups:** Built per CEG `<trim>` rules (e.g. CMS-18: show first 4,
  keep 1, et al. the rest). The et al. marker lives inside the person-group, not as a separate
  element.
- **Punctuation wrapping:** CEG `<punctuation AddBefore/AddAfter>` rules wrap specific leaf
  boundaries (e.g. curly quotes around a title). **Fixed this week:** the wrap is now skipped
  when the leaf's own content already contains that punctuation, preventing doubled quotes on
  citations where the source document already had them embedded.
- **Page-range elide:** `<elide>` rules shorten/expand `lpage` (e.g. `145–149` ↔ `145–9`) before
  any change comparison, so a shorthand-typed range that matches the elided document value
  produces no spurious tracked change.
- **Delimiter tracking:** Text between two citation elements (e.g. `vol. 27. Berlin`) is tracked
  and diffed on submit like any other field. **Fixed this week:** a field whose style-config entry
  is missing from the active CEG style's field order (e.g. `publisher-loc` not listed in Book-Ref)
  was previously mis-sorted to the very front of the rebuilt citation, which both misplaced the
  field and broke delimiter tracking for its neighbors — any literal text between it and an
  adjacent field (such as a bare volume number) was silently dropped on save. Such fields are now
  anchored next to their actual document neighbor, preserving both position and delimiter text.
- **Original-value tracking:** Each field's "original" (what was on the page when a dialog opened)
  is captured once, independent of whether config or document data wins the merge, and is
  identity-aware — reopening a citation already marked up by another reviewer resolves the
  correct baseline to diff against rather than always reverting to the same-user's stale edit.
- **Reference links:** One adapter resolves DOI, URL/URI, `pub-id`, and PMID for every mode. Tests cover simultaneous DOI+URL slots, client URI-shaped DOI output, tracked href fallback, orphan placement, reopen, and dynamic delimiter-prefix deduplication.

## Recent fixes (this session)

1. **Punctuation deduplication** (`ref_bridge/index.js`) — quote wrap no longer doubles when
   already present in citation content. 9 new tests.
2. **Orphan field ordering** (`ref_bridge/index.js`, `mergeTemplateSources`) — fields missing from
   the CEG style's order now sort next to their real document neighbor instead of the front of the
   citation; fixes both field placement and delimiter-text loss for such fields. 4 new tests.
3. **Split editor person-group parsing** (prior session) — a role split across multiple separate
   `<span class="person-group">` elements is now fully read, instead of silently dropping every
   contributor after the first span.
4. **Unified reference links** — hyperlink rules now return one descriptor consumed by fetch, preview, insert, edit, reopen, and tracking lookup; reference code no longer repeats DOI classification or element-shape rules.

## 4. Before / After — original vs. output (edit and query mode only)

Plain original-document HTML on the left of each pair, what gets saved/rendered on the right.
`<insert>`/`<del>` tags are the module's own change-tracking markup, shown to reviewers as
inserted/struck-through text.

### 4.1 This session's fixes

**Punctuation AddBefore/AddAfter — no longer doubles existing quotes**

| Original (already has curly quotes) | Output before fix | Output after fix |
|---|---|---|
| `“A New Chapter.”` *(chapter-title, quotes already in content)* | `“"A New Chapter."”` *(doubled)* | `“A New Chapter.”` *(unchanged)* |

**Left-over element tracking — orphan field (`publisher-loc`, not in CEG style order)**

| Original document | Output before fix | Output after fix |
|---|---|---|
| `<span class="volume">vol.</span> 27.  <span class="publisher-loc">Berlin</span>` | `publisher-loc` sorted to the very front of the citation; `27.` delimiter silently dropped on save | `<span class="volume">vol.</span> 27.  <span class="publisher-loc">Berlin</span>` *(position and delimiter both preserved; a real edit here now tracks correctly with `<insert>`/`<del>`)* |

**Repeated/split editor `person-group` — every contributor now parsed**

| Original document | Parsed before fix | Parsed after fix |
|---|---|---|
| `edited by <span class="person-group" person-group-type="editor"><span class="string-name">Robert Audi</span></span> and <span class="person-group" person-group-type="editor"><span class="string-name">David Phillips</span></span>` | editors = `['Audi']` *(Phillips silently dropped)* | editors = `['Audi', 'Phillips']` |

### 4.2 Validation gating (`canSubmit`)

**Edit mode**

| Field state | Result |
|---|---|
| Every field empty, no author names | Submit blocked — button click returns immediately, no error shown |
| At least one field has a value, or one author has a surname/given name | Submit allowed |

**Query mode**

| Field state | Result |
|---|---|
| No field flagged missing, all values empty | Submit blocked |
| At least one field flagged missing, or has a value | Submit allowed |
| ("Update with Command" only) response textbox is empty | Blocked silently, independent of field state above |

### 4.3 Core tracking cases (edit/query)

Source of truth: [`track.js`](../track.js) class docstring / [`tracking.md`](../tracking.md).

| Case | Original | Output |
|---|---|---|
| Empty field, now filled | `<span class="volume"></span>` | `<span class="volume"><insert>12</insert></span>` |
| Field had a value, changed | `<span class="year">2008</span>` | `<span class="year"><insert>2018</insert><del>2008</del></span>` |
| Field had a value, now cleared | `<span class="publisher-name">Cornell University Press</span>` | `<span class="publisher-name"><del>Cornell University Press</del></span>` |
| Field unchanged | `<span class="year">2008</span>` | `<span class="year">2008</span>` *(no tracking markup added)* |
| "et al." checked, source had none | `…<span class="surname">Smith</span>…` | `…<span class="surname">Smith</span>…<span class="etal"><insert>et al.</insert></span>` |
| "et al." unchecked, source had it | `…<span class="etal">et al.</span>` | `…<span class="etal"><del>et al.</del></span>` |
