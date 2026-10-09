# Add/Edit Affiliation - QA Test Documentation

Module: `src/modules/standalone/add_edit_affiliation/`  
Menu: **Edit Affiliation** (`addEditAffiliation`)  
Mantis: Not supplied

## Automated Regression

Run focused tests:

```powershell
npx vitest run tests/unit/add_edit_affiliation
```

Expected: focused affiliation tests pass; record the current test count from Vitest.

Run focused lint:

```powershell
npx jshint src/modules/standalone/add_edit_affiliation/affiliation-dom.js src/modules/standalone/add_edit_affiliation/context.js src/modules/standalone/add_edit_affiliation/index.js
```

Expected: exit code 0 with no findings.

Run the local production pipeline:

```powershell
npx gulp local
```

Expected:

- build exits successfully;
- `dist/assets/{version}/modules/add_edit_affiliation/` contains source and minified JavaScript, `messages.json`, and `template.html`;
- `templates.html` contains `data-template-path="./add_edit_affiliation/template.html"`; and
- generated `global_context_editor.js` contains no `import`/`export` syntax from this context file.
- compiled global CSS contains `#AddEditAffiliationDialog` and `.aff-preview-seg` selectors.

Run the repository unit suite for regression awareness:

```powershell
npm run test:unit
```

At implementation time, the repository baseline was already red outside this module: 43 test files failed with 119 failed tests, including missing legacy reference files and unrelated para-lock, link-session, reference-bridge, environment, hyperlink, and Vite integration failures. Record the current result rather than treating those failures as affiliation-module failures.

## Preconditions

- Build and deploy the current assets.
- Enable the `addEditAffiliation` command for the test role/client configuration.
- Load a document containing at least one `.aff` with multiple child structures.
- Include examples with PI nodes, query/comment wrappers, nested formatting, direct text, empty unknown elements, and removed/deleted affiliations.

## Context Menu

| ID | Steps | Expected |
|----|-------|----------|
| C01 | Right-click an editable `.aff` | **Edit Affiliation** appears |
| C02 | Right-click a child inside an editable `.aff` | Command appears and resolves the containing `.aff` |
| C03 | Right-click outside an `.aff` | Command does not appear |
| C04 | Right-click `.aff[data-remove]` | Command does not appear |
| C05 | Right-click `.aff[data-delete]` | Command does not appear |
| C06 | Right-click a protected-only/empty affiliation | Command does not appear |
| C07 | Right-click a locked affiliation | Lock handling runs; command does not appear |

## Runtime Discovery

| ID | Steps | Expected |
|----|-------|----------|
| D01 | Open an affiliation containing `institution`, `country`, and `addr-line` | Text fields appear in source order |
| D02 | Open an affiliation containing unknown/custom element names | Custom values appear without code/config changes |
| D03 | Open an affiliation with direct text between child elements | Direct text appears as editable Preview segments in source order |
| D04 | Open repeated sibling elements with the same class/data-name | Every occurrence is independently editable |
| D05 | Open an empty unknown non-void leaf | Placeholder segment appears and accepts a new value |
| D06 | Inspect field labels | Nested labels derive from `data-name`, class, or tag name; direct `.aff` text is labeled **Free Text** |

## Edit Lifecycle

| ID | Steps | Expected |
|----|-------|----------|
| E01 | Open dialog | Edit Field is idle; Preview shows discovered values; Update disabled |
| E02 | Click a Preview segment | Edit Field opens with the correct label and value |
| E03 | Type without field Apply | Preview and source `.aff` remain unchanged |
| E04 | Choose field Apply | Preview updates; Edit Field closes; source `.aff` remains unchanged |
| E05 | Reopen the changed field and choose Revert | Preview returns to original value; Update disables if no other changes remain |
| E06 | Apply a field and choose footer Update | Source field updates; dialog closes; save/unlock snapshot runs |
| E07 | Apply a field and choose Cancel | Source affiliation remains byte-for-byte unchanged |
| E08 | Leave a field editor open and choose Update | No source write occurs |
| E09 | Remove the source affiliation while dialog is open, then Update | Update fails closed; no unrelated DOM changes occur |
| E10 | Focus a Preview range and press Enter or Space | The correct Edit Field opens and only that range is highlighted |
| E11 | Inspect Preview ranges | Affiliation HTML and punctuation render normally; ranges are spans, not buttons |

## Add Another Affiliation

The section must be hidden when opened from **Edit Affiliation** and visible only when opened from **Add Affiliation**.

| ID | Steps | Expected |
|----|-------|----------|
| A01 | Paste one valid `.aff` and choose **Add to Preview** | Sanitized affiliation appears as a second HTML Preview entry; Update enables |
| A02 | Paste plain text, unrelated HTML, or two `.aff` roots | Inline validation appears; no sibling is staged |
| A03 | Paste script elements, event attributes, or JavaScript URLs | Executable content is removed from staged HTML |
| A04 | Paste an `.aff` with an existing ID | Preview receives the next available document `AF` ID |
| A05 | Stage a valid sibling and choose Update | New affiliation is inserted immediately after the selected `.aff` |
| A06 | Stage a sibling and choose Clear or Cancel | No new affiliation is inserted |
| A07 | Inspect contributor xrefs after insertion | Existing xrefs and `rid` values are unchanged |
| A08 | Open Add, stage HTML, cancel, then reopen Edit | No sibling is inserted; paste/error state is cleared and the add section is hidden |
| A09 | Add a valid staged affiliation | Inserted `.aff` has `affiliation_dialog_01`, timestamp, username, and role tracking attributes |
| A10 | Inspect the staged Preview, then cancel | Neither staged content nor editor DOM receives insertion tracking attributes |

## Structure Preservation

| ID | Steps | Expected |
|----|-------|----------|
| S01 | Edit text inside `<em data-format="keep">` | `<em>` and its attributes remain; only its text changes |
| S02 | Edit an affiliation containing `[data-pi]` | PI node content and attributes remain unchanged |
| S03 | Edit an affiliation containing `contenteditable="false"` | Protected subtree is not offered and remains unchanged |
| S04 | Edit an affiliation containing a query/comment wrapper | Query/comment content is not offered and remains unchanged |
| S05 | Update one affiliation referenced by author xrefs | Contributor `a.xref[ref-type="aff"]` elements and `rid` values remain unchanged |
| S06 | Update one of several affiliations | Only the selected affiliation changes |
| S07 | Edit meaningful text surrounded by whitespace | Existing leading/trailing whitespace remains around the new value |

## Localization and Remount

| ID | Steps | Expected |
|----|-------|----------|
| L01 | Open dialog | Labels are populated from `ADD_EDIT_AFFILIATION_MESSAGES` |
| L02 | Close and reopen on another affiliation | Event handlers work once; no duplicate Apply/Update behavior |
| L03 | Inspect footer | Buttons read **Cancel** and **Update** |

## Sign-off

- [ ] Focused tests pass
- [ ] Focused JSHint passes
- [ ] Local build passes and assets are emitted
- [ ] C01-C07
- [ ] D01-D06
- [ ] E01-E09
- [ ] S01-S07
- [ ] L01-L03
- [ ] Existing reference and contributor editing workflows smoke-tested

