# Fix Ondemand Template 404s With A Build-Time Template Bundle

## Summary
Use a generated single template bundle as the primary source for module dialog HTML, while keeping the current per-module `template.html` fetch as fallback. This removes most `loadTemplate HTTP error! status: 404` cases from ondemand modules like `figures`, without forcing every module template into its JS file.

## Key Changes
- Add a gulp build step that reads `src/modules/**/template.html` and emits one file:
  - `dist/assets/${version}/modules/templates.html`
  - Each entry stored as `<template data-template-path="./figures/template.html">...</template>`.
- Add a small runtime `ModuleTemplateStore` helper in the module loader area:
  - Normalizes paths like `./figures/template.html`, `figures/template.html`, and Windows slashes.
  - Loads `assets/${iVersion}/modules/templates.html` once.
  - Returns the matching template HTML by `templatePath`.
- Update both template loaders:
  - `BaseModule.loadTemplate(templatePath)` in `src/modules/module_main.js`
  - `ContextMenuGroup.loadTemplateForInstance(instance, templatePath)` in `src/modules/ContextMenuGroup.js`
- Loader order:
  - First use existing DOM if dialog already exists.
  - Then try `ModuleTemplateStore`.
  - Then fallback to existing individual fetch URL.
  - If both fail, log the exact template path and resolved URLs.
- Keep module configs unchanged, including `src/modules/figures/context.js`:
  - `type: 'ondemand'`
  - `templatePath: './figures/template.html'`

## Build Updates
- Extend the existing gulp `single_module` HTML flow rather than replacing it.
- Add the template-bundle task into the normal build series after environment config/version is known and before `process-pages` completes.
- Add a build validation check:
  - Every registered `templatePath` in `src/modules/**/context.js` must have a matching source template.
  - Every source template must be present in `templates.html`.
  - Fail the build if any required template is missing.

## Test Plan
- Build locally and confirm:
  - `dist/assets/{version}/modules/templates.html` exists.
  - It contains entries for `./figures/template.html`, `./tables/template.html`, `./notes_group/template.html`, and `./qc_validation/template.html`.
- Browser test:
  - Open editor page.
  - Trigger figure ondemand action.
  - Confirm no request is made to `modules/figures/template.html` when bundle has the entry.
  - Confirm dialog appends correctly into `#ModelDialogAppend`.
- Fallback test:
  - Temporarily remove the figures entry from the generated bundle.
  - Confirm loader falls back to existing `assets/{version}/modules/./figures/template.html?...` fetch.
- Failure test:
  - Simulate missing bundle and missing individual file.
  - Confirm error log includes module name, `templatePath`, bundle URL, and fallback URL.

## Assumptions
- Recommended strategy is the selected “Manifest Bundle” approach.
- Existing per-module template files remain the source of truth.
- Runtime should remain backward compatible with current ondemand module registration.
- We should not inline templates into every module JS unless bundle loading still proves unreliable.
