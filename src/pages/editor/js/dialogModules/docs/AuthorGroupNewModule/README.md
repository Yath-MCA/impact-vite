# AuthorGroupNewModule

**Source:** `src/js/dialogModules/AuthorGroupNewModule.js`  
**Applies to:** all clients that enable the author-group context functionalities  
**Related dialog:** `AuthorEditDialog` in `AuthorGroupFourm.js`

## Purpose

CKEditor author / affiliation byline operations: context menus, structural edits (add / move / swap / delete / link), PI/`x` tag repair, affiliation renumbering, and track-change messages. Opens the Edit Author form via `OpenDialog`.

## How it loads

1. `init()` runs when the editor needs author-group menus (or on first context-menu hit).
2. Hard stop if `IsContextMenu('AuthorGroupNewModule')` is false → all `SHOW_CONTEXT_*` flags forced off.
3. Otherwise loads journal type-config into `M_CONFIG` / `M_SCOPE` (separators, pattern, designators, degrees, single-aff).
4. Sets enable flags (see [Enable / disable](#enable--disable-gates)).
5. Builds templates from `GET_CONFIG_ITEM("author-group")`, registers CKEditor menu items / commands via `editor_Listener`.

## Core processing map

| Area | Entry | What it does |
|------|--------|----------------|
| Init / config | `init`, `Update_Configuration`, `template_Generator`, `label_Generator` | Journal config → `M_SCOPE` / `M_CONFIG` / Mustache templates |
| Context menu | CKEDITOR `menu` listener (~line 2200+) | Sets `FRONT_RETURN.*` menu states from `SHOW_CONTEXT_*` |
| Dispatch | `fire(ELEMENT_AREA, ACTION)` | Resolves selection → `AuthorGroup` / `AffiliationGroup` / `AuthorEditDialog.show` |
| Author CRUD | `AuthorGroup` | ADD, DELETE, SWAP, LEFT_MOVE, RIGHT_MOVE |
| Aff CRUD / link | `AffiliationGroup` | ADD, DELETE, DELETE_LINK, LINK, LEFT_MOVE, RIGHT_MOVE |
| Edit Author | `ACTION == "OpenDialog"` | Delegates to explicit dialog edit mode |
| Add Author dialog | `ACTION == ADD`, `author/@add-edit="dialog"` | Stages a detached author in dialog insert mode; otherwise uses legacy ADD |
| PI / separators | `xTagValidation`, `OrderNewLink` | Rebuild `x` / separator PI around name parts and xrefs (journal path prefers `AuthorRegenPiBridge` — see [regen_pi docs](../../../regen_pi/README.md)) |
| Renumber | `LinkRenumbering` | Re-assign aff (or fn) labels + update xrefs when `Auto_ReNumber_AG_AFF` |
| Track changes | `AG_N_TC`, `getAuthorGroupView`, `queryHandle` | Snapshot before/after + TC list entries; successful author/affiliation move and delete entries carry dedicated Show Tracking codes |
| Notes (limited) | `AuthorGroupCorresNotes` | Add corresp / author-notes when `Author_Notes` menu allowed |

### `fire` flow (simplified)

```
selection → contrib | aff
  ├─ AffiliationGroup → AG_N_TC → (optional) LinkRenumbering → xTagValidation
  └─ AuthorGroup
       ├─ OpenDialog → AuthorEditDialog edit mode
       ├─ ADD + add-edit="dialog" → AuthorEditDialog insert mode
       └─ legacy ADD|DELETE|SWAP|MOVE → AG_N_TC → (optional) LinkRenumbering → xTagValidation
```

## Context menu commands (AuthorGroup)

| Menu item | Command / action |
|-----------|------------------|
| Add Author | `AuthorGroup` + ADD |
| Move Author Left / Right | LEFT_MOVE / RIGHT_MOVE |
| Swap Given Name/Surname | SWAP |
| Delete Author with Links | DELETE |
| Edit Author | `OpenDialog` → form |

Affiliation menus (Add / Move / Delete / Link / Delete Link / Link Renumbering) use `AffiliationGroup` and are gated by `SHOW_CONTEXT_GROUP_AFF` (and designators / single-aff rules).

Affiliation Move Above/Below reorders the selected `.aff` relative to the adjacent affiliation and is exposed only when the existing context-menu rules allow it. Move/delete codes are written to the persistent `AG_N_TC` entry; physical deletion remains unchanged and does not require a track-manager `<del>` wrapper.

## Enable / disable gates

Set in `init()`:

| Flag | Source | Effect when false |
|------|--------|-------------------|
| `SHOW_CONTEXT_GROUP` | `IsContextMenu('AuthorGroupModule')` | No author/aff byline context menus |
| `SHOW_CONTEXT_GROUP_DIALOG` | `IsContextMenu('AuthorEditDialog')` | No **Edit Author** menu item |
| `SHOW_CONTEXT_GROUP_NOTES` | `IsContextMenu('Author_Notes')` | No author-notes context menus |
| `SHOW_CONTEXT_GROUP_AUTHOR` | `resolveAuthorEditModeConfig(add-edit, notallowed)` — `add-edit="dialog"` → **true** even if `notallowed="yes"`; else legacy `notallowed` | Blocks author menus **and** Edit Author (dialog also requires this) |
| `SHOW_CONTEXT_GROUP_AFF` | journal `affiliation/@notallowed` == `yes` → **false** | Blocks affiliation menus |

Additional rules:

- `author/@add-edit="dialog"` enables author CRUD (Add / Move / Swap / Delete) + Edit Author even when `notallowed="yes"`; LinkRenumbering stays off (`LINK_RENUMBER = false`).
- If `SHOW_CONTEXT_GROUP_AUTHOR` is false → `Auto_ReNumber_AG_AFF = false`.
- Editor contribs (`contrib-type="editor"` / heuristic) skip author menus.
- If client menus are on but a journal still has no author menus, check journal `author/@notallowed` / `add-edit` (and affiliation counterpart).

## Dependencies

- `AuthorEditDialog` (`AuthorGroupFourm.js`) for form edit path
- `GET_TYPE_CONFIG_QUERY` / `GET_CONFIG_ITEM` / `IsContextMenu`
- `GlobalEditor`, `IMPACT_SELECTION`, `IMPACT_ALERT`, `ALERT_MESSAGE`
- Mustache templates for author / xref / aff fragments
- `AuthorRegenPiBridge` / `RegenPiLib` for journal PI regen ([regen_pi README](../../../regen_pi/README.md), [QA](../../../regen_pi/QA.md))
