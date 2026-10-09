# Query (missing) mode — inputs / outputs

Shared open and preview live in [reference_dialog_flow.md](reference_dialog_flow.md). This file is the query contract. Query does not use insert method switch, type-switch confirm, or `validateBeforeSubmit()`.

## Runtime path

Query is one mode with two UI states. Edit All sets `editAllFields` and unlocks non-missing fields. Respond sets `queryRespondMode`, shows `#reference_query_respond`, and locks contributors and configured rich fields.

Primary update is `handleQueryUpdate(false)`. It collects the panel, builds with `buildQueryReferenceDom()`, and saves a generated `Label: value` response when missing fields were filled.

Update with Command is `handleQueryUpdate(true)` only when the respond box has text. That typed text is not replaced by generated text. An empty respond box returns with no toast.

Query markers move outside `.mixed-citation` before the mixed-citation swap. A successful DOM change runs the same citation sync as edit. If the DOM did not change but a generated or typed response exists, the response can still save and close.

## Triggers

| Source | Action |
|--------|--------|
| Command `REFERENCE_FORM_QRY` | `dialog.show('query', { element, queryNode \| query })` |
| Query panel missing-item open | QueryBaseModule prefers `referenceDialog`; legacy `show(el, { FROM_QRY: true })` is normalized to query mode |
| Toolbar `#insertRefmenu` / Citation insert | `REFERENCE_FORM_OPEN` → `show('open')` (not `MULTI_REF_FORM_OPEN`) |

Query open fallback:

- When query text matches and a configured citation element (other than name leaves and comments) appears twice or more, the reference query form is blocked and `queryDialog` opens instead.
- In that fallback path, the edit/query build does not run.

## UI inputs

| Control | Notes |
|---------|--------|
| Insert-method radios | Hidden; form panel only |
| Fields | Missing tokens highlighted while empty (`field.missing` + empty value); missing targets stay editable after fill. Non-missing locked until Edit All (`shouldLockField`) |
| Authors / editors | Prefill from document. Author rows stay locked in query. When query text matches `editor(s) name`, `editors name`, `editor name`, or `contributor`, `#reference_editor_section` is shown: existing editor names stay editable and highlighted, otherwise one empty row is added. The editor section locks again in Respond mode. |

## State keys

`mode: 'query'`, `refNode`, `queryNode`, `values`, `fields` (missing flags), `authors`, `editors`, `canSubmit`

## Bridge calls

| Method | Role |
|--------|------|
| `prepareTemplate({ mode: 'query', queryNode })` | Merge missing from query text map |
| `buildQueryReferenceDom(state)` | Rebuild mixed-citation; track new leaves for missing fills |
| `applyQueryResponseUpdate(...)` | Save typed or generated query response through `queryModule.operationInsertOrUpdate` |

## DOM output

- Return: cloned `.ref` with rebuilt `.mixed-citation`
- Apply: replace mixed-citation children on live ref
- Before apply, query/comment markers (`[data-class="ckcommentsfull"]` and their owning `insert` wrapper) are moved outside `.mixed-citation` so the query state node survives the rebuild.

## Query response handling

- Normal missing-field update builds dynamic response text from keyed missing values, using `Label: value` lines, then saves/closes the active query through `window.queryModule.operationInsertOrUpdate(...)`.
- `Update with Command` uses the explicit `#reference_query_respond` text and does not overwrite it with generated missing-field text.
- `window.queryModule.updateRefDOM2State(queryId, queryNode)` is called before the response save so the query module points at the current DOM node.
- Successful query updates run the same citation sync path as edit mode when name-date citations need refresh.

## Rich fields (Summernote)

Configured rich tokens always mount Summernote in query using the same token rules as edit (`shouldUseRichTitleToken`). Do not skip init because a field is locked or non-missing.

Non-editable query rich fields lock via `shouldLockField` → `setRichTextDisabled` (and native `disabled`); they stay as live Summernote instances, not plain inputs. Missing query targets stay editable even after fill (highlight clears when non-empty). Edit All unlocks non-missing fields; query respond mode locks all configured rich fields.

## Books query — same demand fields + full template rebuild

For books clients, title/source/collab demand tokens use the same **plain Summernote** contract as edit mode (no toolbar, no keyboard formatting; values are leaf `innerHTML`), including when locked. Author/editor names and publisher fields (`publisher-name`, `publisher-loc`) are temporarily normal inputs until `ENABLE_BOOK_NAME_PUBLISHER_SUMMERNOTE` is re-enabled.

While the user fills a missing field, debounced preview rebuilds the **full reference template** through the existing insert-style path (`refreshPreview` → `buildReferenceFromPayload`), so adjacent missing delimiters resolve against the complete intended leaf set. Submit applies via `buildQueryReferenceDom` / `applyQueryMissingUpdate`.

DOI, URL/URI, `pub-id`, and PMID query fields use the same `resolveReferenceLinkField()` adapter as insert and edit. Existing tracked leaves recover active text first and href second; query mode does not infer a different semantic slot locally.

## Errors

- Primary update with `canSubmit` false → return before build
- Update with Command and an empty respond box → return, no toast
- No DOM change and no response text → existing no-change toast
- No DOM change but generated or typed response text present → save the response and close
- `mixed-citation-missing` / toaster on apply failure
