# Gulp Build Utilities

This folder contains the helper modules used by the root `gulpfile.js` to build
the IMPACT web assets. The pipeline is still driven by Gulp tasks, while newer
package scripts in `package.json` map many build commands to Webpack. Use this
guide when maintaining the Gulp path or troubleshooting legacy build output.

## Common Commands

Run commands from the project root:

```powershell
npx gulp
npx gulp uat
npx gulp local
npx gulp install-all-plugins
npx gulp bundle-templates
npx gulp deploy
```

Command behavior:

- `npx gulp` runs the default task, which currently delegates to `uat`.
- `npx gulp uat` generates UAT environment config and runs the full build.
- `npx gulp local` generates local environment config and runs the full build.
- `npx gulp install-all-plugins` checks required Gulp-related packages and
  installs any missing packages into `devDependencies`.
- `npx gulp bundle-templates` validates module `templatePath` registrations and
  writes the module template bundle.
- `npx gulp deploy` zips `dist` and uploads the package through the deployment
  helper.

## Build Flow

The root `gulpfile.js` orchestrates the build. Environment tasks such as `local`,
`uat`, and `live` first call `generateEnvironmentConfig()`, which loads
environment values from `environments/base.env`, stores them in `global.config`,
and creates `global.PIPELINE` from `pipeline.js`.

The full `build` task then runs these steps in order:

1. `clean` removes root HTML output and old `assets`/`dist` output.
2. `version-txt` writes `dist/version.txt` from `global.PIPELINE.version`.
3. `replace-html-templates` processes `snippet/*.html` into `dist`.
4. `copy-ckeditor` copies CKEditor into `dist/ckeditor-{version}` and minifies
   selected plugin/config JavaScript files.
5. `vendor-process` copies or concatenates static vendor assets into
   `dist/assets/{version}`.
6. `process-pages` builds every entry in `PIPELINE.PAGES`, including JS, CSS,
   HTML, JSON, XML, and module template output where configured.

Most generated web assets land under `dist/assets/{version}`. CKEditor output is
separate under `dist/ckeditor-{version}`.

## Utility Modules

- `pipeline.js` defines page and bundle inputs. Each `PIPELINE.PAGES` entry can
  declare `JS_FILES`, `CSS_FILES`, `HTML_FILES`, `JSON_FILES`, `XML_FILES`, and
  optional output overrides such as `JS_OUT`, `CSS_OUT`, `HTML_OUT`, `JSON_OUT`,
  and `XML_OUT`.
- `file-processing-utility.js` contains the shared stream helpers for processing
  JS, CSS/SCSS, HTML, and JSON. It also contains special handling for
  `single_module` output so module files are emitted by module name instead of
  preserving the full `src/modules/...` path.
- `replacePlaceholders.js` replaces `{{key}}` and `${{key}}$` placeholders with
  values from `global.config` or with snippet content from `snippet/component`.
- `vendor-process.js` copies, concatenates, rewrites font URLs, and minifies JSON
  for vendor/static assets such as fonts, Bootstrap/jQuery bundles, UI files,
  release notes, workflows, and config schemas.
  For a generated inventory of runtime vendor libraries and CKEditor plugins
  shipped by this pipeline, see [`THIRD_PARTY_PLUGINS.md`](../../THIRD_PARTY_PLUGINS.md).
- `ckeditor-process.js` copies the CKEditor tree into versioned `dist` output and
  minifies selected CKEditor configuration/plugin files.
- `template-bundle.js` validates module `context.js` `templatePath` values
  against available `template.html` files, then writes
  `dist/assets/{version}/modules/templates.html`.
- `deploy-tasks.js` creates a zip from `dist` and uploads it to the configured
  SFTP location.
- `ensurePluginsAndRun.js` verifies the required Gulp package list and installs
  missing packages.

## Adding or Modifying a Bundle

Make bundle changes in `pipeline.js` under `PIPELINE.PAGES`.

- Add or update `JS_FILES` and `CSS_FILES` with the exact load order required by
  the page. Keep order-sensitive JavaScript arrays explicit instead of relying on
  broad globs.
- Use output overrides only when the default `COMMON_DEST.JS` or
  `COMMON_DEST.CSS` location is wrong for that bundle.
- For module templates, update `TEMPLATE_BUNDLE.SRC` and
  `TEMPLATE_BUNDLE.VALIDATE_CONTEXT` only when the default module template rules
  do not cover the new files.
- For standalone/shared modules, remember that the build strips
  `src/modules/standalone` and `src/modules/shared` roots so output lands under
  `dist/assets/{version}/modules/{moduleName}`.
- After changes, run the smallest useful task first, then inspect
  `dist/assets/{version}` for expected file names and folder structure.

## Troubleshooting

- Missing package errors: run `npx gulp install-all-plugins`, then retry the
  build. If the package is new, also update `package.json` deliberately.
- Template validation failures: check the `templatePath` values in module
  `context.js` files. Each registered path must match an available
  `template.html` after module path normalization.
- SCSS/CSS failures: check the source file named in the Sass or clean-css error.
  The CSS path uses Dart Sass through `gulp-sass` and writes minified output.
- Placeholder values not resolving: confirm the key exists in the active
  environment config or in the `templateMap` inside `replacePlaceholders.js`.
  Unknown placeholders are left unchanged.
- Binary assets copied incorrectly: use the existing Gulp 5 pattern of passing
  `{ encoding: false }` when copying binary files such as fonts and images.
- Stale local version output: the local environment uses
  `getLastGeneratedVersion()` in `pipeline.js`. If local output appears to use an
  older version, check the generated environment/version source before assuming
  the bundle config is wrong.

## Deployment Notes

`npx gulp deploy` packages the current `dist` folder and uploads the zip through
the SFTP deployment helper. Treat this as a release operation, not a normal local
build step.

Do not add or repeat credentials in documentation, logs, or new utility code.
The current deployment helper contains environment connection details in code;
future cleanup should move those values to environment variables or another
approved secret store before expanding the deployment workflow.
