# TiptapManager: developer guide

## Architecture

```
TiptapManager (one per owner module)
 ├─ _instances: Map<fieldEl, inst>
 └─ inst = {
      el, cfg, editor, wrap, toolbarEl, mountEl, buttons,
      bag:  { map, seq }        IMPACT format cache  (data-format-id -> { tag, attrs })
      ice:  { meta, seq }       ICE side cache       (`${changeId}|ins|del` -> ICE attributes)
      baseline, mode, syncing, nativeValue
    }
```

Each field gets its own `inst`. Nothing in the manager assumes a single editor, except `_active`, which only
tracks the last focused one for debugging.

## Data flow

### Load (`field.value = html`, `setContent`, initial textarea value)

```
html
 └─ _ingest(html, inst)
     1. strip data-format-id            (foreign ids, e.g. from Summernote)
     2. inst.ice.meta.clear()
     3. iceToEditor()                   ICE <del>/<insert> -> <del>/<ins data-change-id …>, fills ice.meta
     4. transformForEditor()            IMPACT tags -> editor tags + data-format-id, fills bag
 └─ wrapped in <p> (Tiptap needs a block root)
 └─ editor.commands.setContent(..., { emitUpdate: false }) inside withBypass + edit mode
```

Loading always runs in edit mode, so it is never recorded as a tracked change. The previous mode is restored
afterwards.

### Read (`getContent`)

```
editor.getHTML()
 ├─ view result/base -> resolveTracked()   drop/unwrap ins+del, unwrap span (formatChange)
 ├─ restoreFromEditor()                    data-format-id -> IMPACT tag + attrs, defaults for bare tags,
 │                                         unwrapParagraphs(), stripBreaks()
 └─ view ice -> editorToIce()              <ins>/<del data-change-id> -> <insert>/<del class="ice-…" data-cid …>
```

### Write-back to the field

`onUpdate` calls `_sync`, which writes `getContent()` into the hidden field through the native value setter
(guarded by `inst.syncing`, so the override does not reload the editor), then dispatches a bubbling `input` event.

## Drop-in field behaviour

`_hookField` defines instance-level properties on the original element:

- `value`: getter delegates to the native descriptor; the setter also calls `_loadIntoEditor` unless
  `inst.syncing` is set.
- `focus`: focuses the editor.

`detach` deletes both overrides, so the element falls back to its prototype behaviour.

## IMPACT format cache

Same idea as `SummernoteManager`. Elements that the editor would otherwise lose attributes on are replaced by
the editor tag plus `data-format-id`. A global attribute (`formatId`, added by `_formatIdExtension`) carries the
id through marks `bold`, `italic`, `underline`, `superscript`, `subscript`. On read, the id is looked up in
`inst.bag.map`. If the cached tag is not allowed for that editor tag (`EDITOR_TAG_ALLOWED`) the id is dropped
and defaults from `DEFAULT_RESTORE` apply.

Toolbar-created formatting has no id and gets `DEFAULT_RESTORE`.

## ICE bridge internals

### Cache key

`inst.ice.meta` is keyed by `` `${changeId}|${kind}` `` where `kind` is `ins` or `del`.

Reason: ICE gives each ins and each del its own `data-cid`, while `tiptap-track-changes` shares one `changeId`
across a replacement. Keying on `changeId` alone would make the two halves overwrite each other.

Value:

```js
{ cid, kind, userid, rolename, username, changedata, time, last, cts }
```

### Import (`iceToEditor`)

- Selects `.ice-ins, .ice-del` (configurable) and processes inner-first.
- `changeId = 'ice-' + data-cid`.
- Empty markers are dropped.
- Writes `<ins|del data-change-id data-author-id data-author-name data-author-color data-timestamp style="--author-color">`.
- Raises `inst.ice.seq` to the highest cid seen.

### Export (`editorToIce`)

- Unwraps `span` when `dropFormatChanges` is on (the only span in this schema is the formatChange marker).
- For each `ins[data-change-id]` / `del[data-change-id]`: uses the cached meta, or creates it once for changes
  made inside Tiptap. New changes get `cid = _nextCid()`, user details from `ice.user`, and a time from
  `data-timestamp` (seconds are converted to ms) or `Date.now()`.
- Writes the element in the same attribute order as the CKEditor output.

### cid allocation

`_nextCid` returns `max(inst.ice.seq + 1, hostNext)`. `hostNext` comes from `ice.nextCid`. Without it, new cids
only avoid collisions inside the field, not across the CKEditor document. Wire it to the host document's
highest `data-cid`.

## Tracked-changes gotchas

- **Mode switching:** `editor.commands.setTrackChangesMode(mode)`. `_setMode` is a no-op when the extension is
  not loaded.
- **Programmatic loads** must not be tracked, hence `withBypass` plus edit mode in `_loadIntoEditor`.
- **`isDirty`** compares the full `marked` output with `inst.baseline`. It is reset by `setContent` and
  `markSaved`. Changes that were already in the loaded ICE content do not make it dirty.
- **Paste** goes through `_onPaste` and `insertContent`. Whether that insertion is recorded as a tracked
  insertion in suggest mode has not been confirmed (QA TC-24).
- **`setContent` signature:** `{ emitUpdate: false }` is the Tiptap v3 form. On v2 use `setContent(content, false)`.
- **Timestamps:** `TrackedChangeInfo.timestamp` is typed as a string in the extension README, while the mark
  attribute is described as a number. `_iceTime` accepts both and treats values below 1e12 as seconds.

## Extending

### Add a toolbar button

1. Add an entry to `TiptapManager.BUTTONS`: `label`, `title`, `cmd(editor)`, `active(editor)`, and optionally
   `needs` (a command name; the button is skipped when the command does not exist).
2. Add the name to the `toolbar` config.

### Add an IMPACT tag

1. Add it to `TAG_MAP` (`editorTag`, optional `passthrough`, `onlyWhenAttrs`).
2. Add restore defaults to `DEFAULT_RESTORE`.
3. If it is a Tiptap mark, add its mark name to the `types` list in `_formatIdExtension` and load the extension
   through `TiptapDeps` / `cfg.extensions`.

### Different ICE element names

Override through config, no code change:

```js
buildConfig({ ice: { insTag: 'ins', insClass: 'ice-ins', ctsPrefix: 'ice-cts-' } })
```

## Debugging

```js
mod._tiptap.getDebugSnapshot()
```

Per field: tracking state, pending count, dirty flag, format-cache size, live `data-format-id` count,
`iceMetaCount`, `iceCidSeq`. Debug logging uses the global `debug.log` and `IS_LOCAL_HOST` when present; the
quiet events (focus, blur, click, after-command) log only a one-line message.

## Integration notes (dialog Update flow)

```js
// open
tiptap.setContent(segmentHtml, '#aff_active_editor')      // resets baseline

// enable Update
updateBtn.disabled = !tiptap.isDirty('#aff_active_editor')

// Update
const html = tiptap.getContent('#aff_active_editor')      // ICE markup
target.innerHTML = html
tiptap.markSaved('#aff_active_editor')
```

If the target lives inside a live CKEditor 4 + ICE document, write the result through the CKEditor API so ICE
sees the change, not by assigning `innerHTML` behind its back.

## Test script (jsdom, no Tiptap needed)

Covers the conversion layer only:

```js
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><body></body>')
global.window = dom.window; global.document = dom.window.document
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
global.HTMLInputElement = dom.window.HTMLInputElement
const TM = require('./TiptapManager.js')
const m = new TM({ _name: 't' })
const cfg = m.buildConfig({ ice: { user: { id: 11, name: 'abcd@xyz.co', role: 'Author' }, nextCid: 100 } })
cfg.ice = { ...TM.ICE_DEFAULTS, ...cfg.ice }
const inst = { cfg, bag: { map: new Map(), seq: 0 }, ice: { meta: new Map(), seq: 0 } }
const editorHtml = m._ingest(iceHtml, inst)
const back = m.editorToIce(m.restoreFromEditor(editorHtml, inst.bag), inst)
```
