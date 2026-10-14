# Regen-pi — skills

Agent guidance for contrib-group PI regeneration in IMPACT.

## When to use this skill

- Changing separator PI behavior after Edit Author / byline Update
- Porting or syncing Python `regen_compare_v1` / `load_config` rules into JS
- Adding fixtures for a new client family (legacy or Option B)
- Debugging duplicate / missing `span.pistart` after `xTagValidation`

## Do not confuse

| Name | Location | Role |
|------|----------|------|
| `regen-pi.js` (ESM) | `src/js/regen_pi/` | Canonical engine for Vitest / Node |
| `regenPiLib.js` (UMD) | `src/js/dialogModules/` | Browser global `RegenPiLib` (gulp bundle) |
| `AuthorRegenPiBridge` | `authorRegenPiBridge.js` | HTML pistart adapter + config resolve |
| Legacy `xTagValidation` helpers | `AuthorGroupNewModule.js` | Fallback when bridge unavailable / fails |
| `OrderNewLink` | same module | Different path (link order), not RegenPi |

**Keep ESM and UMD in sync.** Prefer editing `src/js/regen_pi/regen-pi.js`, then copy/adapt into `regenPiLib.js` (UMD wrapper). Do not put bare `export` in `dialogModules/` — gulp concatenates classic scripts.

## Operations

### CLI-PARITY REGEN (XML string)

1. Load config: `RegenPi.fromXml(xml)` or `fromXmlDoc(doc)`.  
2. `stripPistart(originalXml)`.  
3. `engine.regen(stripped)` → assert vs golden (normalize whitespace/entities).  

Fixtures: `tests/fixtures/regen_pi/old|new/`.

### HTML STRIP (one doc)

1. `stripHtmlPistart(html)` removes `span.pistart` (not `attributepistart`).  
2. Operator CLI: `npm run regen-pi:strip-html -- --root … --client … --project-code … [--docid]`.  
3. Writes `contrib_preview_strip_pi.html` + `{stem}_strip_pi.html` from `original_html`.  
4. Doc pick: `resolveOneDoc` over `meta.json` / `documents.json` (first sorted JATS match when docid omitted).

### EDITOR APPLY (HTML)

1. `AuthorEditDialog` Update_fire / Event_Trigger (when `XTAG_VALIDATION`).  
2. `AuthorGroupNewModule.xTagValidation` → `removeProcessingInstructions`.  
3. If `AuthorRegenPiBridge.shouldUse(authorModule)` → `applyToContrib(...)`.  
4. Else legacy `processXrefElements` + `addProcessingInstructionsToElements`.  
5. When bridge used: still call `addProcessingInstructionsToElements(..., { skipGivenNames: true })` for surname / degrees / affix seps.

### RESOLVE CONFIG

Precedence (bridge):

1. Explicit `options.regenPi.xmlDoc` / `xmlText` / `clientConfig`  
2. Else `buildConfigFromAuthorScope(M_SCOPE)` (givenname / cross_link / contrib / last seps)

Do **not** opportunistically call `fromClientConfig(undefined)` — that can silently override journal M_SCOPE.

### ADD CLIENT FIXTURE

1. Drop sample under `tests/fixtures/regen_pi/old/` or `new/`.  
2. Extend `tests/unit/regen_pi/` (parse + strip→regen and/or bridge DOM).  
3. Run `npm run test:unit -- tests/unit/regen_pi`.

## Change rules

- Prefer extending `RegenPiRule` / `pickBetweenContribsRule` / bridge helpers over forking a second apply path in Fourm.  
- Preserve HTML shape: `span.pistart` + `data-name` / `data-pi` / `data-pistart` / `contenteditable="false"`.  
- Honor collab-aware `contributorInfo.isLastBefore` / `isLastAuthor` (legacy index `n-3` when group has collab).  
- Keep PLOS aff→aff-only between-xrefs and empty-corresp skip.  
- Skip empty last-author pistart (legacy inserts nothing).  
- Wrap bridge failures with warn + `ErrorLogTrace`; return `false` so legacy path can run if the call site allows.

## Related docs

- [README.md](./README.md), [DEV.md](./DEV.md), [RUN.md](./RUN.md), [QA.md](./QA.md)  
- `../dialogModules/docs/AuthorGroupNewModule/` — byline / `xTagValidation` gates  
- `../dialogModules/docs/AuthorEditDialog/` — Update_fire path
