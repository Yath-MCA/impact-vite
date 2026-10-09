# AuthorEditDialog (AuthorGroupFourm.js)

**Source:** `src/js/dialogModules/AuthorGroupFourm.js`  
**Dialog id:** `AuthorEditDialog`  
**Parent module:** `AuthorGroupNewModule` (referenced as `_AG_`)

## Purpose

Form-based author dialog with edit and insert modes. It stages field changes in Preview, then replaces an existing contributor or inserts a detached new contributor after validation.

## Lifecycle

| Hook | Role |
|------|------|
| `initLoop` | Wire IBOX selectors, optional field visibility, input events → `Event_Trigger`, warning map, `_MULTIPLE_KEY_VAL` field metadata |
| `showLoop` | Edit: clone the selected author. Insert: create a detached author from the shared template. Fill inputs, labels, Preview; when `XTAG_VALIDATION` is on, `runPreviewXTagValidation` regenerates PI on preview `_AUTHOR` |
| `Update_fire` | Edit: replace selected author. Insert: add staged author after its anchor. Then TC, renumbering, validation, snapshot, and close |

Edit opens with `show(curElm, { mode: 'edit' })`. Add opens with `show(curElm, { mode: 'insert' })` only when `author/@add-edit="dialog"`. That same `add-edit="dialog"` flag also enables byline CRUD (Move / Swap / Delete) via `AuthorGroupNewModule` even when `notallowed="yes"`; LinkRenumbering stays off.

## Core processing

### Field → DOM map (`_MULTIPLE_KEY_VAL`)

Each input id maps to: find selector/attribute, template name, append strategy, TC message, warn codes.

| Input | Target | Notes |
|-------|--------|--------|
| given-names / surname | `.given-names` / `.surname` | Mandatory; empty clears text but keeps node |
| prefix / suffix / degrees | matching spans | Optional; journal type-config can force readonly + warn |
| string-name | `.string-name` | Alternative name |
| orcid | `contrib-id` attribute | Normalized via `SPLIT_TXT_ORCID`; regex validate |
| correspond yes/no | `corresp` attr + xref | Links/unlinks corresp xref |
| xref | `.xref` list | Synced with label chips in `#row_4` |

### `Event_Trigger` (main edit loop)

1. Resolve target field metadata.
2. Compare old (clone) vs current (preview) vs new (input).
3. Mutate `_AUTHOR` clone (set text, add/remove xref fragments, attributes).
4. For xrefs: call `_AG_.OrderNewLink`; show unknown-label warn (`A_X_002`).
5. Run `_AG_.xTagValidation` on preview via `runPreviewXTagValidation` (resolves insert/edit index with `resolvePreviewXTagContext`).
6. `Validate_Inputs` → enable/disable Update; `SHOW_WARNING`.

When `XTAG_VALIDATION` is on, preview `_AUTHOR` runs `xTagValidation` via `runPreviewXTagValidation` on dialog open (`showLoop` after preview mount) and after field-driven preview updates. Insert uses `anchorIndex + 1` / `liveCount + 1`. Commit (`Update_fire`) still uses full-group validation.

(`Event_Trigger_New` exists as an alternate/newer path; production wiring in `initLoop` uses `Event_Trigger`.)

### `Validate_Inputs`

- Mandatory set: ORCID (empty OK or valid format), given-names, surname, xref.
- Single-aff articles: empty xref allowed.
- Update enabled only if valid **and** `_TC_ORDER` has at least one dirty field.

### `Update_fire`

1. Block if warning panel still has children.
2. Single-aff: ensure xref present (clone from group if needed).
3. Edit mode marks and replaces the live contributor. Insert mode stamps the detached contributor with `author_dialog_01`, timestamp, user, and role tracking metadata, then adds it after its anchor.
4. Edit uses `TC_ORDER_Handle`; insert records the existing author ADD tracking action through `_AG_.AG_N_TC`.
5. Journals: optional `_AG_.LinkRenumbering` if `Auto_ReNumber_AG_AFF`, then `xTagValidation` (journal PI path uses `AuthorRegenPiBridge` when available — [regen_pi](../../../regen_pi/README.md)).
6. Close dialog; `AutoSaveBool = true`.

The insertion tracking code is never applied to edit-mode replacements or abandoned insert drafts.

### `IsEditor`

Excludes editor contribs from edit path (same intent as context-menu exclusion in NewModule).

## Enable / disable (dialog visibility)

Dialog menu item requires **both**:

1. `AuthorGroupNewModule.M_CONFIG.SHOW_CONTEXT_GROUP_DIALOG` ← `IsContextMenu('AuthorEditDialog')`
2. `AuthorGroupNewModule.M_CONFIG.SHOW_CONTEXT_GROUP_AUTHOR` ← journal `author/@notallowed` ≠ `yes`

Inside the form, xref chip row also checks `SHOW_CONTEXT_GROUP_AUTHOR` and non-single-aff before expanding `#row_4`.

Optional fields use journal `GET_TYPE_CONFIG_QUERY('author', …)` (`prefix`, `suffix`, `degrees`, etc.): `no` → readonly unless already populated.

## Dependencies on AuthorGroupNewModule

Via `COPY_FN_Template` / `_AG_`:

- `Get_Template`, `template`, `tempName`
- `Update_Configuration`, `OrderNewLink`, `xTagValidation`
- `LinkRenumbering`, `AG_N_TC`, `getAuthorGroupView`, `setCursor`, `DOM_Auth`
- `Auto_ReNumber_AG_AFF`, `place_holder`, `M_CONFIG.SHOW_CONTEXT_GROUP_AUTHOR`

## Related docs

- This folder: `skills.md`, `qa.md`
- `../AuthorGroupNewModule/` for menus and structural ops
