# QC Validation (`src/modules/shared/qc_validation`)

Internal Validation for collators (missing citations, DTD/xref errors, double spaces in track tags), organized in three tabs with per-tab confirm when errors exist.

More detail: [DEV.md](./DEV.md) (developers), [QA.md](./QA.md) (QA checklist).

## Layout

| File | Role |
|------|------|
| `QcValidationCore.js` | Shared SELECTOR + validation/UI logic (no dialog lifecycle) |
| `QcValidationModule.js` | Editor adapter — `extends BaseModule`, uses `template.html` |
| `QcValidationTrackModule.js` | Track View adapter — plain class, mounts via `dialogModule` |
| `index.js` | Editor entry for `moduleSystem` (`path: ./qc_validation/index.js`) |
| `context.js` | Editor register / open / finalize hooks (packed in `global_context`) |
| `template.html` | **Single** dialog markup — editor via BaseModule; Track fetches same file at bootstrap |

```
Editor (editor6.html)
  module_main (BaseModule) + global_context (context.js)
    → moduleSystem loads index.js → QcValidationModule

Track View (editor6TrackView.html)
  e6_common (dialogModule) + e6_Track
    → ES import QcValidationTrackModule.js → dialogModule mount
```

## Why two adapters

- **Editor** has `module_main` / `BaseModule` / `moduleSystem`.
- **Track View** does **not** load `module_main`. It does load `dialogModule` from `e6_common`.
- Track must **not** import `index.js` / `QcValidationModule.js` (those require `BaseModule`).

## Track bootstrap (important)

In [`snippet/editor6TrackView.html`](../../../snippet/editor6TrackView.html):

1. Import **must** use a relative ES module specifier (browsers reject bare `assets/...`):

```js
from './assets/${{VERSION}}$/modules/qc_validation/QcValidationTrackModule.js?_${{TIMESTAMP}}$';
```

2. Poll until `IS_TRACK_VIEW`, `dialogModule`, and `USER_INFO` exist, then call `bootstrapQcValidationTrack()`.

3. Bootstrap:
   - `fetch('./assets/<ver>/modules/qc_validation/template.html')` (shared with editor — **do not** inline a second copy)
   - `Object.assign(instance, new dialogModule(id, html))`
   - `MODULE_LIST[id] = instance`
   - `instance.init()` so profile “Show Validation Log” is wired without waiting for first `show()`

## Gulp

- `single_module` copies `src/modules/shared/qc_validation/*.js` (except `context.js`) under `dist/assets/{version}/modules/qc_validation/` with `base: src/modules`.
- `global_context` packs `**/context.js`.
- `e6_Track` does **not** concat QC ES modules (concat breaks `import`/`export`).

## Rebuild

```bash
npx gulp process-pages
# or full build for your env
npx gulp
```

After build, confirm:

- `dist/assets/<ver>/modules/qc_validation/index.js`
- `dist/assets/<ver>/modules/qc_validation/QcValidationCore.js`
- `dist/assets/<ver>/modules/qc_validation/QcValidationModule.js`
- `dist/assets/<ver>/modules/qc_validation/QcValidationTrackModule.js`
- `dist/assets/<ver>/modules/qc_validation/template.html`
