# AuthorGroupNewModule — skills

Agent guidance for author / affiliation byline work in IMPACT editors.

## When to use this skill

- Changing context-menu visibility or author CRUD behavior
- Debugging missing Add Author / Edit Author / Swap / Move menus
- Aff link, renumber, or `x`/PI separator issues after byline edits
- Wiring or gating `AuthorEditDialog`
- Regen-pi / `AuthorRegenPiBridge` separator PI behavior (see `src/js/regen_pi/skills.md`)

## Do not confuse

| Name | File | Role |
|------|------|------|
| `AuthorGroupNewModule` | `AuthorGroupNewModule.js` | Context menus + structural ops + renumber |
| `AuthorEditDialog` | `AuthorGroupFourm.js` | Form UI for field-level edit |
| `AuthorGroupModule` | client `config.xml` functionality name | `IsContextMenu` gate for byline menus |
| `AuthorGroupNewModule` | also a functionality name | Master gate in `init()` — if off, module exits early |

## Operations

### CONTEXT MENU SHOW

1. Ensure `IsContextMenu('AuthorGroupNewModule')` is true.
2. Ensure `IsContextMenu('AuthorGroupModule')` → `SHOW_CONTEXT_GROUP`.
3. Ensure journal `author/@notallowed` is not `yes` → `SHOW_CONTEXT_GROUP_AUTHOR`.
4. Cursor must be inside `.contrib-group` / author name area (not editor-only contrib).
5. For Edit Author also need `IsContextMenu('AuthorEditDialog')` and `SHOW_CONTEXT_GROUP_AUTHOR`.

### ADD AUTHOR

1. Menu → `fire('AuthorGroup', ADD)`.
2. `Get_Template('author')` inserted after current `.contrib`.
3. TC via `AG_N_TC`; usually skip full `LinkRenumbering` for ADD.

### MOVE / SWAP / DELETE

- Author MOVE: DOM reorder within `.contrib-group`.
- Affiliation MOVE: reorder the selected `.aff` against the adjacent affiliation; return false at first/last boundaries.
- SWAP: exchange `.given-names` and `.surname` HTML.
- DELETE: confirm via `IMPACT_ALERT`; may remove orphan affs via `CheckOrderAuthGroup`; then `queryHandle` + remove contrib.
- Successful author/affiliation move and delete actions stamp the persistent `AG_N_TC` list entry with the matching Show Tracking code, timestamp, username, and role.
- Keep delete wrappers optional: do not require `_trackManager.getDelNode` for these structural operations.

### OPEN EDIT AUTHOR

1. `fire('AuthorGroup', 'OpenDialog')`.
2. `AuthorEditDialog.show(curElm)` — no renumber until dialog Update.

### LINK AFF / RENUMBER

- Link: selection text as label(s) → build `xref_sup` against meta aff/fn/corresp.
- `LinkRenumbering`: only if `Auto_ReNumber_AG_AFF` (disabled when author `notallowed`).

## Config keys that matter

- `author/@notallowed`, `affiliation/@notallowed`
- `author/@pattern` (`aftercomma` → `M_SCOPE.IsAftercomma`)
- Separators: `seperator`, `givennamesep`, `surnameSep`, `contribsep`, `contrib-last-sep`, `crosslinksep`
- `affiliation/@designators`, `@single-aff`, `@autoReNumber`
- Field allow flags used by the dialog: `prefix`, `suffix`, `degrees`, `string-name`, etc.

## Change rules

- Prefer extending existing `M_CONFIG` / `SHOW_CONTEXT_*` gates over new parallel flags unless a feature design explicitly needs a new attribute.
- Keep editor-contrib exclusion intact.
- Journal enablement changes are usually config (`notallowed` / field yes-no); document JS gate changes in a feature spec if required.
- Always wrap new paths with try/catch + `ErrorLogTrace` where surrounding code does.

## Related docs

- `README.md`, `qa.md` in this folder
- `../AuthorEditDialog/` for form update path
- `../../../regen_pi/` — README, skills, DEV, RUN, QA for PI regen bridge
