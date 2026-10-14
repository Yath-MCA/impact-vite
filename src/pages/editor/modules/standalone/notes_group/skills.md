---
title: NOTES - CRUD OPERATION WITH DIALOG
description: Use this skill for Insert, delete, and check notes in journals and books.
---
# Instructions
- Don't change case "endNotes", "endnotes" and "footnotes"

# Operations

## 1. INSERT (FIRE_INSERT)
Insert a new footnote or endnote into the document.

**Flow:**
1. Get content from summernote editor (min 3 chars)
2. Determine note type: `footnotes` or `endnotes`/`endNotes`
3. Get or create fn-group via `resolveNoteContext()`
4. Generate unique ID (`fn0001`, `en0001` for journals; `{baseId}-fn-{n}` for books)
5. Insert citation (`<a class="xref" rid="{id}">`) at cursor
6. Insert note entry (`<div class="fn" id="{id}">`) in fn-group
7. Renumber if fn-group already exists
8. Finalize with snapshot

**Key Methods:**
- `resolveNoteContext({ mode: 'insert', ... })` - unified entry point
- `_findFnGroup()` - locate or create fn-group
- `generateId()` - ID generation with journal/book rules
- `insertCitation()` - insert xref at cursor
- `insertNoteEntry()` - append note to group
- `fireRenumber()` - trigger renumbering

## 2. DELETE (FIRE_DELETE)
Delete a note and its citation by NODE_ID.

**Flow:**
1. Resolve context via `resolveNoteContext({ mode: 'delete', ... })`
2. Find note by `id="{NODE_ID}"` and citation by `rid="{NODE_ID}"`
3. Remove from both TEXT_GROUP (editor body) and NOTE_GROUP (fn-group)
4. Handle deletion tracking (same-user remove vs mark-for-deletion)
5. Renumber remaining notes if any
6. Remove empty fn-group (journal only)

**Key Methods:**
- `resolveNoteContext({ mode: 'delete', ... })` - unified entry point
- `_resolveBookRoots()` - book chapter/section scoping
- `deleteAll({ TEXT_GROUP, NODE_ID, NOTE_GROUP })` - remove refs
- `handleNodeDeletion()` - same-user vs collab deletion
- `markForDeletion()` - track deletions for collab

## 3. RENUMBER (fireRenumber)
Recalculate sequential numbering after insert/delete.

**Flow:**
1. Check collaboration locks
2. Call `CheckOrder.fireOnce()` with:
   - `cite_root`: where xrefs live (editor body or chapter)
   - `items_root`: where .fn entries live (fn-group)
   - `delId`: deleted item ID (skip if null)
3. `CheckOrder` scans both roots, builds xref↔item mapping
4. Reassign sequential labels (1, 2, 3...)
5. Update citation text and rid references

**Key Methods:**
- `_resolveRenumberScopes()` - determine cite_root/items_root
- `CheckOrder.fireOnce(editor, options, addParams)` - core renumber

## 4. CHECK (FIRE_CHECK) - NEW
Verify all citations are properly ordered without modifying. Uses CheckOrder with `checkOnly` mode.

**Flow:**
1. Configure CheckOrder for note type (extends `valid_role` with 'en' for endnotes)
2. Resolve `cite_root` and `items_root` based on scope
3. Call `CheckOrder.fireOnce()` with `checkOnly: true`
4. Build validation report with:
   - Orphaned citations (xref without matching item)
   - Orphaned items (item without matching xref)
   - Sequence gaps (non-sequential labels)
   - Label mismatches (cite text ≠ item label)
5. Restore original CheckOrder config (cleanup)
6. Return results without modifying document

**Key Methods:**
- `FIRE_CHECK({ scope, nType })` - verification entry point
- `_resolveRenumberScopesForType(nType, scope)` - scope resolution
- Returns: `{ valid: true/false, errors: Array, stats: Object }`

**Known Limitations:**
- **Journals**: CheckOrder scans entire document regardless of `items_root`. Documents with both footnotes AND endnotes may show cross-type contamination in results. For accurate single-type checks on mixed documents, check one type at a time and interpret results carefully.
- **Books**: Properly scoped by chapter, works correctly for all note types.

**Use Case:**
- Run before insert/delete to detect pre-existing issues
- Run standalone to verify document integrity
- CI/CD validation without side effects
- Best for: Books (chapter-scoped) or journals with single note type

# Parameter Naming Rules

| Parameter | Meaning | Example |
|-----------|---------|---------|
| `TEXT_GROUP` | Editor body or chapter root where citations live | `GlobalEditor.document.$.body` |
| `NOTE_GROUP` | fn-group container where note entries live | `div.fn-group[content-type="footnotes"]` |
| `findRoot` | Alias for TEXT_GROUP in some contexts | Same as TEXT_GROUP |
| `cite_root` | CKEditor root for scanning xrefs (CheckOrder) | CKEditor document |
| `items_root` | CKEditor root for scanning .fn items (CheckOrder) | fn-group as CK element |

# Case Sensitivity
- Preserve exact case: `"endNotes"`, `"endnotes"`, `"footnotes"`
- Use `_normalizeContentType()` to canonicalize for comparison

# Client Variants
| Client | ID Pattern | Notes |
|--------|-----------|-------|
| Journal | `fn0001`, `en0001` | 4-digit padding |
| OHO/OSO/OXMEDO | `{baseId}-fn-{n}` | Chapter-based; oasis `chapter-end` selectors |
| TNF / LSE | `{baseId}-fn{n}` (TNF) | BITS `chapter-end`: `.book-body .book-part[book-part-type="chapter"] .back .fn-group` |

# Placement (books)
Identification is document-driven in `showLoopSetUp()` — not `config.xml`:
1. Default `followedBy = chapter-end`
   - Oasis (OHO/OSO/OXMEDO): `div.book-body|book-part div.fn-group[content-type=…]`
   - BITS (TNF|LSE): document `.book-body .book-part[book-part-type="chapter"] .back .fn-group`; within chapter `.back .fn-group`
2. If `findOne(book-end)` hits → `book-end` (type ≠ `endNotes`) or `chapter-split-book-end` (type == `endNotes`)
3. `book-end` / split CSS paths are shared across oasis and BITS clients

# File Locations
- Main module: `src/modules/standalone/notes_group/index.js`
- Context menu: `src/modules/standalone/notes_group/context.js`
- Templates: `src/modules/standalone/notes_group/template.html`
- Config: `src/clientconfig/*/config.xml` → `<functiongroup name="notesGroup">`

# Unique Tracking ID

Each note insertion generates a persistent `data-note-uid` attribute on both:
- The citation xref (`<a class="xref" data-note-uid="...">`)
- The note entry (`<div class="fn" data-note-uid="...">`)

This ID remains constant during renumbering operations and helps with:
- Debugging renumbering issues
- Tracing citation-to-note relationships
- QA verification of note integrity

**ID Format:** `note-${timestamp}-${random}` (e.g., `note-1751095200000-a1b2`)

**Implementation:** Generated in `FIRE_INSERT()` and passed to `insertCitation()` and `insertNoteEntry()`.

# Tracking Codes (Show Tracking)

The module sets `data-track-code` attributes for Show Tracking panel integration:

| Code       | Trigger                              | Message                      |
| ---------- | ------------------------------------ | -----------------------------|
| `notes-01` | Insert footnote                      | New footnote inserted        |
| `notes-02` | Insert endnote                       | New endnote inserted         |
| `notes-03` | Delete note with citation            | Note with citation deleted   |
| `notes-04` | Delete footnote citation (cite only) | Footnote citation deleted    |
| `notes-05` | Delete endnote citation (cite only)  | Endnote citation deleted     |

**Implementation:** `getTrackingCode()` helper in `index.js` returns codes based on action type, nType (footnote/endnote), and delete context (isCiteDelete/isNoteDelete).

# QA Testing Reference

For comprehensive QA documentation including content type support matrix and client-specific renumber behavior, see:

**`docs/qa/notes_group_release.md`**

### Content Types Supported

| Content Type | Status |
|--------------|--------|
| Book-end (sec-group) | Ready for Testing |
| Book-end (fn-group) | Ready for Testing |
| Chapter-end | Unit Test in Progress |

### Client Renumber Behavior

| Client | Behavior |
|--------|----------|
| OSO | Label-only renumber (IDs/RIDs static) |
| OHO, OXMEDO, TNF, LSE, Journals | Full renumber (IDs, RIDs, Labels) |

Refer to the full QA documentation for detailed test scenarios, configuration examples, and file locations.
