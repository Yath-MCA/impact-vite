# Reference Dialog Flow

This is the shared map for the standalone reference dialog. Field-level contracts live in the mode docs:

- [Insert](insert_mode.md)
- [Edit](edit_mode.md)
- [Query](query_mode.md)

Insert, edit, and query share open and preview. They do not share one submit path.

## Open Flow

One sequence for every mode, owned by `index.js` `showLoop()`.

| Step | Module | Method | Result |
| --- | --- | --- | --- |
| Normalize and ready | `index.js` | `normalizeShowArgs()`, `_ensureReady()`, `initializeElements()`, `setupEventListeners()` | Dialog shell is ready. |
| Choose mode | `index.js` | `showLoop()` | `edit`, `query`, or otherwise `insert`. |
| Resolve reference | `index.js` | `resolveRefNode()` | Owning `.ref` when a child leaf was clicked. |
| Create state | mode module | `createModeState()` | Insert starts on `doi_form`. Edit and query start on `open_form`. |
| Query text | `common.js` | `queryTextFromNode()` | Copies plain `queryText` when a query node is present. |
| Query preview | `common.js` | `getQueryPreviewSpans()` | Appends query and response spans into `#reference_preview_query` only. |
| Name-date hints | `index.js` | `showLoop()` | Insert sets `showHints` from `iREF_SCOPE.IS_NAME_DATE`. |
| Prepare and render | mode module, `index.js` | `prepareTemplate()`, `refreshPreview()`, `autoFocus()` | Mode handler prepares the template. `updateCanSubmit()` and `FormChrome.render()` run. Prefill is inside that render through `prefillPanel()`. |

## Edit And Query Preview Flow

Shared for field changes in every mode that shows the open form or plain-text editor.

| Step | Module | Method | Result |
| --- | --- | --- | --- |
| User changes field | `index.js` | input/change callbacks | Schedules preview refresh through debounce. |
| Collect panel | `index.js` / `common.js` | `collectIntoState()` / `collectFromPanel()` | Reads current mapped form values, contributors, DOI, plain text, and query response. |
| Resolve reference link | `link_adapter.js` / `hyperlink_module` | `resolveReferenceLinkField()` / `resolveReferenceLink()` | Produces the same DOI, URL/URI, `pub-id`, or PMID descriptor for fetch, preview, insert, edit, and reopen. |
| Skip unchanged preview | `index.js` | `createPreviewStateSignature()` | Compares relevant current state with previous state and skips unnecessary preview rebuilds. |
| Reconcile mapped fields | `common.js` | `reconcileMappedFieldsFromValues()` | Promotes only mapped values allowed by ref type and active CEG order. |
| Rebuild preview | `ref_bridge/index.js` | full-template builders | Produces the preview from current state values in CEG order. |
| Refresh UI | `index.js` | `FormChrome.render({ skipPrefill: true })` | Updates preview without overwriting the active form input. |

Preview uses this shared rebuild. Submit does not. See the mode docs for which builder apply uses.

## Submit Paths

Do not treat confirm as one collect-then-`mode.submit()` call. Each mode collects and applies on its own path.

| Mode | Entry | Collect | Validate / stop | Build and apply |
| --- | --- | --- | --- | --- |
| Insert | `handleInsert(refOnly)` | By method: DOI snapshot, `collectPlainTextIntoState()`, or `collectIntoState()` | `validateBeforeSubmit()`. `doi_form` also checks duplicate DOI before build. `refOnly` skips in-text citation HTML. | `submit()` then `applyBuilt()`. Contract: [insert_mode.md](insert_mode.md). |
| Edit | `handleUpdate()` | `collectIntoState()` after `canSubmit` is true | Returns immediately when `canSubmit` is false. No insert guard chain. | `buildEditReferenceDom()`, apply onto the live `.ref`, then `syncCitationsAfterEdit()`. |
| Query | `handleQueryUpdate(fromCommand)` | `collectIntoState()` | Primary update returns when `canSubmit` is false. Command update returns when the respond box is empty, with no toast. | `buildQueryReferenceDom()`, then `applyQueryResponseUpdate()` when response text exists. |

Edit All and Respond are query UI states, not separate modes. Edit All sets `editAllFields`. Respond sets `queryRespondMode`.

## Insert-Only Type And Method Switch

Edit and query do not use these guards.

| Switch | When | Confirm | Cancel |
| --- | --- | --- | --- |
| Method (`handleMethodClick`) | Insert session is dirty (`isInsertMethodDirty`) | Clear keyed content, then apply the new method | Restore the method radio and keep values |
| Type (`handleTypeClick`) | Insert session is dirty, and method is not locked | Same clear, then apply the new type. Method stays the same. | Restore the type radio and keep values |
| Type while `doi_form` | Manual type click | Not offered. `doi_form` stays locked | No change |

## Field Visibility Flow

| Input | Source | Rule |
| --- | --- | --- |
| CEG/style order | `ref_bridge/index.js` `prepareTemplate()` | Exposed as `orderTokens`; this is the source of truth for mapped open-form fields. |
| Link field state | `values.doi`, `values['ext-link']`, `values['object-id']` | DOI, URL, and PMID remain independent; element shape never selects a different state slot by itself. |
| Static mapping | `messages.json` `config.tokenToInputId` | Defines which tokens can map to right-panel inputs. |
| Ref type rules | `messages.json` field UI schema | Filters fields by journal, book, or edited-book availability. |
| Prepared fields | `state.fields` and `state.template.fields` | Supplies labels, order, required/missing flags, and current values. |
| Panel update | `common.js` `applyPreparedFieldVisibility()` | Shows only mapped tokens present in active CEG order and disables hidden mapped inputs. |

## Rich Editor Flow

| Field | Module | Behavior |
| --- | --- | --- |
| `article-title` | `common.js` | Uses formatting-enabled Summernote when active for the current type. |
| `chapter-title` | `common.js` | Uses formatting-enabled Summernote for edited-book title handling. |
| `source` | `common.js` | Uses formatting-enabled Summernote for journal title or book title. |
| insert `plain_text` | `common.js`, `index.js` | Uses formatting-enabled Summernote and triggers existing plain-text lookup callbacks. |
| query configured rich tokens | `common.js` | Always mount (same tokens as edit); lock non-editable fields with `setRichTextDisabled` via `shouldLockField`. A missing target stays editable after fill. |
| deferred innerHTML fields | `SummernoteManager.js` | Can opt into plain-rich config later, without enabling formatting toolbar/events now. |

## Callback Wire Frame

```text
index.js
  showLoop()
    -> mode.createModeState()
    -> mode.prepareTemplate()
      -> ref_bridge.prepareTemplate()
    -> FormChrome.render()
      -> reference_common.prefillPanel()
        -> applyRefTypeVisibility()
        -> applyPreparedFieldVisibility()
        -> applyDynamicFieldLabels()
        -> applyFieldHighlights()

  input/change event
    -> debounce refreshPreview()
      -> collectIntoState() / collectFromPanel()
      -> createPreviewStateSignature()
      -> reference_common.reconcileMappedFieldsFromValues()
      -> ref_bridge full-template render
      -> FormChrome.render({ skipPrefill: true })

  insert click
    -> collect by insertMethod
    -> insert_mode.validateBeforeSubmit()
    -> doi_form: checkDuplicateReference()
    -> insert_mode.submit() / applyBuilt()

  edit update click
    -> return if !canSubmit
    -> collectIntoState()
    -> edit_mode.submit() -> buildEditReferenceDom()
    -> apply onto live .ref
    -> syncCitationsAfterEdit()

  query update click
    -> collectIntoState()
    -> query_mode.submit() -> buildQueryReferenceDom()
    -> applyQueryResponseUpdate() when response text exists
```
