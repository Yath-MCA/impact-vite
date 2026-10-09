# AuthorGroupNewModule — QA

## Regression

Run the focused AuthorGroup and tracking-code tests before manual smoke:

```powershell
npx vitest run tests/unit/author_group tests/unit/show_tracking/authorAffiliationTrackCodes.test.js
npm run test:unit -- tests/unit/regen_pi
```

PI / pistart regen after Edit Author Update: follow [regen_pi QA](../../../regen_pi/QA.md).

## Manual smoke — enable / disable

### A. Journal with `author notallowed="no"` (enabled control)

1. Open an article with multiple authors in `.contrib-group`.
2. Right-click inside author given-name / surname.
3. Expect: Add Author, Move Left/Right, Swap, Delete, Edit Author (when client `AuthorEditDialog` is also on, per role).
4. Edit Author → change surname → Update → expect DOM + TC entry; preview matched.

### B. Journal with `author notallowed="yes"` and **no** `add-edit="dialog"` (disabled)

1. Open an article for a journal whose split XML has `author … notallowed="yes"` without `add-edit="dialog"`.
2. Right-click author byline.
3. Expect: author CRUD + Edit Author **absent** (even if client `AuthorGroupModule` / `AuthorEditDialog` are true).

### B2. AHA dialog mode — `notallowed="yes"` + `add-edit="dialog"` (ATV / Phase 1)

1. Open an ATV (or CIR/HAE/…/SK9) article with **multiple** authors.
2. Right-click inside given-name / surname (non-editor contrib).
3. Expect: **Add Author**, **Move Before/After**, **Swap**, **Delete**, and **Edit Author** all present (Delete enabled when more than one author).
4. Run Swap / Move / Delete once each → DOM changes; no affiliation label renumber.
5. Add Author → insert dialog → Add → new `.contrib` after anchor.
6. Regression control: one LWW journal with `notallowed="no"` and no `add-edit` still has standard author CRUD.

### C. Affiliation gate independence

1. On a journal with author allowed but `affiliation notallowed="yes"`, confirm author menus show and aff menus stay hidden.
2. Inverse: author blocked, aff allowed — author menus stay hidden.

### D. Editor contrib exclusion

1. Cursor on `contrib-type="editor"` (or editor-only group).
2. Expect: author Edit / Add / Swap menus not offered.

### E. Structural actions (when author allowed)

| Action | Expect |
|--------|--------|
| Add Author | New `.contrib` after current; placeholders / separators per template |
| Swap | Given ↔ surname only |
| Move Left/Right | Order changes; first/last disable correctly |
| Delete | Confirm dialog; orphaned sole-use aff may remove; TC recorded |
| Link Aff (if aff allowed) | Selected label becomes xref with correct `rid` |

### F. Affiliation move/delete tracking

1. With affiliation `autoReNumber="false"`, move a middle affiliation above and below; confirm only its position changes and IDs, attributes, and author xrefs are preserved.
2. Confirm boundary move commands are disabled and direct boundary attempts create no TC row.
3. Confirm successful author/affiliation moves create `author_move_01` / `affiliation_move_01` TC entries.
4. Confirm accepted deletes create `author_delete_01` / `affiliation_delete_01` TC entries.
5. Cancel each delete confirmation; confirm DOM and TC list remain unchanged.
6. Confirm delete still physically removes content and does not introduce a mandatory `<del>` wrapper.

For `author add-edit="dialog"`, Add Author must stage the same template in `AuthorEditDialog` and insert only after the user chooses Add. Missing or different values must retain the legacy result above.

### G. Renumber behavior

1. When `Auto_ReNumber_AG_AFF` is false (author notallowed, or config), aff labels must not auto-shuffle after author delete.
2. When true and `autoReNumber` allows, labels/xrefs stay consistent after delete/link.

## Expected results checklist

- [ ] Client `IsContextMenu` and journal `notallowed` / `add-edit` behave as documented in README
- [ ] ATV (dialog mode): Add / Move / Swap / Delete / Edit Author all present; no aff renumber after CRUD
- [ ] Legacy `notallowed="yes"` without `add-edit="dialog"`: no author menus
- [ ] Edit Author only when both dialog + author flags are true
- [ ] No author menus on editor contribs
- [ ] Snapshot / autosave still runs after successful fire
- [ ] Move/delete Show Tracking rows appear only after successful operations
- [ ] Affiliation Move Above/Below preserves IDs, attributes, and xrefs
- [ ] No console `ErrorLogTrace` spam on happy path
