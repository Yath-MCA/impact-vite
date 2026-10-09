# Author group dialog modules (all clients)

Shared documentation for the author / affiliation byline stack used across IMPACT clients (journals and books). Behavior is driven by **client** `IsContextMenu(…)` flags and **per-journal** type-config (`notallowed`, field yes/no, pattern, separators, designators).

| Module | Source | Docs |
|--------|--------|------|
| `AuthorGroupNewModule` | `../AuthorGroupNewModule.js` | [README](./AuthorGroupNewModule/README.md) · [skills](./AuthorGroupNewModule/skills.md) · [QA](./AuthorGroupNewModule/qa.md) |
| `AuthorEditDialog` | `../AuthorGroupFourm.js` | [README](./AuthorEditDialog/README.md) · [skills](./AuthorEditDialog/skills.md) · [QA](./AuthorEditDialog/qa.md) |

## Enable / disable (common)

```
IsContextMenu('AuthorGroupNewModule')  → module may init (else all SHOW_CONTEXT_* forced off)
IsContextMenu('AuthorGroupModule')     → SHOW_CONTEXT_GROUP
IsContextMenu('AuthorEditDialog')      → SHOW_CONTEXT_GROUP_DIALOG
IsContextMenu('Author_Notes')          → SHOW_CONTEXT_GROUP_NOTES
author/@notallowed == "yes"            → SHOW_CONTEXT_GROUP_AUTHOR = false (legacy, unless add-edit=dialog)
affiliation/@notallowed == "yes"       → SHOW_CONTEXT_GROUP_AFF = false

Edit Author menu   = SHOW_CONTEXT_GROUP_DIALOG && SHOW_CONTEXT_GROUP_AUTHOR
Author CRUD menus  = SHOW_CONTEXT_GROUP && SHOW_CONTEXT_GROUP_AUTHOR && !IsEditor
Affiliation menus  = SHOW_CONTEXT_GROUP && SHOW_CONTEXT_GROUP_AFF (plus designators / single-aff rules)
```

- `author/@add-edit="dialog"` enables author CRUD (Add / Move / Swap / Delete) + Edit Author even when `notallowed="yes"`; JS defaults: xtag on, LinkRenumbering off.

Client `config.xml` turns functionalities on/off by role. Journal split XML controls which journals allow author/aff editing and which form fields apply.

Feature tickets (e.g. enabling a journal set) belong in `docs/superpowers/specs/` — not in these module docs.
