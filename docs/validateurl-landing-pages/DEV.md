# Validate-URL landing pages — developer guide

**Docs:** [skills.md](./skills.md) · [WORKFLOW.md](./WORKFLOW.md) · [QA.md](./QA.md)

Consolidates 15 near-duplicate `snippet/validateurl*.html` files into one templated build. Do **not** hand-author a per-client HTML file — extend the template's tokens and/or the JSON data instead.

---

## File map

| File | Responsibility |
|------|-----------------|
| [`snippet/validateurl.html`](../../snippet/validateurl.html) | Single base template for every client's landing page, all variance expressed as `${{token}}$` placeholders |
| [`src/clientconfig/landing-pages.json`](../../src/clientconfig/landing-pages.json) | Per-client token values, one object per client id, plus `default` |
| [`utils/gulp/generate-landing-pages.js`](../../utils/gulp/generate-landing-pages.js) | Build step: template + JSON → `dist/validateurl*.html` |
| [`utils/gulp/replacePlaceholders.js`](../../utils/gulp/replacePlaceholders.js) | Shared `${{key}}$`/`{{key}}` resolver (component file or config value); `templateMap` registers component partials |
| [`snippet/component/*.html`](../../snippet/component/) | Shared partials: `form_button_group`, `doi_info`, `doi_info_books`, `browser`, `browser_opera`, `browser_checker`, `page_script_landing/live/uat`, `trans_accept`, `disc_trans_accept`, `reCaptcha_google`, `analytics_clarity` |
| [`gulpfile.js`](../../gulpfile.js) | Registers `generate-landing-pages` gulp task, wired into the `build` series after `replace-html-templates` |
| [`utils/gulp/pipeline.js`](../../utils/gulp/pipeline.js) | `main_html.input` excludes `snippet/validateurl*.html` so the generic HTML pass doesn't double-process them |
| `src/clientconfig/{journals,books}/{client}/config.xml` | `sign_off.default` still references the literal output filename (e.g. `validateurlacs.html?key=`) — **unchanged**, filenames are byte-identical to before |

---

## Template tokens (`snippet/validateurl.html`)

| Token | Meaning |
|-------|---------|
| `${{page_title}}$` | `<title>` content (e.g. base/most clients: "IMPACT - Landing Page"; T&F Journals: "T&F - Online Correction Tool") |
| `${{html_translate_attr}}$` | `translate="no"` attribute on `<html>` where present, empty otherwise |
| `${{client_favicon}}$` | Favicon `href` |
| `${{extra_head}}$` / `${{extra_head_script}}$` | Optional extra `<head>` markup/scripts per client (empty by default) |
| `${{navbar_class}}$` | Extra navbar classes (e.g. OUP's `fixed-top navbar-dark bg-blue`); empty for most clients |
| `${{navbar_href}}$` / `${{navbar_href_attrs}}$` | Navbar brand link target and extra attrs (e.g. `rel="noopener" target="_blank"`) |
| `${{navbar_logo_src}}$` / `${{navbar_logo_alt}}$` / `${{navbar_logo_height}}$` / `${{navbar_logo_width}}$` | Navbar logo image |
| `${{navbar_links}}$` | Right-side navbar nav items (FAQ/User Guide links etc.) |
| `${{content_container_class}}$` | Extra class on the main content `container-fluid` (e.g. OUP's `mt-5`) |
| `${{welcome_heading}}$` | Welcome `<h3>` inner HTML |
| `${{card_col_class}}$` / `${{doi_col_class}}$` | Column classes for the instructions card vs. the DOI-info panel |
| `${{instructions_body}}$` | Full Instructions (+ optional Notes) block HTML — structure varies per client (bullet list vs. OUP's ordered list + separate Notes section), so it's one raw fragment per client rather than several smaller tokens |
| `${{disclaimer_body}}$` | Disclaimer paragraph(s), including client-specific extra sentences/links (e.g. OUP's licensing link) |
| `${{extra_content}}$` | Optional block after the disclaimer (e.g. TNF Journals' Chinese third-party-plugin warning, OUP's `${{trans_only}}$` component) — empty string when a client has none |
| `${{doi_component}}$` | Resolves via `templateMap` indirection to `doi_info` or `doi_info_books` |
| `${{footer_row_class}}$` / `${{footer_container_class}}$` | Footer row/container classes (e.g. OUP's `mw-100`) |
| `${{footer_logo}}$` | Footer brand logo markup; empty/commented for most clients |

Unchanged shared placeholders: `${{browser_checker}}$`, `${{page_script_landing}}$`, `${{form_button_group}}$`, `${{browser}}$` / `${{browser_opera}}$`, `${{VERSION}}$`, `${{TIMESTAMP}}$`.

---

## `generate-landing-pages.js`

```javascript
const baseTemplateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');       // snippet/validateurl.html
const clientConfigs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));   // src/clientconfig/landing-pages.json

Object.keys(clientConfigs).forEach((clientKey) => {
    const mergedConfig = Object.assign({}, global.config, clientConfigs[clientKey]);
    let out = replacePlaceholders(baseTemplateContent, mergedConfig);
    out = htmlmin.minify(out, HTMLMIN_OPTIONS);
    fs.writeFileSync(outputPathFor(clientKey), out, 'utf8');
});
```

- `mergedConfig` layers the client JSON entry **over** `global.config`, so a client entry can also fall back to environment values (`VERSION`, `TIMESTAMP`, `env`) resolved the normal way.
- Output filename: `default` → `dist/validateurl.html`; any other key `X` → `dist/validateurlX.html` — must match the key casing/spelling used in `config.xml` exactly (e.g. `tnfjournals`, not `tnfJournals`).
- Minified with the same `html-minifier` options used elsewhere in the pipeline (`removeComments`, `collapseWhitespace`, `removeOptionalTags: false`, `removeRedundantAttributes`).
- Composes as a normal gulp task: `(done) => {...}`, calls `done()` / `done(error)`.

---

## Build wiring

- `gulpfile.js`: `const generateLandingPages = require('./utils/gulp/generate-landing-pages');` → `gulp.task('generate-landing-pages', generateLandingPages);` → inserted into `gulp.task('build', gulp.series(..., 'replace-html-templates', 'generate-landing-pages', ...))`.
- `utils/gulp/pipeline.js`: `main_html.input` is `["snippet/*.html", "!snippet/validateurl*.html"]` — the generic `replace-html-templates` pass still handles every other `snippet/*.html` file (index, login, dashboard, editor6, workflows, etc.) unchanged; only the validateurl family is excluded so it isn't processed twice.

---

## Adding a new client

1. Add a new key to `src/clientconfig/landing-pages.json` (copy `default` or a similar existing client as a starting point) with that client's branding/copy for every token in the table above.
2. Add/confirm the client's `config.xml` (`src/clientconfig/{journals,books}/{client}/config.xml`) has `sign_off.default="validateurl{key}.html?key="` matching the JSON key.
3. Run a build (see [QA.md](./QA.md)) and confirm `dist/validateurl{key}.html` renders correctly with no leftover `${{...}}$` tokens.
4. No template, gulp, or pipeline change is needed for a client that fits the existing token set. If the client needs genuinely new structural markup (not just different text/links), add a new token to `snippet/validateurl.html` and give every existing client entry a value for it (empty string where not applicable) so the template doesn't regress for them.

---

## Known gaps

| Gap | Notes |
|-----|-------|
| `gulp local` / `gulp uat` overall exit code | The `process-pages` task in `gulpfile.js` has a pre-existing, unrelated bug — `gulp.parallel(...)((done) => {...})` never calls the outer task's `done()`, so the overall gulp process exits 1 even when every task (including `generate-landing-pages`) completed successfully. Not caused by or fixed as part of this change. |
| No token-name validation | An unresolved/misspelled `${{token}}$` is left as literal text in the output rather than failing the build — always check generated `dist/validateurl*.html` for stray `${{` after a template or JSON change. |
