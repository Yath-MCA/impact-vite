# Pack VERSION + shared legacyAjax

> Hybrid `e6_*.min.js` packs remain a **temporary bridge**. Deep ESM `import()` retirement is backlog.

**Done in this pass:**
- Drop `${{VERSION}}$` from Slice A / ErrorMail / classic index copy-source; use `window.VERSION`
- `generate-env` fills `VERSION` from `package.json` (env override supported)
- Packer asserts no leftover `${{` in concat output
- `src/shared/legacyAjax.js` — `$.ajaxSetup` + `commonfn.callajax` for SPA-wide use (`main.js`, editor `applyLegacyGlobals`, landing session globals)
- Dev: `predev` = env only; `USE_EDITOR_PACK: false` → Vite `?url` HMR
- Prod-like env / `USE_EDITOR_PACK: true` → prefer packs when present

**Backlog (former ESM phases):**
- ESM islands (QCS) via true `import()`
- Ordered ESM boot graph; retire `e6_*.min.js` concat
- Vendors / module_main / CKEditor / read-only HTML gulp URLs

**Cache bust:** bump `package.json` `"version"` (or set `VERSION` / `ENV.VERSION`).
