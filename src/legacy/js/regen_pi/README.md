# Regen-pi

**Mantis:** Not supplied  
**Engine (ESM):** `src/js/regen_pi/regen-pi.js`  
**Runtime UMD:** `src/js/dialogModules/regenPiLib.js`  
**HTML bridge:** `src/js/dialogModules/authorRegenPiBridge.js`  
**Call site:** `AuthorGroupNewModule.xTagValidation` (via `AuthorEditDialog` Update / Event_Trigger)

## Purpose

Regenerate author-group separator processing instructions (PIs) with Python `regen_compare_v1` / `load_config` parity:

1. Strip existing pistart markers  
2. Re-apply separators from config  
3. Compare / assert against expected output  

In the IMPACT editor, the bridge maps RegenPi **rules** onto HTML `span.pistart[data-pistart]` (not XML `<?pistart?>` strings).

## Doc map

| Doc | Audience |
|-----|----------|
| [README.md](./README.md) | Overview + file map (this file) |
| [skills.md](./skills.md) | Agent / change guidance |
| [DEV.md](./DEV.md) | Architecture, APIs, precedence |
| [RUN.md](./RUN.md) | Commands to run tests and local checks |
| [QA.md](./QA.md) | Automated + manual smoke |

Related byline docs: `src/js/dialogModules/docs/AuthorGroupNewModule/`, `…/AuthorEditDialog/`.

## File map

| File | Role |
|------|------|
| `src/js/regen_pi/regen-pi.js` | Canonical ESM engine (Vitest imports this); `stripPistart` + `stripHtmlPistart` |
| `src/js/regen_pi/resolveOneDoc.js` | Pick one doc from `meta.json` / `documents.json` |
| `scripts/regen_pi/strip-html-one-doc.mjs` | Node CLI: strip both `contrib_preview.html` and `original_html` |
| `src/js/dialogModules/regenPiLib.js` | UMD copy for gulp `dialogModules/*.js` → `RegenPiLib` global |
| `src/js/dialogModules/authorRegenPiBridge.js` | Resolve config + apply HTML pistart in `xTagValidation` |
| `tests/fixtures/regen_pi/old/` | Legacy tag-as-kind pi-config + contrib XML goldens |
| `tests/fixtures/regen_pi/new/` | Option B `<separator classname="…"/>` samples |
| `tests/fixtures/regen_pi/html/` | HTML strip + resolver stubs |
| `tests/unit/regen_pi/*.test.js` | CLI-parity, bridge DOM, HTML strip, wiring source tests |

## Config formats

1. **Old (legacy)** — tag-as-kind under `<separators>` (`<given-names …/>`, `<between-xrefs …/>`, …), matching Python `load_config`.  
2. **New (Option B)** — `<separator classname="…" value="…" pos="…"/>`. Blank classname is rejected.

Runtime default today: most journal splits have **no** `<pi-config>` → bridge builds rules from `AuthorGroupNewModule.M_SCOPE` separators. Pass `options.regenPi` (`xmlText` / `xmlDoc` / `clientConfig`) when a pi-config Document is available; **explicit pi-config wins** over M_SCOPE.

## Slots in scope

| Slot | HTML placement |
|------|----------------|
| `given-names` | Inner pistart inside `.given-names` |
| `between-xrefs` | After each `a.xref` except last (with PLOS / empty-corresp guards) |
| `between-contribs` | Appended on contrib (collab-aware `isLastBefore` / `isLastAuthor`) |

Out of scope for this phase: surname / affixes slots, batch HTML strip for every shortcode doc, porting Python compare HTML generator, adding `<pi-config>` to every live LWW split.

One-doc operators (Python XML + Node HTML) are documented in [RUN.md](./RUN.md).

## Upstream reference

Python / package source of truth (external package tree):

- `regen_compare_v1.py` → `load_config`, strip → regen  
- Package `js/regen-pi.js` + `__tests__/regen-pi.spec.js`
