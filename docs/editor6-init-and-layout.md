# IMPACT Editor6 — Initialization & Layout System

## Overview

Three files collaborate to boot and render the editor page:

| File | Role |
|---|---|
| `snippet/editor6.html` | HTML shell — defines the DOM structure and loads scripts |
| `src/js/_initialScriptLoader.js` | Boot sequence — resolves client config, fires `READY_TO_OPEN` |
| `src/js/_editorLayout.js` | Layout manager — controls columns, views, panels, and dialog docking |
| `src/static/css/editorLayout.css` | Dedicated styles for the third-column dialog host |

---

## 1. `editor6.html` — The Page Shell

### Script Loading Order

Scripts are loaded in two phases:

**Phase 1 — Synchronous (blocking, in `<head>`)**
```
vendor_jbt.js        → jQuery, Bootstrap, and other base libs
vendor_smt.js        → Additional third-party utilities
e6_vendor.js         → IMPACT vendor bundle
e6_mathlive.min.js   → Math rendering
ckeditor_dev.js      → CKEditor instance
browser-compatible/index.js → Polyfills + browser gate (`fireEvent_browser_validation` on DOMContentLoaded)
```

**Phase 2 — Deferred (non-blocking, parsed after DOM)**
```
e6_common.min.js     → Shared utilities (commonfn, ErrorLogTrace, etc.)
e6_main.min.js       → Core editor logic
module_main.js       → Dialog/module loader
dialog_module.min.js → Dialog framework
global_context.js    → Global context setup
```

> `_initialScriptLoader.js` and `_editorLayout.js` are bundled into one of the deferred files above (typically `e6_common.min.js` or `e6_main.min.js`).

> **Gulp:** `PAGES.browser_compatible` emits `dist/assets/{ver}/modules/browser-compatible/index(.min).js` (`JS_RENAME: "index"`). It is **not** part of Flow B (`editorBootInit` / `runTier1` / `finishReady`) or the `module_main` split — it must stay the first editor page script so the browser gate runs before `e6_common` / InitialLoadDialog.

### Key DOM IDs

| ID | Element | Purpose |
|---|---|---|
| `iWrapper` | `div.row` | Root flex row that holds all columns |
| `iTOC_Section` | `col-sm-2` | Left panel — TOC / Queries / Comments |
| `iViewArea` | `col-10` | Centre area — editor + PDF |
| `iEditorSection` | `col-12/col-lg-6` | CKEditor pane |
| `iPdfSection` | *(sibling of iEditorSection)* | Proof PDF pane |
| `iPdfThumbnail_Section` | right panel | Page thumbnail strip |
| `NaviButton1` | `col-1` | Hamburger — toggles TOC panel |
| `NaviButton2` | `align-self-end` | Hamburger — toggles Thumbnail panel |
| `editorLayoutDialogHost` | `col-md-4` | Third column — injected by `_editorLayout.js` |

### View Mode Buttons (`data-view`)

Each view option `div.d-inline-block` inside `#view-dialog` carries a `data-view` attribute:

| `data-view` | Description |
|---|---|
| `edit` | Editor only |
| `pdf` | Proof PDF only |
| `both` | Editor + PDF side-by-side |
| `maximize` | Full-screen editor via CKEditor command |

---

## 2. `_initialScriptLoader.js` — Boot Sequence

### Entry Point

```
DOMContentLoaded  →  EDITOR_INITIALIZE.preInitialize()
```

### Class Hierarchy

```
LoadingConfig
  ├── MetaConfig       (ORDER 1) — loads config.xml
  ├── IcoFile          (ORDER 2) — loads client favicon SVG
  ├── LangConfig       (ORDER 3) — loads en.js language file
  ├── ClientConfig     (ORDER 5) — loads journal/book split XML config
  └── CegConfig        (ORDER 6) — loads reference styling XML

EditorInitialize
  └── coordinates the above with the editor startup
```

### Boot Flow

```
preInitialize()
    │
    ├── RESOLVE_SHARED_KEY()          ← reads window.SHARED_KEY or localStorage fallback
    │
    ├── [valid key] ──→ START(sharedKey)
    │                       └── TRY_START()
    │                               │
    │                               ├── LOADING_CONFIG.canLoadEditor === true?
    │                               │       └── YES → RUN_READY_TO_OPEN()
    │                               └── NO  → poll every 100 ms (watcher interval)
    │
    └── [no key yet] → START_SHARED_KEY_WATCHER()
                            └── polls every 100 ms for SHARED_KEY to appear
```

### `LOADING_CONFIG.Init(SHARED_KEY)`

1. Sets `CLIENT.NAME` and `CLIENT.DTD` from `SHARED_KEY`.
2. Calls `PREPARE_URLS()` — each config object's `fireOnce()` builds its URL.
3. Calls `BATCH_FETCH()` — fires all URLs concurrently with `XMLHttpRequest`.
4. On all responses received → `PROCESS_RESPONSES()` → each handler runs.
5. Sets `canLoadEditor = true` → unblocks `TRY_START()`.

### Config URL Patterns

| Config | URL pattern |
|---|---|
| MetaConfig | `assets/{VERSION}/config/{dtd}/{client}/config.xml` |
| ClientConfig | `assets/{VERSION}/config/{dtd}/{client}/split/{title}.xml` |
| CegConfig | `assets/{VERSION}/config/{dtd}/{client}/ceg/refStyling_{title}.xml` |
| LangConfig | `assets/{VERSION}/config/lang/en.js` |
| IcoFile | `assets/images/client_logo/{CLIENT}_FAVICON.svg` |

### `MetaConfig.handleResponse`

- Sets `window.I_CONFIG` (the parsed XML document).
- Calls `SET_EDITOR_LAYOUT_CONFIG()` — reads `[name="editor6Layout"]` node.
  - If `editor6` attribute = `"three-column"` → activates the three-column profile in `editorLayout`.

### Timeout / Reload Guard

`EditorInitialize` starts a 25-second timer on first `START()` call. If `RUN_READY_TO_OPEN` has not been reached within 25 s, `location.reload()` is triggered automatically.

### `RUN_READY_TO_OPEN`

Runs only once (`isInitiated` guard). Calls:
- `SET_TITLES(sharedKey)` — populates `#r-title` / `#l-title` in the navbar.
- `fetchUserInfo()` — populates `#iuser_Name`.
- `commonfn.callajax(GET_JSON('openhtml'), ...)` — loads the document HTML into CKEditor.
- `CHECK_CURRENT_STATUS('READY_TO_OPEN')` — triggers downstream workflow state checks.

---

## 3. `_editorLayout.js` — Layout Manager

### Instantiation

```js
window.editorLayout = new editorLayout({ /* options */ });
```

The constructor immediately registers a `DOMContentLoaded` listener which polls (every 300 ms, up to 40 tries) for `#iEditorSection` to appear, then calls `init()`.

### `init()` Steps

```
ensureImpactViewShim()   → creates window.ImpactView compatibility shim
injectStyles()           → inserts <style id="editorLayoutStyles"> once (runtime overrides only)
ensureDialogHost()       → injects #editorLayoutDialogHost with header/body/footer slots
bindEvents()             → attaches click/hover listeners + single MutationObserver
refreshLayout()          → runs the first layout pass
```

### Layout Modes

| Mode | Source |
|---|---|
| `"default"` | No `[name="editor6Layout"]` node, or attribute not set |
| `"three-column"` | `editor6Layout[editor6="three-column"]` in `config.xml` |

### Column Layout Logic (`applyDefaultColumnLayout`)

| TOC hidden | Thumbnail hidden | `#iViewArea` classes |
|---|---|---|
| yes | yes | `col-md-12` |
| no | yes | `col-md-10` |
| yes | no | `col-md-11` |
| no | no | `col-md-9` |

### Three-Column Profile Layout (`applyProfileColumnLayout`)

| Condition | `#iViewArea` | `#editorLayoutDialogHost` |
|---|---|---|
| Dialog open + TOC visible | `col-md-6` | `col-md-4` |
| Dialog open + TOC hidden | `col-md-8` | `col-md-4` |
| No dialog + TOC hidden | `col-md-12` | hidden |
| No dialog + TOC visible | `col-md-10` | hidden |

### View Management

```
setView(viewName)
    ├── "edit"     → show #iEditorSection, hide #iPdfSection
    ├── "pdf"      → hide #iEditorSection, show #iPdfSection
    ├── "both"     → show both, each gets col-md-6
    └── "maximize" → GlobalEditor.execCommand("maximize")
```

### Navigation Panel Toggle (`toggleNavigation`)

- `NaviButton1` → toggles `ds-none` on `#iTOC_Section`
- `NaviButton2` → toggles `ds-none` on `#iPdfThumbnail_Section`

### `window.ImpactView` Shim

| Legacy call | Maps to |
|---|---|
| `ImpactView.getView()` | `editorLayout.getView()` |
| `ImpactView.setView(v, t)` | `editorLayout.setView(v, t)` |
| `ImpactView.NaviToggle(_, el)` | `editorLayout.toggleNavigation(el.id)` |
| `ImpactView.RestoreCursor()` | `editorLayout.restoreCursor()` |
| `ImpactView.INIT()` | `editorLayout.init()` |

### MutationObserver (fixed)

`bindEvents()` creates **one** `MutationObserver` on `document.body` watching `attributeFilter: ["class", "style"]` and `childList`.

Key behaviours:
- Observer **disconnects** before `refreshLayout()` runs so our own class changes do not re-trigger it.
- Observer **reconnects** after `refreshLayout()` completes.
- `bindEvents()` always disconnects and nulls the previous observer before creating a new one — no accumulation.

---

## 4. Third-Column Dialog Host — New Approach

### Why a new approach

Previously dialogs floated over the editor as `position: fixed` overlays. In three-column mode they are instead **docked** into a dedicated third column so the editor remains fully accessible.

The challenge: existing `dialog_module.css` uses heavy-specificity `!important` rules on `.dialog-container`, `.dialog-content`, `.dialog-body`, `.dialog-footer`. Trying to override these inside the host caused conflicts.

### Solution — slot-based architecture with `el-*` classes

Instead of overriding dialog CSS, the dialog's inner sections are **moved** out of the floating shell into dedicated host slots that use entirely new `el-*` class names — zero overlap with `dialog_module.css`.

### Injected DOM Structure

`ensureDialogHost()` appends this column to `#iWrapper` once on `init()`:

```html
<div id="editorLayoutDialogHost" class="ds-none col-12 col-md-4 col-lg-4 col-xl-4">
  <div class="el-dialog-host">
    <div class="el-dialog-header" id="editorLayoutDialogHeader"></div>
    <div class="el-dialog-body"   id="editorLayoutDialogBody"></div>
    <div class="el-dialog-footer" id="editorLayoutDialogFooter"></div>
  </div>
</div>
```

### CSS — `src/static/css/editorLayout.css`

All styles use `el-*` prefixed classes. No reference to `dialog-container` / `dialog-content`.

| Class | Flex role | Key rules |
|---|---|---|
| `.el-dialog-host` | column container | `display:flex; flex-direction:column; height:100%` |
| `.el-dialog-header` | fixed top | `flex-shrink:0; border-bottom` |
| `.el-dialog-body` | grows + scrolls | `flex:1 1 auto; min-height:0; overflow-y:auto` |
| `.el-dialog-footer` | fixed bottom | `flex-shrink:0; border-top` |

> `min-height: 0` on `.el-dialog-body` is required — without it a flex child cannot shrink below its content height and the body overflows.

The only rule kept in `injectStyles()` (inline `<style>`) is:
```css
[data-el-docked] { display: none !important; }
```
This must beat `dialog_module.css` at runtime and cannot live in a static file that loads before the dialogs.

### `dockActiveDialog()` — How a dialog is docked

Called from `refreshLayout()` every time the MutationObserver fires.

```
1. If activeDialogId is set:
   └── Check element directly (not via getOpenDialogs)
       ├── Element visible (no ds-none) → keep host open, return early   ← Bug 1 fix
       └── Element hidden (ds-none)     → _undockDialog() then clear id  ← dialog closed

2. getOpenDialogs() — finds .mDialog.w-editor-access:not(.ds-none):not([data-el-docked])

3. No open dialogs → hide host, return false

4. New dialog found:
   ├── querySelector(".dia_header_div")       → move to #editorLayoutDialogHeader
   │       └── bind { once:true } click on .closeIcons   ← close button fix
   ├── querySelector("[data-id='dialog-body']")  → move to #editorLayoutDialogBody
   └── querySelector("[data-id='dialog-footer']") → move to #editorLayoutDialogFooter

5. Set dialog.dataset.elDocked = "true"   ← hides shell, does NOT trigger MutationObserver
6. host.classList.remove("ds-none")
```

### `_undockDialog(dialogId)` — How a dialog is un-docked

Called when a docked dialog is closed (its `ds-none` class is detected).

```
1. Get dialog element by id
2. Get dialog-content inside it
3. Move firstElementChild of each slot back into dialog-content:
   #editorLayoutDialogHeader → dialog-content
   #editorLayoutDialogBody   → dialog-content
   #editorLayoutDialogFooter → dialog-content
4. delete dialog.dataset.elDocked
```

After undocking, the dialog shell is fully intact and can re-open as a floating panel normally.

### Close Button Handling

When the header is moved to `#editorLayoutDialogHeader`, the `.closeIcons` element is **outside** `.mDialog`. The existing `closeDialog` handler does `e.target.closest('.mDialog')` which would return `null` and throw.

Fix: a `{ once: true }` click listener is attached to `.closeIcons` inside the host header at dock time:

```
closeIcons click (intercepted with stopPropagation)
    └── _undockDialog(activeDialogId)         ← restore content to dialog-content
    └── activeDialogId = null
    └── MODULE_LIST[id].closeDialog()         ← module's own cleanup runs (no event arg,
        or .hide()                               so closest('.mDialog') branch is skipped)
    └── fallback: dialog.classList.add('ds-none')
```

### `data-el-docked` vs `ds-none`

| Mechanism | Triggers MutationObserver? | Used for |
|---|---|---|
| `ds-none` class | YES — `attributeFilter:["class"]` | Dialog shown/hidden by module code |
| `data-el-docked` attribute | NO — not in `attributeFilter` | Hiding the docked shell internally |

Using `ds-none` to hide the docked shell caused a re-trigger loop:
shell hidden → observer fires → `getOpenDialogs()=[]` → host hidden again.
`data-el-docked` breaks the loop.

### Dialog Requirements for Docking

For a dialog to dock correctly it must:

1. Have class `mDialog w-editor-access` on the outer wrapper.
2. Contain a `.dialog-content` element with:
   - `.dia_header_div` — header row (with `.closeIcons` for the close button)
   - `[data-id="dialog-body"]` — scrollable body area
   - `[data-id="dialog-footer"]` *(optional)* — footer buttons

Dialogs that do not match are handled by the fallback path (whole element appended to `#editorLayoutDialogBody`).

### Existing Dialog Template (for reference)

```html
<div class="mDialog ds-none w-editor-access" id="MyDialogModule">
    <div class="dialog-container lg">
        <div class="dialog-content">

            <!-- Header — moved to #editorLayoutDialogHeader when docked -->
            <div class="dia_header_div">
                <div class="dia_header_text">Dialog Title</div>
                <div class="ml-auto closeIcons" title="Close">
                    <img class="n_Img" src="assets/images/svg/dialogClose.svg" alt="Close Icon">
                </div>
            </div>

            <!-- Body — moved to #editorLayoutDialogBody when docked -->
            <div class="dialog-body" data-id="dialog-body">
                <!-- dialog content here -->
            </div>

            <!-- Footer — moved to #editorLayoutDialogFooter when docked -->
            <div class="dialog-footer default" data-id="dialog-footer">
                <button class="btn secondary-btn">Cancel</button>
                <button class="btn primary-btn">Apply</button>
            </div>

        </div>
    </div>
</div>
```

> The `data-id` attributes on body and footer are what `dockActiveDialog()` uses to find and move the sections. They must be present.

---

## End-to-End Startup Sequence

```
Browser loads editor6.html
    │
    ├── [sync] vendor libs, CKEditor loaded
    │
    ├── [deferred] _initialScriptLoader.js runs
    │       └── EDITOR_INITIALIZE + LOADING_CONFIG created
    │
    ├── [deferred] _editorLayout.js runs
    │       └── window.editorLayout created, polls for #iEditorSection
    │
    ├── DOMContentLoaded fires
    │       ├── EDITOR_INITIALIZE.preInitialize()
    │       │       └── waits for SHARED_KEY → calls LOADING_CONFIG.Init()
    │       └── editorLayout.waitForReadyState() → finds #iEditorSection → init()
    │               ├── injectStyles()      → [data-el-docked]{display:none!important}
    │               ├── ensureDialogHost()  → injects #editorLayoutDialogHost with 3 slots
    │               ├── bindEvents()        → single MutationObserver created
    │               └── refreshLayout()     → first layout pass
    │
    ├── LOADING_CONFIG.Init(SHARED_KEY)
    │       ├── BATCH_FETCH: config.xml, lang/en.js, split/*.xml, ceg/*.xml, favicon.svg
    │       ├── MetaConfig.handleResponse → I_CONFIG set → SET_EDITOR_LAYOUT_CONFIG()
    │       │       └── editorLayout.applyMetaConfig() → layout mode = "three-column"
    │       └── canLoadEditor = true
    │
    └── TRY_START() unblocks → RUN_READY_TO_OPEN()
            └── Document HTML loaded into CKEditor, titles set, status checked
```

## Dialog Docking Lifecycle

```
User opens dialog (e.g. trackDialog.show())
    │
    ├── dialog.classList.remove('ds-none')        ← class change
    │
    └── MutationObserver fires
            └── observer.disconnect()
            └── refreshLayout() → dockActiveDialog()
                    ├── activeDialogId is null → check getOpenDialogs()
                    ├── dialog found
                    ├── .dia_header_div   → #editorLayoutDialogHeader
                    │       └── .closeIcons gets { once:true } click interceptor
                    ├── [data-id=dialog-body]   → #editorLayoutDialogBody
                    ├── [data-id=dialog-footer] → #editorLayoutDialogFooter
                    ├── dialog.dataset.elDocked = "true"   (no MutationObserver re-fire)
                    └── #editorLayoutDialogHost ds-none removed → host visible
            └── observer.reconnect()

Any subsequent class mutation (unrelated)
    └── MutationObserver fires → dockActiveDialog()
            └── activeDialogId set, element has no ds-none → return early, host stays visible

User clicks close icon (×)
    ├── { once:true } interceptor runs (stopPropagation)
    ├── _undockDialog() → nodes returned to dialog-content
    ├── MODULE_LIST[id].closeDialog() → dialog.classList.add('ds-none')
    │
    └── MutationObserver fires → dockActiveDialog()
            └── activeDialogId set, element has ds-none
            └── _undockDialog() (already done, slots empty — no-op)
            └── activeDialogId = null
            └── #editorLayoutDialogHost ds-none added → host hidden

User re-opens same dialog
    └── dialog-content is intact → docks cleanly again ✓
```
