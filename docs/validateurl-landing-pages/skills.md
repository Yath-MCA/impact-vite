# Validate-URL landing pages — skills entry

**Audience:** agents and onboarding. Client-branded landing pages (`dist/validateurl*.html`) in **impactweb**, generated at build time from one shared template.

**Docs:** [WORKFLOW.md](./WORKFLOW.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md)

---

## What this is (definition)

`snippet/validateurl.html` is the **single** base template for every client's post-signoff landing page. Per-client branding/copy lives as data in `src/clientconfig/landing-pages.json`, keyed by client id. A dedicated gulp task, `generate-landing-pages`, merges each client entry over `global.config` and runs the existing `${{token}}$` placeholder engine (`utils/gulp/replacePlaceholders.js`) once per client, writing `dist/validateurl.html` (client id `default`) and `dist/validateurl{client}.html` for every other id.

There used to be 14 separate hand-edited HTML files (`snippet/validateurlacs.html`, `validateurloup.html`, …) — those are **deleted**. Do not recreate a per-client HTML file for a new client; add a JSON entry instead.

---

## Key symbols (impactweb)

| Symbol | Role | As implemented |
|--------|------|-----------------|
| `snippet/validateurl.html` | Shared base template, all variance as `${{token}}$` placeholders | Base template |
| `src/clientconfig/landing-pages.json` | Per-client token values, keyed by client id (`default`, `acs`, `oup`, `tnfjournals`, …) | Data file |
| `generateLandingPages` | Reads template + JSON, calls `replacePlaceholders` per client, minifies, writes `dist/validateurl*.html` | [`utils/gulp/generate-landing-pages.js`](../../utils/gulp/generate-landing-pages.js) |
| `gulp.task('generate-landing-pages', ...)` | Wired into `build` series right after `replace-html-templates` | [`gulpfile.js`](../../gulpfile.js) |
| `replacePlaceholders` / `templateMap` | Shared `${{key}}$`/`{{key}}` resolver; component partials under `snippet/component/` | [`utils/gulp/replacePlaceholders.js`](../../utils/gulp/replacePlaceholders.js) |
| `main_html.input` | Generic `snippet/*.html` → `dist/` pass; **excludes** `validateurl*.html` so it isn't double-processed | [`utils/gulp/pipeline.js`](../../utils/gulp/pipeline.js) |
| `doi_component` token | Switches between `doi_info` / `doi_info_books` component per client via `templateMap` indirection | JSON entry + `replacePlaceholders.js` |
| `client_config/{journals,books}/{client}/config.xml` | `sign_off.default` still points at the literal filename (e.g. `validateurlacs.html?key=`) — unchanged by this refactor | `src/clientconfig/**/config.xml` |

---

## Do

- Add a new client by adding one entry to `src/clientconfig/landing-pages.json` — copy the `default` entry and fill in the client's branding/copy tokens. No HTML file, no gulp change.
- Keep the output filename convention exact: JSON key `foo` → `dist/validateurlfoo.html`; key `default` → `dist/validateurl.html`. This must match whatever `config.xml`'s `sign_off.default` for that client already expects (or will be set to).
- Put structurally different regions (Instructions/Notes list, Disclaimer, any client-only extra block) in as raw HTML fragment strings in the JSON — the resolver inserts them unescaped, same as component files do.
- Reuse the shared components (`${{form_button_group}}$`, `${{doi_info}}$`/`${{doi_info_books}}$`, `${{browser}}$`, `${{browser_opera}}$`) instead of inlining their markup in a client's JSON entry — a shared fix should reach every client automatically.
- Run the build and diff-check the generated output (see [QA.md](./QA.md)) after any template or JSON change — a bad token name silently renders as literal `${{...}}$` text instead of failing the build.

## Do not

- Do not add a new `snippet/validateurl{client}.html` file — that reintroduces the duplication this refactor removed.
- Do not rename or restructure JSON keys without also updating `snippet/validateurl.html` — the resolver leaves unknown `${{token}}$` placeholders untouched instead of erroring, so mismatches fail silently in the rendered HTML.
- Do not inline branding/copy directly in `snippet/validateurl.html` — everything client-specific belongs in the JSON.
- Do not change `dist/validateurl*.html` filenames without also updating the matching `config.xml` `sign_off.default` value(s).

---

## Quick debug

1. Run `npx gulp local` (or `uat`) and check `dist/validateurl*.html` exist — 15 files (`validateurl.html` + 14 client variants).
2. Grep the generated output for `${{` — anything left is an unresolved token (typo'd key in the template, or missing key in the JSON entry).
3. To check one client's rendered fields quickly: `node -e "console.log(JSON.parse(require('fs').readFileSync('src/clientconfig/landing-pages.json')).acs)"`.
4. `console.error` lines from `generate-landing-pages.js` (`❌ Error generating landing pages`) mean the template or JSON file failed to read/parse — check paths and JSON syntax first.
