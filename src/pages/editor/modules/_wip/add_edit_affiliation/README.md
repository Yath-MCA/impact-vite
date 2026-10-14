# Add/Edit Affiliation Module

Standalone, structure-preserving affiliation dialog with explicit edit and insert modes. Both modes discover editable content from the DOM at runtime and render normal affiliation HTML in Preview.

**Agent runbook:** [skills.md](./skills.md)  
**Developer guide:** [DEV.md](./DEV.md)  
**QA checklist:** [QA.md](./QA.md)

## Scope

- Opens from an existing `<div class="aff" data-name="aff">`.
- Edits text-bearing nodes in source order.
- Supports unknown and client-specific child element names.
- Does not use a static list such as `institution`, `country`, or `addr-line`.
- Edit mode hides `#aff_add_section` and updates only the selected `.aff`.
- Insert mode shows `#aff_add_section`, accepts exactly one pasted `.aff`, sanitizes it, assigns the next `AF` ID, and inserts it after the selected anchor on Add.
- Does not change contributor affiliation xrefs.
- Preserves the affiliation wrapper, attributes, element order, nested formatting, PI nodes, and query/comment nodes.
- Successful insert mode stamps the inserted clone with `affiliation_dialog_01`, timestamp, user, and role Show Tracking metadata; staged and cancelled content remains untracked.

No Mantis ticket number or title was supplied for this feature.

## Files

| File | Role |
|------|------|
| `index.js` | `AddEditAffiliationModule`; staged edit, preview, Apply/Revert, Update/Cancel |
| `affiliation-dom.js` | Generic DOM discovery and path-based text mutation |
| `context.js` | Lazy registration and `addEditAffiliation` context-menu command |
| `template.html` | Dialog shell for Edit Field, Preview, and footer actions |
| `messages.json` | Localized dialog labels |
| `styles.scss` | Dialog, paste validation, Preview, and active-range styling |
| `README.md` / `DEV.md` / `QA.md` / `skills.md` | Module documentation |

## Registration

| Setting | Value |
|---------|-------|
| Registry ID | `addEditAffiliationDialog` |
| Class | `AddEditAffiliationModule` |
| Dialog ID | `#AddEditAffiliationDialog` |
| Group | `AuthorGroupModule` |
| Command | `addEditAffiliation` |
| Action | `add_edit_affiliation` |
| Message global | `ADD_EDIT_AFFILIATION_MESSAGES` |

The context-menu item is available only when the selected or ancestor affiliation:

- is not marked `data-remove` or `data-delete`;
- is not rejected by `paraLock`; and
- contains at least one runtime-discovered editable field.

## Interaction

1. Right-click an editable affiliation and choose **Edit Affiliation**.
2. **Edit Affiliation** opens in edit mode with the add section hidden. **Add Affiliation** opens in insert mode with the selected `.aff` as its insertion anchor.
3. Select a text range in the HTML Preview.
4. Change the value in Edit Field.
5. Choose field **Apply** to stage the value in Preview, or **Revert** to restore the original value.
6. Choose footer **Update** to write edit-mode changes, or **Add** to insert the staged affiliation after the anchor and save a snapshot.
7. Choose **Cancel** or close the dialog to discard staged changes.

Typing does not mutate the editor DOM. Field Apply updates the staged clone only. Footer Update is the only action that writes to the source affiliation.

## Dynamic Field Contract

`discoverAffiliationFields(affElement)` walks child nodes in document order. An editable field is represented by:

```javascript
{
    path: [1, 0, 2],
    label: 'Department Unit',
    value: 'Cardiology',
    nodeKind: 'text'
}
```

The `path` is a child-index path relative to the affiliation root. It makes repeated and unknown elements addressable without class or tag selectors.

Labels are derived in this order:

1. `data-name`
2. first non-`aff` class
3. tag name
4. `Free Text` for text nodes that are direct children of `.aff`

Preview is rendered from cloned affiliation HTML. Editable values use focusable `.aff-preview-seg` spans for click and keyboard selection; they are not rendered as buttons.

## Pasted Affiliation Contract

- The paste must contain exactly one root `.aff` element.
- Plain text, unrelated roots, and multiple roots are rejected inline.
- Executable elements, `on*` attributes, and JavaScript URL attributes are removed.
- A pasted `id` is ignored. The next available `AF` number is generated using the document's numeric width.
- Only one new affiliation can be staged per dialog session.

## Protected Content

Discovery skips these subtrees:

- `contenteditable="false"`
- `[data-pi]`
- `[data-remove]` and `[data-delete]`
- query/comment wrappers identified by `data-class`, `data-name`, or `data-role`
- HTML void elements

Nested editable text is updated at its text node, so surrounding elements and attributes remain intact.

## Verification

```powershell
npx vitest run tests/unit/add_edit_affiliation
npx jshint src/modules/standalone/add_edit_affiliation/affiliation-dom.js src/modules/standalone/add_edit_affiliation/context.js src/modules/standalone/add_edit_affiliation/index.js
npx gulp local
```

See [QA.md](./QA.md) for regression and manual smoke coverage.

