# Insert mode — inputs / outputs

Shared open and preview live in [reference_dialog_flow.md](reference_dialog_flow.md). This file is the insert contract.

## Runtime path

Open starts on `doi_form`.

Dirty method change still confirms. Confirm clears the live form, then applies the new method. Cancel restores the method radio and does not clear state.

A plain-text type click keeps the existing Summernote content and cite label, skips confirm, and does not refresh preview. It only sets `refType`. Insert still collects live Summernote and builds with that selected type. A confirmed switch away from plain text parks `plainText`, `plainCite`, and `refType`; selecting plain text again restores them.

`open_form` dirty type change still confirms and clears. `doi_form` stays locked against a manual type change. Edit and query do not use this guard.

On Insert, `handleInsert(refOnly)` collects before validation:

- `doi_form` copies the fetched snapshot DOI into state. The open form is not the source of truth.
- After DOI type resolution, the module reloads the matching CEG template before hydration. With a non-empty style `order`, only configured tokens are copied into renderable values/fields; extra API metadata remains snapshot-only.
- `plain_text` calls `collectPlainTextIntoState()`, which already strips `<br>` from Summernote.
- `open_form` calls `collectIntoState()`.

`validateBeforeSubmit()` then stops on the first failure:

1. `doi_form`: `validateDoiInsertContent`, then `validateAuthorGroup` with highlight, then `validateMandatoryFields` with highlight.
2. `open_form`: `validateAuthorGroup` with highlight, then `validateMandatoryFields` with highlight. Do not stop at `computeCanSubmit` alone.
3. `plain_text` skips that structured stage. Emptiness uses `stripSummernoteBreaks` and then strips tags. `<br>` or `<p><br></p>` is `empty_citation`.
4. Cursor runs only after the checks that apply to the current method. Journal citation is required unless `refOnly`.

After those guards, `doi_form` runs `checkDuplicateReference()` again. Then `submit()` and `applyBuilt()`.

## Triggers

| Source | Action |
|--------|--------|
| Context menu / command `REFERENCE_FORM_OPEN` | `dialog.show('open' \| 'insert', …)` |

## UI inputs

| Control | State / notes |
|---------|----------------|
| Reference type (journal / book / ed-book) | `refType` |
| Insert method: DOI / Form / Plain | `insertMethod`: `doi_form` \| `open_form` \| `plain_text` |
| Authors repeater (+ et al checkbox) | `authors[]`, `values.etal` |
| Editors repeater (ed-book) | `editors[]` |
| Dynamic fields host | CEG order + `messages.json` field schema |
| DOI input + Fetch | `doi` → CrossRef normalize into values |
| Plain Summernote editor (+ cite) | `plainText`, `plainCite` |

## State keys

`mode`, `insertMethod`, `refType`, `values`, `fields`, `authors`, `editors`, `translators`, `doi`, `plainText`, `plainCite`, `canSubmit`, `preview` / `previewNode`, `sourcePolicy`, `template`, `contributorTrim`

## Payload JSON (form / post-DOI)

```js
{
  type: 'journal' | 'book' | 'ed-book',
  author: [{ index: 0, surname: 'Ayaz', givenname: 'Yasar' }],
  editor: [{ index: 0, surname: '…', givenname: '…' }], // ed-book
  translator: [], // when style has translator group
  etal: true, // optional manual force
  year: '1999',
  articleTitle: '…',
  source: '…',
  fpage: '1',
  lpage: '10',
  doi: '10.1000/example'
}
```

## Bridge calls

| Method | When |
|--------|------|
| `prepareTemplate` | Open / type change |
| `buildReferenceFromPayload` | Form / DOI insert preview + submit. DOI uses `stateFromDoiSnapshot()` before payload build. |
| `buildPlainTextReference` | Plain-text method |
| `createNewReferenceElement` | Outer `.ref` shell for both builders. Sets `class`, `data-name`, `data-role`, `data-new`, `id`, and `data-ins-type` once. |
| `getContributorTrim` / `applyContributorTrim` | Author/editor limits + etal |

## Plain-text branch

For `mode === 'insert'` and `insertMethod === 'plain_text'`, the dialog treats the typed/pasted reference as final mixed-citation HTML:

- `#reference_plain_value` is Summernote-backed when available, preserving inline formatting.
- Summernote keyup, paste, and change callbacks call the existing debounced form-input handler. That handler refreshes preview and, when name-date hints are enabled, calls the existing `API_ANYSTYLE_CROSS_REF_API` path.
- `collectPlainTextIntoState()` reads only `plainText` and `plainCite`; it preserves structured `values`, people arrays, and DOI state.
- `FormChrome.renderPlainTextInsert()` shows `#reference_type_options_form` (including Conf/Web/Other) and skips open-form field visibility. Type radios stay editable.
- `applyPlainTextCiteResponse(parsed)` prefers `namedCitation([jsonRef], { json: true })` for the editable cite label when the endpoint response contains author/year data, then falls back to normalized text. It also maps payload `type` (e.g. `article_journal`, `book`) onto `state.refType` via `resolveExternalRefType` (unmatched → `other`); the user may change type afterward.
- On Insert, `collectPlainTextIntoState()` reads live Summernote content first. `validateBeforeSubmit()` then treats remaining text as empty (`empty_citation`) after `stripSummernoteBreaks`. Cursor runs only when that text is non-empty.
- Submit uses the current `plainCite` value and wraps it in the standard `a.xref[data-role="bibr"]` citation anchor. Do not cache/reuse AnyStyle citation HTML because the cite field is editable.

## Books insert actions

For books clients (`!IS_JOURNAL`), insert mode exposes two footer actions:

- Primary insert: appends the new reference and inserts the in-text citation.
- `#reference_insert_ref_wo_cite`: uses `refOnly: true`, appends the new reference, and suppresses citation HTML insertion.

This books contract is separate from journal interest-level workflows. `data-interest-level="special"`
and `data-interest-level="outstanding"` are journal-only attributes and should not be applied to books
references or treated as part of the books “reference only” path.

## Books rich-field status

Plain-text insert Summernote remains enabled. Books edit/query title/source/collab fields can still
use plain Summernote, but author/editor surname and given-name fields plus `publisher-name` /
`publisher-loc` are temporarily normal inputs. Re-enable that path from the single
`ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE` switch in `common.js`.

## DOM output

- Return: `{ refNode, html, preview, state }` — structured refs build `div.ref` > `insert[data-track-code="ref-01"]` > optional `span.label` then `span.mixed-citation`. A numbered label is required unless name-date or `refOnly`. Required rich fields are read with `getRichTextValue`, not `el.value`.
- Apply: `getNextReferenceIdentity(refList)` assigns `{ rid, label, displayLabel }` before citation HTML (numbered clients get `data-label` + `.label` span); place into `.ref-list` via `applyBuilt` → `applyInsertToDocument`
- Placement: when `stateBag.contextRef` is a live `.ref` inside the target list **and** the client is name-date or books (`!IS_JOURNAL`), insert **after** that anchor (`insertAdjacentElement('afterend')`). Otherwise append to the end of `.ref-list` (numbered journal / no context ref).
- Inserted citation HTML: when not suppressed by `refOnly`, numbered, name-date, and plain-text insert paths return an `a.xref` with `data-name="xref"`, `data-role="bibr"`, `ref-type="bibr"`, `href`, `rid`, and `fid`.
- Insert metadata: `createNewReferenceElement()` sets `class="ref"`, `data-name`, `data-role`, `data-new`, `id`, and `data-ins-type` once (`doi_form`, `open_form`, or `plain_text`). Plain-text refs also get `data-cite-label` when `plainCite` is non-empty. Mixed-citation setup stays in each builder.
- Plain-text mixed citation: `span.mixed-citation[data-plain-text="true"]` receives the sanitized Summernote HTML as `innerHTML`, with no structured leaf spans.
- Numbered journal labels: when a numbered label is generated and `IS_JOURNAL` is true, `.label` is also wrapped in `insert[data-track-code="ref-01"]`.

## Local batch testing

`InsertReferenceMode.insertPlainTextBatchForLocalTesting(entries, bridge, options)` is a debug/local helper only. It accepts newline-delimited text or array entries, requires `options.localTesting === true` or localhost state, and loops through the existing single plain-text `submit()` + `applyBuilt()` path. Do not expose this as production UI or create a separate batch DOM builder.

### Offline CLI (paste-ready HTML)

```bash
node tests/unit/reference/build_bib_insert.mjs ^
  --last-ref-id="…-ref-474" --file="C:\path\to\bib.md"
```

Defaults: `--userid=9`, `--rolename=Collator`, `--username=impact-dev-collation@nkw.pub`, `--cid=6666`, `--ts=Date.now()` (current time). Per ref: `data-cid` and `data-time` / `data-last-change-time` increment by **+1**. Output beside source as `<stem>-result.html`.

**Split:** `.md`/`.txt` → one entry per non-empty line; `.docx` → one entry per Word paragraph. Helpers: `tests/unit/reference/bib_insert/`. Spec: `docs/superpowers/specs/2026-09-21-bulk-plain-text-reference-insert-design.md`.

### Plain-text dialog — Bulk insert checkbox

On localhost only (`IS_LOCAL_HOST`), the plain-text panel shows `#reference_bulk_plain_insert`. When checked, the shared cite input is hidden and the normal whole-editor AnyStyle lookup is disabled. Insert splits the Summernote content into one entry per paragraph, fetches each paragraph through the existing AnyStyle/CrossRef endpoint, and stores ordered `bulkPlainEntries` with `text`, `apiResponse`, `plainCite`, `refType`, and `citeStatus`. Exact-text entries with a successful stored result are reused; changed and failed entries are fetched again.

The paragraph's original HTML remains the `.mixed-citation` source. API data supplies only its cite label and reference type. The batch then calls `insertPlainTextBatchForLocalTesting` (same single-ref path per entry). A failed cite lookup inserts that paragraph reference-only and reports its one-based paragraph number. Clearing the checkbox clears the prepared entries and restores the single-entry cite input. The feature remains hidden outside local/testing.

## Errors

- Insert stays clickable when `canSubmit` is false. A failed guard toasts and returns. It does not disable the button.
- `empty_doi_content` / `empty_field` / `empty_au_field` / `CiteWarningAlert` / `empty_citation` → validation toasters. Stop on the first failing guard.
- `REF_IS_EXITS` → duplicate DOI warning on Fetch and again on Insert for `doi_form` only (`AlertNewDialog`)
- Missing `.ref-list` → toaster `ref-list-missing`
- Click path for `<br>`-only plain text → `empty_citation` before build
- `plain-text-empty` → builder reason when `buildPlainTextReference()` is given no text. The click path should not reach that builder for `<br>`-only content.

## Insert validation chain

On **Fetch**: `validateDoiFormat` delegates to `resolveReferenceLinkField({ expectedType: 'doi' })`, then `checkDuplicateReference` → CrossRef (or `sessionStorage` cache).

On **Insert**:

- `doi_form`: `validateDoiInsertContent` → `validateAuthorGroup` (highlight) → `validateMandatoryFields` (highlight) → `validateInsertCursor` → `checkDuplicateReference` again
- `open_form`: `validateAuthorGroup` (highlight) → `validateMandatoryFields` (highlight) → `validateInsertCursor`
- `plain_text`: `stripSummernoteBreaks` emptiness (`empty_citation`) → `validateInsertCursor`

Cursor is last. `refOnly` skips the cite-cursor requirement.

Structured link fields are resolved once before rendering. DOI, URL, and PMID use separate state keys; the bridge applies the resolver's returned element type and attributes without expanding DOI text or coercing `uri` into `ext-link`.

Preview and insert use the same synchronized template. A configured order is strict: response keys cannot add fields or alter placement, while a missing/empty order retains the fallback field behavior. This insert rule does not change edit/query preservation of existing document orphans.
