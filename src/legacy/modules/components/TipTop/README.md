# TiptapManager

Rich-text editing for dialog fields (`<textarea>` / `<input>`) using Tiptap, with track changes that
interoperate with the main CKEditor 4 + ICE (lite) editor.

It is the Tiptap counterpart of `SummernoteManager.js`: one owner class, one config builder, IMPACT tag
mapping, paste filtering, event dispatch, toolbar wiring and debug helpers. One manager instance drives
many fields.

## What it does

- Turns any dialog child element into a Tiptap editor. The original field stays in the DOM (hidden) and is
  kept in sync, so `field.value`, `$(field).val()`, `field.focus()` and `input` listeners keep working.
- Keeps IMPACT inline formatting (`em`, `strong`, `sup`, `sub`, `u`) with their `class` / `data-name` attributes.
- Tracks changes with [`tiptap-track-changes`](https://github.com/sungkhum/tiptap-track-changes)
  (suggest / edit mode, accept / reject, diff).
- **ICE bridge:** reads `<del class="ice-del …">` and `<insert class="ice-ins …">` into native track-change
  marks, and writes ICE markup back on `getContent()`.

## Files

| File | Purpose |
|------|---------|
| `TiptapManager.js` | The class. Plain script (no bundler), exposes `window.TiptapManager`. |
| `README.md` | This file. |
| `DEV.md` | Architecture, internals, extension points. |
| `QA.md` | Test plan and acceptance checks. |
| `SKILLS.md` | Instructions for an AI coding agent working on this module. |

## Install

Load Tiptap from your CDN in a module script, hand the pieces to the manager through `window.TiptapDeps`,
then load the class.

```html
<script type="module">
  import { Editor, Extension } from 'https://cdn.jsdelivr.net/npm/@tiptap/core@3.31.3/+esm'
  import StarterKit from 'https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@3.31.3/+esm'
  import Superscript from 'https://cdn.jsdelivr.net/npm/@tiptap/extension-superscript@3.31.3/+esm'
  import Subscript from 'https://cdn.jsdelivr.net/npm/@tiptap/extension-subscript@3.31.3/+esm'
  import { TrackChangesExtension, getTrackedChanges, getGroupedChanges, getPendingChangeCount }
    from 'https://cdn.jsdelivr.net/npm/tiptap-track-changes/+esm'

  window.TiptapDeps = { Editor, Extension, StarterKit, Superscript, Subscript,
    TrackChangesExtension, getTrackedChanges, getGroupedChanges, getPendingChangeCount }
</script>
<script src="TiptapManager.js"></script>
```

`Editor` and `StarterKit` are required. Everything else is optional: without `Superscript` / `Subscript` those
buttons are not rendered, and without `TrackChangesExtension` the editor works untracked.

`@tiptap/core` and `@tiptap/pm` must resolve to a single copy. If the CDN loads two, expect plugin-key or schema
errors; pin them with an import map.

## Quick start

```js
this._tiptap = this._tiptap || new TiptapManager(this)

this._tiptap.attach('#aff_active_editor', this._tiptap.buildConfig({
  track: true,
  ice: {
    user: { id: 11, name: 'abcd@xyz.co', role: 'Author' },
    nextCid: () => hostMaxCid() + 1,
  },
}))

const html = this._tiptap.getContent('#aff_active_editor')   // ICE markup
```

Attach to several fields at once:

```js
this._tiptap.attachAll(dialogEl, '[data-tiptap]', config)
```

## Configuration (`buildConfig(overrides)`)

| Option | Default | Meaning |
|--------|---------|---------|
| `toolbar` | style + track groups | `[[group, [buttonNames]]]`. Buttons: `bold italic underline subscript superscript undo redo track acceptAll rejectAll`. |
| `focus` | `false` | Focus the editor on attach. |
| `singleLine` | `true` | Blocks Enter and disables hard breaks. |
| `blockEscape` | `false` | `true` swallows Esc inside the editor (otherwise it reaches the dialog). |
| `track` | `false` | Start in suggest mode. |
| `valueMode` | `'ice'` | What the hidden field holds: `ice`, `result`, `base`, `marked`. |
| `author` | `{ id:'user', … }` | Tracked author. Derived from `ice.user` when that is set. |
| `ice` | `{}` | Overrides for `TiptapManager.ICE_DEFAULTS`. |
| `extensions` | `[]` | Extra Tiptap extensions. |
| `callbacks` | `{}` | Per-field hooks, e.g. `onChange(html, el)`. |

### `ice` options

| Option | Default | Meaning |
|--------|---------|---------|
| `enabled` | `true` | Turn the bridge off to treat ICE markup as plain HTML. |
| `insTag` / `delTag` | `insert` / `del` | Element names written on export. |
| `insClass` / `delClass` | `ice-ins` / `ice-del` | Marker classes. |
| `ctsPrefix` | `ice-cts-` | Class prefix for the user style, e.g. `ice-cts-11`. |
| `user` | `null` | `{ id, name, role }` for new changes (`data-userid`, `data-username`, `data-rolename`). |
| `nextCid` | `null` | Number or function: first free `data-cid` in the host document. |
| `dropFormatChanges` | `true` | ICE has no format-change record, so the marker is removed and the formatting kept. |
| `colors` | 6-color palette | Author colors, picked by hashing the user id. |

## Content views

`getContent(target, { view })`:

| View | Output |
|------|--------|
| `ice` (default) | IMPACT markup with ICE `<del>` / `<insert>` wrappers. |
| `marked` | IMPACT markup with Tiptap `<ins>` / `<del>` marks. |
| `result` | All changes accepted, plain IMPACT markup. |
| `base` | All changes rejected (original), plain IMPACT markup. |

## ICE mapping

```
ICE     <del class="ice-del ice-cts-11" data-cid="2" data-userid="11" …>old</del>
        <insert class="ice-ins ice-cts-11" data-cid="3" data-userid="11" …>new</insert>

Tiptap  <del data-change-id="ice-2" data-author-id="11" …>old</del>
        <ins data-change-id="ice-3" data-author-id="11" …>new</ins>
```

ICE-only attributes (`data-userid`, `data-rolename`, `data-username`, `data-changedata`, `data-time`,
`data-last-change-time`, the `ice-cts-N` class) live in a per-field side cache, so untouched changes round-trip
unchanged. A replacement is two cids in ICE and one shared changeId in Tiptap; the cache is keyed by
`changeId|ins` and `changeId|del`.

## API summary

| Method | Purpose |
|--------|---------|
| `attach(target, config)` / `attachAll(root, selector, config)` | Create editors. |
| `detach(target)` / `detachAll(root)` | Destroy and restore the original field. |
| `getContent(target, { view })` | Read content. |
| `setContent(html, target)` / `clearContent(target)` | Load content without recording a change; resets the baseline. |
| `setTracking(target, on)` / `isTracking(target)` | Suggest / edit mode. |
| `getChanges` / `getGroupedChanges` / `getPendingCount` | Inspect tracked changes. |
| `accept(id, target)` / `reject(id, target)` / `acceptAll` / `rejectAll` | Resolve changes. |
| `getDiff(target)` | `{ base, result, marked, ice, changes }`. |
| `isDirty(target)` / `markSaved(target)` | Update-button logic. |
| `getDebugSnapshot()` | Per-field state for devtools. |

Owner hooks (all optional): `handleContentChange(html, el)`, `handleToolbarButtonClick(name, e)`,
`handleKeyupEvent(e)`, `handleTrackStatus(info)`, `logError(context, err)`.

## CSS

```css
.tt-wrap { border: 1px solid #d1d5db; border-radius: .375rem; }
.tt-toolbar { display: flex; gap: .25rem; padding: .25rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.tt-btn { padding: .15rem .5rem; border: 1px solid transparent; background: none; cursor: pointer; border-radius: .25rem; }
.tt-btn:hover { background: #e5e7eb; }
.tt-btn.is-active { background: #111827; color: #fff; }
.tt-btn:disabled { opacity: .4; cursor: default; }
.tt-content { padding: .4rem .6rem; min-height: 3rem; outline: none; }
.tt-content p { margin: 0; }
.tt-wrap.is-tracking { border-color: #2d5fce; }
.tt-content ins { background: #dcfce7; text-decoration: none; }
.tt-content del { background: #fee2e2; text-decoration: line-through; }
```

## Known limits

- Inline-only schema: no headings, lists, quotes or code; no `<br>` while `singleLine` is on.
- `sc` has no Tiptap mark. It is not handled.
- Empty ICE markers (`<del …></del>` with no content) are dropped on load.
- ICE cannot represent format changes, so they are not exported.
- `data-timestamp` and `data-author-color` on the tracked marks are written on import, but whether
  `tiptap-track-changes` reads them back is unverified (see `QA.md`, TC-30).
