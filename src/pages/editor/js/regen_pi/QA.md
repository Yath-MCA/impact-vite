# Regen-pi — QA

**Module:** `src/js/regen_pi/` + `AuthorRegenPiBridge`  
**Editor entry:** Edit Author / byline Update → `xTagValidation`  
**Mantis:** Not supplied

## Automated regression

```powershell
cd C:\_IMPACT\tomcat\webapps\impact_qa
npm run test:unit -- tests/unit/regen_pi
```

| Suite | Covers |
|-------|--------|
| `regenPi.legacy.test.js` | Legacy parse, strip→regen, roles, Option B parse smoke, blank classname reject |
| `authorRegenPiBridge.test.js` | M_SCOPE → HTML pistart, collab last-before, empty-corresp skip, Option B preference |
| `stripHtmlPistart.test.js` | HTML strip + `resolveOneDoc` one-doc/meta fixtures |
| `regenPi.xtagWiring.test.js` | Fourm calls `xTagValidation`; NewModule uses bridge; gulp includes `dialogModules/*.js` |

Expected: all tests in that folder pass. Record Vitest counts from the current run.

See also [RUN.md](./RUN.md).

## Preconditions (manual)

- Editor assets rebuilt so `RegenPiLib` + `AuthorRegenPiBridge` are on the page.  
- Journal with author editing allowed (`XTAG_VALIDATION` true — e.g. mini/full edit mode).  
- Article with ≥2 authors, multiple aff xrefs preferred; optionally a collab contrib.  
- Known separator values from journal type-config (`givennamesep`, `crosslinksep`, `contribsep`, `contrib-last-sep`).

## Manual smoke

### R01 — Edit Author Update (happy path)

1. Open Edit Author on a middle author.  
2. Change a name field → Update.  
3. Expect: `span.pistart` restored; given-names sep matches journal; no duplicate pistart inside the same `.given-names`.  
4. Expect: between-contribs “and” / comma matches role (first / last-before / last).  
5. Last author: **no** empty trailing pistart for between-contribs.

### R02 — Preview / Event_Trigger

1. With dialog open, change a field so preview `Event_Trigger` runs (`AuthorModule: true`).  
2. Expect: xrefs still ordered at end of contrib; seps present; no console `ErrorLogTrace` on happy path.

### R03 — Multi-xref

1. Author with ≥2 aff xrefs.  
2. Expect: comma (or journal crosslink sep) **between** xrefs, not after the last xref alone (between-contribs handles end).  
3. Empty corresp xref after aff: **no** sep between aff and empty corresp.

### R04 — Collab group

1. Contrib-group ending with collab.  
2. Expect: “and” / last-sep on legacy last-before author (`n-3` when collab present), not wrongly on the author immediately before collab if that index is only `n-2` under raw roleOf.

### R05 — Bridge off / fallback

1. If `RegenPiLib` missing (broken build), expect legacy `processXrefElements` + `addProcessingInstructionsToElements` still run (no hard throw from `xTagValidation`).

### R06 — Non-journal / editor contrib

1. Confirm non-journal or editor-only paths are unchanged (no unexpected pistart churn).

### R07 — Option B (when wired)

1. When caller passes `options.regenPi.xmlText` / `xmlDoc` with Option B config, expect those values to win over M_SCOPE.  
2. Today live Fourm does not pass `regenPi` unless explicitly extended — M_SCOPE is the production default until journal `XML_DOC` is opted in.

### R08 — One-doc operators (external harness)

1. Python `--one-doc` for LWW/MD → only one docid processed; `contrib_group_strip_pi.xml` / regen written.  
2. `npm run regen-pi:strip-html -- --root … --client LWW --project-code MD` → `contrib_preview_strip_pi.html` and `{stem}_strip_pi.html` with no remaining pistart.  
3. See [RUN.md](./RUN.md) for exact commands.

## Expected results checklist

- [ ] `npm run test:unit -- tests/unit/regen_pi` green  
- [ ] Edit Author Update: pistart match journal seps; no duplicates  
- [ ] Multi-xref + empty corresp behavior matches R03  
- [ ] Collab last-before matches R04  
- [ ] Surname / degrees seps still appear when configured (bridge uses `skipGivenNames` only)  
- [ ] No happy-path `ErrorLogTrace` spam  
- [ ] (Optional) R08 one-doc XML + HTML strip artifacts written
