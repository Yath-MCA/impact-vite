---
name: qc-validation
description: >-
  Use when changing Internal Validation / qualityCheckerDialog, src/modules/shared/qc_validation,
  editor6TrackView.html Track QC bootstrap, or e6_Track / single_module packaging for QC.
  Enforces Core + editor BaseModule + Track dialogModule dual bootstrap.
---

# QC Validation

Internal Validation lives under `src/modules/shared/qc_validation/`. Read [README.md](../../../src/modules/shared/qc_validation/README.md), [DEV.md](../../../src/modules/shared/qc_validation/DEV.md), and [QA.md](../../../src/modules/shared/qc_validation/QA.md) before changing behavior.

## Hard rules

1. **Core + two adapters**
   - `QcValidationCore.js` — shared checks only
   - `QcValidationModule.js` — `extends BaseModule` (editor only)
   - `QcValidationTrackModule.js` — plain class + `dialogModule` (Track only)

2. **Editor**
   - Register with `path: './qc_validation/index.js'` + `templatePath` in `context.js`
   - Do not rely on bare `moduleClass: QcValidationModule` in `context.js` (class not in that scope)
   - Skip Track (`IS_TRACK_VIEW`) in finalize / register hooks

3. **Track View**
   - Do **not** uncomment `module_main.js` on `snippet/editor6TrackView.html`
   - Do **not** import `index.js` or `QcValidationModule.js` on Track (needs `BaseModule`)
   - ES import **must** start with `./` (or `/`):

```js
from './assets/${{VERSION}}$/modules/qc_validation/QcValidationTrackModule.js?_${{TIMESTAMP}}$';
```

   - Bare `assets/...` causes: `Relative references must start with "/", "./", or "../"`
   - Bootstrap: `dialogModule` assign → `MODULE_LIST[id] = instance` → `instance.init()`

4. **Gulp**
   - Ship siblings via `single_module` (`src/modules/shared/qc_validation/*.js`, exclude `context.js`)
   - Do **not** concat ES QC modules into `e6_Track` (breaks `import`/`export`)

## When editing

- Prefer changing Core for check logic; keep adapters thin.
- Dialog markup: edit `template.html` only (editor + Track share it).
- After Track HTML or module path changes, verify Network 200 for TrackModule + Core + `template.html` and no console specifier errors.
- Keep DEV/QA docs in sync if flows change.
