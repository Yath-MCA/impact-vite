# Regen-pi — Run

Commands for local verification. Prefer focused suite during development.

## Unit (required)

```powershell
cd C:\_IMPACT\tomcat\webapps\impact_qa
npm run test:unit -- tests/unit/regen_pi
```

Expected: all files under `tests/unit/regen_pi/` pass (legacy CLI-parity, bridge DOM, HTML strip, wiring source).

### Subsets

```powershell
# Legacy + Option B XML smoke only
npm run test:unit -- tests/unit/regen_pi/regenPi.legacy.test.js

# HTML bridge + precedence
npm run test:unit -- tests/unit/regen_pi/authorRegenPiBridge.test.js

# HTML strip + one-doc resolver
npm run test:unit -- tests/unit/regen_pi/stripHtmlPistart.test.js

# Fourm / xTagValidation / gulp include wiring
npm run test:unit -- tests/unit/regen_pi/regenPi.xtagWiring.test.js
```

## Related AuthorGroup unit

```powershell
npx vitest run tests/unit/author_group
```

## Build note

After changing `dialogModules/regenPiLib.js` or `authorRegenPiBridge.js`, rebuild the editor assets the usual way for your environment (e.g. `npx gulp local` or the project’s webpack/gulp pipeline) before manual UI smoke.

## One-doc operators (external harness)

`contrib_group_original_clean.xml` still contains `<?pistart?>` (comments cleaned only). Strip writes `contrib_group_strip_pi.xml`.

### Python XML strip/regen (one doc)

```powershell
cd "D:\NEW_GEN\LIVE_SUPPORT_2026\FOOTNOTES\From-2026-1st-to-now\contrib_script\extract_contrib_package"

python .\run_cli.py `
  --root "D:\NEW_GEN\LIVE_SUPPORT_2026\FOOTNOTES\From-2026-1st-to-now" `
  --client LWW `
  --project-code MD `
  --workflow regen-pi `
  --one-doc

# or explicit id
python .\run_cli.py `
  --root "D:\NEW_GEN\LIVE_SUPPORT_2026\FOOTNOTES\From-2026-1st-to-now" `
  --client LWW `
  --project-code MD `
  --workflow regen-pi `
  --docid N0032c01d-a8f4-444c-bdb9-23cd92f43e8e
```

### Node HTML strip (contrib_preview + original_html)

```powershell
cd C:\_IMPACT\tomcat\webapps\impact_qa

npm run regen-pi:strip-html -- `
  --root "D:\NEW_GEN\LIVE_SUPPORT_2026\FOOTNOTES\From-2026-1st-to-now" `
  --client LWW `
  --project-code MD `
  --one-doc
```

Writes beside sources:

- `contrib_preview_strip_pi.html`
- `{stem}_strip_pi.html` from `documents.json` `files.original_html`

Uses `meta.json` / `documents.json` to pick the first matching JATS docid (or `--docid`). No live network.

## Fixture locations

| Path | Contents |
|------|----------|
| `tests/fixtures/regen_pi/old/` | `pi-config.legacy.xml`, `contrib_group_original_clean.xml`, `contrib_group_regen.xml` |
| `tests/fixtures/regen_pi/new/` | `LWW_MD.separator-classname.xml` |
| `tests/fixtures/regen_pi/html/` | HTML pistart snippet + stub meta/documents for resolver tests |
