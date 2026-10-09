# AuthorEditDialog — skills

Agent guidance for the Edit Author form (`AuthorGroupFourm.js`).

## When to use

- Form field population, preview, validation, or Update commit bugs
- ORCID / corresponding / xref chip behavior
- Coupling between dialog and `AuthorGroupNewModule` templates / renumber / TC

## Architecture reminder

```
Context menu "Edit Author"
  → AuthorGroupNewModule.fire(AG, OpenDialog)
  → AuthorEditDialog.show(curElm, { mode: 'edit' }) / showLoop
  → Event_Trigger (live preview on _AUTHOR)
  → Update_fire → replace live contrib + AG_N_TC + optional LinkRenumbering

Context menu "Add Author" with author/@add-edit="dialog"
  → AuthorEditDialog.show(curElm, { mode: 'insert' })
  → detached author template + Event_Trigger preview
  → Update_fire → insert after anchor + ADD tracking
```

Do not reimplement author DOM templates inside the dialog — reuse `_AG_.Get_Template` / `COPY_FN_Template`.

## Operations

### OPEN / LOAD

1. `showLoop` clones `.contrib`, `.contrib-group`, `.article-meta`.
2. Fill inputs from nodes/attrs; skip placeholder strings in `place_holder.all`.
3. Build aff/fn/corresp label spans; skip editor contribs.
4. Update disabled until dirty + valid.

### EDIT FIELD

1. Input events → `Event_Trigger`.
2. Mutate `_AUTHOR` only (preview), not live editor until Update.
3. Track dirty keys in `_TC_ORDER` for TC messages.

### XREF / LABELS

1. Focus xref (when author menus allowed + not single-aff) reveals `#row_4` chips briefly.
2. Chip click toggles `active`, rewrites xref input, re-triggers events.
3. Unknown label → `A_X_002` warn; chip toggled back.

### UPDATE

1. Fail closed if warning DOM still has entries.
2. Edit replaces `#${_AUTHOR.id}`; insert adds the detached `_AUTHOR` after `_INSERT_ANCHOR_ID`.
3. Edit uses `TC_ORDER_Handle`; insert uses the existing ADD `AG_N_TC` contract.
4. Insert stamps `_AUTHOR` with `author_dialog_01`, timestamp, username, and role immediately before insertion.

## Journal config used by dialog

- `affiliation/@single-aff` → `M_CONFIG.SINGLE_AFF` (also recomputed from aff count)
- Per-field author attrs (`prefix`, `suffix`, `degrees`, `string-name`, …) for showHide / readonly
- `author/@add-edit="dialog"` routes Add Author through insert mode; other values retain legacy Add
- Parent module’s `SHOW_CONTEXT_GROUP_AUTHOR` for xref UI and menu gate

## Change rules

- Prefer extending `_MULTIPLE_KEY_VAL` + warn codes over ad-hoc DOM in `Event_Trigger`.
- Keep ORCID normalization in `SPLIT_TXT_ORCID`.
- Do not open dialog for editor contribs (`IsEditor`).
- Do not apply `author_dialog_01` to edit-mode replacements or detached/cancelled insert drafts.
- Turning on `notallowed` alone does not fix pattern-specific PI / `xTagValidation` edge cases; validate those separately when enabling a journal.

## Related

- `README.md`, `qa.md` here
- `../AuthorGroupNewModule/skills.md` for menu gates
- `../../../regen_pi/skills.md` for PI regen after Update / `xTagValidation`
