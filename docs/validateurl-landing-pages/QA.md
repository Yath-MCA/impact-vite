# Validate-URL landing pages — QA checklist

**Docs:** [skills.md](./skills.md) · [WORKFLOW.md](./WORKFLOW.md) · [DEV.md](./DEV.md)

Pass/fail cases for the templated `dist/validateurl*.html` build (one shared template + per-client JSON → 15 generated files).

## Prerequisites

- `npx gulp install-all-plugins` if gulp packages are missing.
- Run `npx gulp local` (or `uat`) from the repo root. Note: the overall gulp process may exit 1 due to a pre-existing unrelated bug in `process-pages` (see [DEV.md](./DEV.md) Known gaps) — that alone is not a failure of this feature; confirm the `generate-landing-pages` task's own console output separately (`✅ Landing page generated: ...` × 15).

---

## Build output

| # | Steps | Expected |
|---|--------|----------|
| B1 | Run the build | `dist/validateurl.html` plus all 14 `dist/validateurl{client}.html` files exist (acs, brill, intellect, lse, lww, medknow, nihr, oho, oso, oup, oxmedo, plos, tnf, tnfjournals) |
| B2 | Grep each generated file for `${{` | No matches — an unresolved placeholder means a template/JSON key mismatch |
| B3 | Validate HTML structure of each generated file | No unclosed tags leaked from the old source files (several pre-migration files, e.g. tnfjournals, had malformed `<li>`/`<p>` markup that should now be fixed in the shared template) |
| B4 | Required IDs present in every generated file | `formLanding`, `generateOTPBtn`, `ValidateBtnOpt`, `eMailValidate`, `ModelDialogAppend`, and the DOI-info fields `vmaintitle`, `title1`, `doi`, `headerlabel`, `title2`, `authorname` (`coverSectionNew` only for non-book clients; book-layout clients using `doi_info_books` intentionally omit the cover div) |

---

## Per-client content checks

| # | Client | Steps | Expected |
|---|--------|--------|----------|
| C1 | `default` / base | Open `dist/validateurl.html` | Generic branding (Newgen favicon/logo), generic welcome text, bullet-list Instructions, standard Disclaimer, `doi_info` panel |
| C2 | `acs` | Open `dist/validateurlacs.html` | ACS favicon/logo, ACS homepage navbar link, ACS-specific welcome sentence, `form_button_group`/`doi_info`/`browser` render via shared components (previously inlined — confirm visually equivalent) |
| C3 | `oup` | Open `dist/validateurloup.html` | `navbar-dark bg-blue` navbar, OUP logo/link, ordered-list Instructions **plus** separate Notes section, Disclaimer **with** extra licensing sentence + link to `academic.oup.com/.../online_licensing`, `trans_only` component present, `doi_info` panel |
| C4 | `tnfjournals` | Open `dist/validateurltnfjournals.html` | `<title>` is "T&F - Online Correction Tool", T&F Journals favicon/logo, Chinese third-party-plugin warning block present after the Disclaimer, footer browser-support block includes the Opera row (`browser_opera` component), well-formed HTML (no dangling `<li>`) |
| C5 | Book clients (`lse`, `oho`, `oso`, `oxmedo`, `tnf`) | Open each `dist/validateurl{client}.html` | `doi_info_books` layout renders (no `coverSectionNew` cover div; fields render in the book-panel layout, not the journal flex-row layout) |
| C6 | Drifted clients (`acs`, `oup`, `oho`, `oso`, `oxmedo`) | Compare rendered `form_button_group` / `doi_info` / `browser` markup against `snippet/component/*.html` | Now sourced from the shared components instead of client-inlined markup — visually/functionally equivalent (same button IDs, same field IDs, same footer browser list) |
| C7 | Remaining clients (`brill`, `intellect`, `lww`, `medknow`, `nihr`, `plos`) | Open each generated file | Correct client favicon/logo/navbar link, correct welcome text and Disclaimer wording, no cross-client content bleed |

---

## Regression / redirect wiring

| # | Steps | Expected |
|---|--------|----------|
| R1 | Check `src/clientconfig/journals/acs/config.xml` (or another client) `sign_off.default` | Still reads `validateurlacs.html?key=` — unchanged filename, so no config.xml edits were required by this refactor |
| R2 | Full proof sign-off flow for one client (e.g. ACS) in a deployed/UAT build | Redirects to the correct generated `validateurlacs.html`; page loads branding/DOI info correctly; Agree & Continue / Validate Email buttons work |

---

## Adding a new client (verification)

| # | Steps | Expected |
|---|--------|----------|
| N1 | Add a new key to `src/clientconfig/landing-pages.json`, rebuild | New `dist/validateurl{newclient}.html` appears with no code changes elsewhere |
| N2 | Leave one token out of the new entry by mistake, rebuild | That token's literal `${{token}}$` text appears in the output — confirms the "fails silently, not loudly" behavior QA should watch for (see B2) |
