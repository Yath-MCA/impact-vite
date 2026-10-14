# Edit Citation Text Module

Dialog to correct direct and indirect bibliographic citation **display text**, optionally change the linked reference, and retain formatting tags inside the xref.

**Agent runbook:** [skills.md](./skills.md)  
**Developer guide:** [DEV.md](./DEV.md)  
**QA checklist:** [QA.md](./QA.md)

---

## Files

| File | Role |
|------|------|
| `index.js` | `EditCitationTextModule` — open, apply text/rid update, retain formatting, track attrs |
| `context.js` | Registry (`editCitationTextDialog`), `editCiteText` command + menu; prefetches role JSON |
| `xref_role_config.json` | Per-role `enable` / selector / UI flags plus `linkedContentType`, `linkedFieldLabel`, `canonicalRole`, `dialogTitle`, `menuLabel` |
| `template.html` | Dialog markup (`#EditCitationTextDialog`) |
| `skills.md` | Agent/development runbook |
| `DEV.md` | Developer deep-dive |
| `QA.md` | QA test documentation |

---

## Purpose

Copyeditors often need Name & Date (and other) citation wording fixes without regenerating via Cross Citation. This module:

- Lets users type citation display text freely
- Opens for any xref role with `enable: true` in [`xref_role_config.json`](./xref_role_config.json) (bibr, floats, chapter/part/section, etc.)
- Fills the Linked field from role-aware content (`reference` / `title` / `caption`)
- Optionally changes linked `rid`/`href` via a truncated reference picker when `allowChangeRef` (bibr only today; keeps typed text; no regen)
- Wrap selection / sync-from-ref remain gated by `allowWrap` / `allowSyncFromRef` (bibr only today)
- Retains inner formatting (`span.font`, italic, bold, sup/sub) when present
- Stamps `data-track-code` (`direct` / `indirect` / `relink`)

| Menu item | Module | Purpose |
|-----------|--------|---------|
| Edit Citation | `Citation_Module` | Change linked refs → regenerates text |
| **Edit Citation Text** | this module | Correct wording and/or relink without regen |

---

## Module Registration

| Setting | Value |
|---------|-------|
| Registry ID | `editCitationTextDialog` |
| Class | `EditCitationTextModule` |
| Dialog ID | `#EditCitationTextDialog` |
| Webpack entry | `src/modules/edit_citation_text/index.js` (auto-discovered) |
| Load type | `lazy` |
| Context group | `citeGroup` |
| Command / menu | `editCiteText` |
| Config flag | `<functionality name="editCiteText" show="true" showForAU="false" showForCO="true" showForCE="true" showForPM="true" showForED="true" showForJM="true" showForPR="true" showForCoRole="true" />` under `citeGroup` |
| Role scope | [`xref_role_config.json`](./xref_role_config.json) — enabled: `bibr`, `boxed-text`, `appendix`, `equation`, `chapter`, `part`, `section`/`sec`, `fig`, `table`; `disp-formula` key is `enable: false` (exact key blocks open even though `equation.selector` lists that alias) |
| Supporting file | Loaded once via `supportingFiles` / `ContextHelpers`; `initLoop` consumes the window map |

### Role → Linked field

| `linkedContentType` | Roles | Linked field shows |
|---------------------|-------|--------------------|
| `reference` | `bibr` | `.mixed-citation` / ref text (year kept when truncated) |
| `title` | `chapter`, `part`, `section`/`sec`, `appendix` | Plain title (strip target / PageID / font noise) |
| `caption` | `fig`, `table`, `boxed-text`/`box-text`, `equation` | Caption title (not float label like `Box 1.1`) |

See [DEV.md](./DEV.md) for extractors (`getLinkedTargetInfo`, `getPlainLinkedText`) and the full role inventory.

---

## Architecture

```
Context menu (editCiteText) ← resolveRoleConfig
        │
        ▼
executeCommand → select a.xref → show('edit', target)
        │
        ▼
showBefore → resolveXrefNode + resolveRoleConfig
        │
        ▼
showLoop → roleConfig UI + Display Text (xref-only) + linked label
        │
        ├── Wrap / Update wrap → if allowWrap + feasible
        ├── Change → if allowChangeRef
        ├── Same-rid grid → if allowSameRidNav
        │
        ▼
handleApply → format-preserving text and/or rid (+ surround if selection was used)
        │
        ▼
_SNAPSHOT → closeDialog (rebind flags cleared)
```

---

## UI Layout

Dialog: `#EditCitationTextDialog`

| Control | ID | Behavior |
|---------|-----|----------|
| Display Text | `#cite_display_text` | Editable; prefilled with **xref-only** text; `'` → `’` |
| Wrap selection | `#cite_use_selection` | Enabled when wrap range exists and Display Text is not dirty; auto-selects surround and fills Display Text; becomes **Update wrap** when editor selection changes |
| Linked field | `#cite_linked_rid` | Read-only; role-aware (`reference` / `title` / `caption`); label from `linkedFieldLabel`; full text in `title` |
| Change | `#change_cite_ref` | Opens truncated ref picker |
| Same-rid cites | `#cite_same_rid_section` | Grid of other cites with this rid + Prev/Next; nav only when form is clean |
| Ref picker | `#cite_ref_picker` | Collapsible panel |
| Ref filter | `#cite_ref_filter` | Filters catalog by id/label |
| Ref list | `#cite_ref_list` | Truncated rows; full label in `title` |
| Cancel | `#cancel_cite_text` | Close, no change |
| Apply | `#apply_cite_text` | Enabled when text or rid dirty |

---

## Tracking

| Code | Message | When |
|------|---------|------|
| `cite-text-01` | Citation text edited (legacy) | Fallback |
| `cite-text-direct-01` | Direct citation text edited | Direct text change (with or without rid) |
| `cite-text-indirect-01` | Indirect citation text edited | Indirect text change (with or without rid) |
| `cite-text-relink-01` | Citation linked reference changed | Rid-only change |
| `cite-text-sync-01` | Citation text synced from reference | Auto-update after Edit Reference Text surname/year |

Source: [`ShowTracking_support_data.json`](../../js/dialogModules/ShowTracking_support_data.json)

---

## Build

- `context.js` is bundled via gulp `src/modules/**/context.js`
- Template path registered from `templatePath` in module config
- Rebuild assets after changes so menu + dialog HTML load
