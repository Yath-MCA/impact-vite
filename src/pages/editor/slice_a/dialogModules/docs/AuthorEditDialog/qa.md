# AuthorEditDialog — QA

## Manual smoke — form path

Use a journal where Edit Author is already enabled (`author notallowed="no"` and client `AuthorEditDialog` on) as the golden path. Retest any newly enabled journals the same way.

### 1. Open + populate

1. Right-click author → Edit Author.
2. Expect given-name, surname, ORCID, corresponding, xref filled from DOM.
3. Preview shows a clone of the contrib.
4. When `XTAG_VALIDATION` is on: preview already has journal PI (`span.pistart`) on open (before typing).
5. Update disabled until a change is made.

### 1b. Preview PI (insert + edit)

1. **Insert** (`add-edit="dialog"`): open Add Author → preview shows expected PI before typing; after typing names, PI stays coherent (no live DOM change).
2. **Edit**: open Edit Author → preview has PI; change surname → preview regenerates; live byline unchanged until Update.
3. **Commit**: Update/Add → live PI correct; no duplicate PI.
4. **Control**: journal/mode with `XTAG_VALIDATION` off → no forced preview PI.

### 2. Name fields

1. Change given-name and surname → preview updates; Update enables.
2. Clear given-name → warn + Update disabled (mandatory).
3. Optional prefix/suffix/degrees: if journal config `no` and empty → readonly; typing area may show style-guide warn (`A_DT_001`).

### 3. ORCID

1. Enter invalid length/format → warn `A_O_001` / `A_O_002`; Update blocked.
2. Enter `XXXX-XXXX-XXXX-XXXX` → accepted; stored with `https://orcid.org/` prefix on commit.
3. Clear ORCID → TC “removed” style message on update.

### 4. Corresponding

1. Yes → corresp xref appears on preview (when corresp node exists in meta).
2. No → corresp xref removed; highlight cleared.

### 5. Xref / aff chips

1. Multi-aff article: focus xref → label chips; toggle links; preview xrefs reorder via `OrderNewLink`.
2. Unknown label → warning; chip not left active incorrectly.
3. Single-aff: empty xref allowed; Update can proceed without aff labels.

### 6. Commit

1. Update → dialog closes; live byline matches preview; TC list has per-field messages.
2. If `Auto_ReNumber_AG_AFF`, aff labels/xrefs remain consistent.
3. Autosave flag set; cursor restored.
4. PI / pistart on the updated contrib match journal seps (no duplicates) — [regen_pi QA](../../../regen_pi/QA.md) R01–R03.

### 7. Cancel

1. Cancel / close → no live DOM change; no TC for abandoned edits.

### 8. Gate check (enable/disable)

1. With `SHOW_CONTEXT_GROUP_AUTHOR` false: Edit Author menu absent; if dialog somehow opened, xref chip expansion should not treat author editing as fully allowed.
2. With dialog functionality off but author menus on: structural menus may show; Edit Author must not.

### 9. Insert mode

1. With `author add-edit="dialog"`, choose Add Author and confirm the dialog title/action are **Add Author** / **Add**.
2. Enter mandatory names, optional degrees/ORCID, and affiliation links; confirm only Preview changes before Add.
3. Choose Add and confirm exactly one contributor is inserted after the anchor with TC, validation, snapshot, cursor, and autosave behavior.
4. Confirm the inserted contributor has `data-track-code="author_dialog_01"`, `data-time`, `data-username`, and `data-rolename`.
5. Cancel or close and confirm no contributor or tracking attributes are inserted.
6. With the key missing or set to another value, confirm Add Author uses the legacy immediate insertion path.

### 10. Preview xTagValidation (insert + edit)

Requires `M_CONFIG.XTAG_VALIDATION` (e.g. AHA `add-edit="dialog"` journals such as ATV).

1. **Insert:** Add Author → before typing, preview shows expected `span.pistart` (given-name / between-contrib rules). Type names → PI stays coherent on preview only.
2. **Edit:** Edit Author → preview has PI on open; change surname → preview regenerates; live byline unchanged until Update.
3. **Commit:** Add/Update → live PI correct; no duplicated pistart.
4. **Control:** journal/mode with `XTAG_VALIDATION` off → no forced preview PI from dialog open.

## Expected results checklist

- [ ] Preview-only mutations until Update
- [ ] Preview PI on insert/edit open when XTAG_VALIDATION on; no live DOM PI until commit
- [ ] Mandatory + ORCID validation blocks Update
- [ ] TC messages match dirty fields
- [ ] Editor contribs cannot open Edit Author from menu
- [ ] No leftover AuthDOM / snapshot lock after close
- [ ] Insert mode never changes editor DOM before Add
- [ ] Edit mode never reports an existing author as a newly inserted author

## Docs review

- [ ] README field map matches `_MULTIPLE_KEY_VAL`
- [ ] skills.md open → edit → update flow matches code
