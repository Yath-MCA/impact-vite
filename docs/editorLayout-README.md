# editorLayout

Manages all responsive column layout, panel visibility, and dialog docking for the Impact editor page (`editor6` / `editor6TrackView`).

---

## Architecture overview

```
window.editorLayout  (singleton)
│
├── ColSet              Encodes Bootstrap responsive col specs
├── COL                 Frozen map of all column presets
│
├── Profiles            Named layout configs (e.g. "three-column")
│   └── profileMap      Keyed by layoutConfig mode string
│
├── Layout modes
│   ├── default         Four-panel, all elements visible, togglable panels
│   └── three-column    Two-panel + docked dialog column, pdf/thumb/viewOption hidden
│
├── Dialog docking      Allowed dialogs moved into editorLayoutDialogHost
│   ├── _captureFullDOMSnapshot()   Save state before dock
│   └── _restoreFullDOMSnapshot()   Restore state after undock
│
└── Revision snapshot   Save/restore layout around showRevision panel
```

---

## Column system

### `ColSet`

Encodes a responsive Bootstrap column spec as a plain object and converts it to class strings on demand.

```js
new ColSet({ xs: 12, md: 10, lg: 10, xl: 10 }).toClasses()
// → ["col-12", "col-md-10", "col-lg-10", "col-xl-10"]

ColSet.allCols()
// → every col-{bp}-{n} from col-6…col-12, all breakpoints
// Used as the removeClasses sweep in setClasses() to wipe stale values
```

### `COL` presets (frozen)

| Key | Used for | Widths |
|-----|----------|--------|
| `host` | `editorLayoutDialogHost` | xs:12 / md–xl: 3 |
| `viewDefault` | viewArea — profile, no dialog | xs–xl: 10 |
| `viewDialogWithToc` | viewArea — dialog open, TOC visible | xs:8 sm:8 md–xl:7 |
| `viewDialogNoToc` | viewArea — dialog open, TOC hidden | xs–sm:12 md–xl:9 |
| `viewNoDialog` | viewArea — no dialog, TOC hidden | 12 everywhere |
| `editorFull` | editorSection — profile mode always | 12 everywhere |
| `defaultBothPanels` | viewArea — TOC + thumb both open | md–xl: 9 |
| `defaultEditorOnly` | viewArea — TOC open, thumb hidden | md–xl: 10 |
| `defaultThumbOnly` | viewArea — thumb open, TOC hidden | md–xl: 11 |
| `defaultNoPanels` | viewArea — both closed | md–xl: 12 |
| `splitHalf` | editorSection / pdfSection both-view | md–xl: 6 |
| `splitFull` | editorSection / pdfSection single-view | md–xl: 12 |

`ALL_COLS` and `ALL_COLS_MDXL` are pre-computed sweep arrays passed as `removeClasses` to ensure no stale col class lingers between state transitions.

---

## Layout modes

The active mode is resolved in `getCurrentLayoutMode()`:

```
window.EDITOR_LAYOUT_CONFIG  ← lowest priority (page-level override)
     ↓ merged with
this.layoutConfig             ← instance config (highest priority)
     ↓
isReadOnlyPage() ? config.readOnly : config.editor6
```

`"default"` → no profile, four-panel layout.  
Any other string → looked up in `profileMap`.

### `getActiveProfile()`

Returns `null` for `"default"` or any mode not found in `profileMap`. Returns a normalized profile object otherwise.

---

## Profiles

Defined in `profileMap` (constructor `options.profileMap` merges over the built-in defaults).

### Built-in: `"three-column"`

```js
{
    name: "two-panel-with-dialog-column",
    hidePdf: true,
    hideThumbnail: true,
    hideViewOption: true,
    useThirdColumnDialogs: true
}
```

Elements hidden permanently when this profile is active: `iPdfSection`, `iPdfThumbnail_Section`, `NaviButton2`, `viewoptn`.

### Adding a custom profile

```js
window.editorLayout = new editorLayout({
    layoutConfig: { editor6: "my-profile" },
    profileMap: {
        "my-profile": {
            name: "my-profile",
            hidePdf: false,
            hideThumbnail: false,
            hideViewOption: false,
            useThirdColumnDialogs: true
        }
    }
});
```

Or switch at runtime without a page reload:

```js
window.editorLayout.applyMetaConfig({ editor6: "three-column" });
```

---

## Refresh cycle

`refreshLayout()` is the single entry point for any layout recalculation.

```
refreshLayout()
  │
  ├─ dockActiveDialog()        ← ALWAYS runs first
  │    ├─ if allowed dialog open + profile null/default:
  │    │    _captureFullDOMSnapshot()
  │    │    layoutConfig → "three-column" (transient)
  │    └─ returns true (hasDialog) or false
  │
  ├─ getActiveProfile()        ← read AFTER dock (sees injected profile)
  │
  ├─ [profile != null]
  │    ├─ enforceProfileLayout()   hide/show per profile flags
  │    └─ applyProfileColumnLayout(hasDialog)
  │
  └─ [profile == null]
       └─ applyDefaultColumnLayout()
```

`setClasses(target, add, remove)` is the only method that touches Bootstrap col classes. It always removes the full sweep array first, then adds the new set.

---

## Dialog docking

### Allowed dialogs

Only dialogs whose `id` is in `this.allowedDialogs` are docked. Default:

```js
this.allowedDialogs = ["trackDialogModule"];
```

Add entries to dock additional dialogs.

### Dock flow

1. `dockActiveDialog()` is called from `refreshLayout()`.
2. If an allowed dialog is found open (`.mDialog.w-editor-access:not(.ds-none):not([data-el-docked])`):
   - If the current profile is `null` or `default` (no `useThirdColumnDialogs`):
     - **`_captureFullDOMSnapshot()`** — stores the full `classList` of every layout element plus `layoutConfig` and `prevView`.
     - `layoutConfig` is patched transiently to `"three-column"`.
   - Dialog content (`.dia_header_div`, `[data-id="dialog-body"]`, `[data-id="dialog-footer"]`) is moved into the `editorLayoutDialogHost` slots.
   - The dialog shell is hidden via `data-el-docked="true"` (a data attribute, not a class, so the MutationObserver does not re-fire).
   - Close icon click is intercepted inside the host header (`{ once: true }`) to call `_undockDialog()` before the module's own close logic runs.

3. Returns `true` (hasDialog) → `applyProfileColumnLayout` uses three-column widths.

### Undock / close flow

1. Close icon click → `_undockDialog(dialogId)`.
2. Dialog content nodes are moved back into `.dialog-content` inside the original dialog shell.
3. `data-el-docked` attribute is removed.
4. **`_restoreFullDOMSnapshot()`** is called:
   - Each element's `className` is replaced wholesale with the saved array.
   - `this.layoutConfig` is reverted to its pre-dialog value.
   - `_savedLayoutBeforeDialog` is cleared.
   - `setView(prevView)` and `refreshLayout()` run in the restored mode.

### Snapshot fields

```js
this._savedLayoutBeforeDialog = {
    layoutConfig,       // copy of this.layoutConfig before injection
    prevView,           // "edit" | "pdf" | "both" | "maximize"
    viewArea,           // Array of classList strings
    editorSection,
    pdfSection,
    thumbnailSection,
    thumbnailButton,
    tocSection,
    viewOption,
};
```

---

## MutationObserver

Observes `#trackDialogModule` (falls back to `document.body`) for `class` attribute changes. On each relevant mutation:

1. Observer disconnects itself (prevents re-entrancy from our own DOM writes).
2. `bindTriggerElements()` — re-binds any newly injected trigger elements.
3. `refreshLayout()` — recalculates all columns and visibility.
4. Observer reconnects.

`bindEvents()` disconnects and recreates the observer each time it is called, so observers never accumulate.

---

## Navigation panels

| Element | Toggle | Permanent guard |
|---------|--------|-----------------|
| `#iTOC_Section` | `NaviButton1` click | none |
| `#iPdfThumbnail_Section` | `NaviButton2` click | blocked when `profile.hideThumbnail` is truthy |

`updateAllNavButtonStates()` syncs button title and hamburger SVG src after every toggle.

---

## View modes

| Name | `editorSection` | `pdfSection` |
|------|-----------------|--------------|
| `edit` | visible | hidden |
| `pdf` | hidden | visible |
| `both` | visible | visible |
| `maximize` | — | — (GlobalEditor.execCommand) |

`applyDefaultColumnLayout()` uses `COL.splitHalf` for both sections in `both` mode, `COL.splitFull` in single-panel mode.

---

## Revision snapshot

Non-Oxmedo clients only. Captures a lightweight snapshot (viewArea col classes + TOC hidden state) around the showRevision panel.

| Trigger | Method |
|---------|--------|
| click `[data-action='showRevision']` / `.showRevision` / `#showRevisionBtn` | `_saveLayoutSnapshot()` |
| click `[data-action='closeRevision']` / `.closeRevision` / `#closeRevisionBtn` / `.revision-dialog .closeIcons` | `_restoreLayoutSnapshot()` |

Separate from `_savedLayoutBeforeDialog` — the two snapshots do not interfere.

---

## DOM element map

| JS key | DOM id |
|--------|--------|
| `wrapper` | `#iWrapper` |
| `tocSection` | `#iTOC_Section` |
| `viewArea` | `#iViewArea` |
| `editorSection` | `#iEditorSection` |
| `pdfSection` | `#iPdfSection` |
| `thumbnailSection` | `#iPdfThumbnail_Section` |
| `thumbnailButton` | `#NaviButton2` |
| `thumbnailButtonImg` | `#hamburger_Thumbnail` |
| `viewOption` | `#viewoptn` |
| `optionDropDown` | `#view-dialog` |
| `tocButton` | `#NaviButton1` |
| `tocButtonImg` | `#hamburger` |
| dialog host | `#editorLayoutDialogHost` |
| host header | `#editorLayoutDialogHeader` |
| host body | `#editorLayoutDialogBody` |
| host footer | `#editorLayoutDialogFooter` |

---

## Public API

```js
// Read
editorLayout.getView()                    // "edit" | "pdf" | "both" | "maximize"
editorLayout.getCurrentLayoutMode()       // "default" | "three-column" | custom
editorLayout.getActiveProfile()           // normalized profile object or null
editorLayout.shouldHandleClient()         // true if a named profile is active

// Write
editorLayout.setView(viewName, target)    // switch editor/pdf/both/maximize
editorLayout.toggleNavigation(buttonId)   // "NaviButton1" | "NaviButton2"
editorLayout.applyMetaConfig(config)      // e.g. { editor6: "three-column" }
editorLayout.refreshLayout()              // force full recalculation

// ImpactView shim (window.ImpactView)
ImpactView.getView()
ImpactView.setView(viewName, target)
ImpactView.setActiveView(viewName, wasMaxiView)
ImpactView.NaviToggle(_, targetElement)
ImpactView.RestoreCursor()
ImpactView.INIT()
```

---

## Initialisation

`new editorLayout()` registers a `DOMContentLoaded` listener that polls for `#iEditorSection` every 300ms (up to 40 retries = 12s). Once found, `init()` runs once and sets `this.initialized = true`.

```js
init()
  ensureImpactViewShim()   // window.ImpactView shim
  injectStyles()           // [data-el-docked] { display: none !important }
  ensureDialogHost()       // inject #editorLayoutDialogHost into #iWrapper
  bindEvents()             // trigger elements + MutationObserver
  refreshLayout()          // initial column and visibility pass
```

---

## Configuration reference

```js
new editorLayout({
    // CSS selector for dialogs eligible for docking
    dialogSelector: ".mDialog.w-editor-access",

    // Layout mode per page type ("default" or a profileMap key)
    layoutConfig: {
        editor6: "default",
        readOnly: "default"
    },

    // Custom profiles merged over the built-in "three-column"
    profileMap: {
        "my-mode": {
            name: "my-mode",
            hidePdf: false,
            hideThumbnail: false,
            hideViewOption: false,
            useThirdColumnDialogs: true
        }
    }
});
```

`window.EDITOR_LAYOUT_CONFIG` can override `layoutConfig` at the page level (lowest priority — instance config wins).
