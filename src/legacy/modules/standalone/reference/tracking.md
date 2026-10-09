# Reference insert / del tracking

Decisions and writers live in the `ReferenceTrack` class in [`track.js`](./track.js). The original and revised HTML for each case is in the comment at the top of that class. `ref_bridge` loads the default export with `await import()` inside `_importDependencies`, then calls `ReferenceTrack.create()`, and for edit/query calls `track.applyUpdate(...)`.

**13 cases are handled today.**

| # | Case | Result |
|---|------|--------|
| 1 | Empty original, plain input filled | `insert` only |
| 2 | Empty original, rich or Summernote filled | `insert` only |
| 3 | Plain input already had text and the value changed | `insert` plus `del` |
| 4 | Rich or Summernote already had HTML and the value changed | `insert` plus `del` |
| 5 | Existing plain, rich, or Summernote field is cleared (had a real original, now empty) | `del` only |
| 6 | Plain, rich, or Summernote text is unchanged | none |
| 7 | Leaf already shows the same `insert` and `del` | none |
| 8 | `etal` checkbox goes from unchecked to checked, and the source had no author `.etal` | `insert` |
| 9 | `etal` checkbox is unchecked, and the source had author `.etal` | `del` only |
| 10 | `etal` checkbox is left as it was (already checked, or never present) | none |
| 11 | Author count is at least CEG `trim[name=author]` `count` | authors past `after` are `del` only |
| 12 | That same style trim writes its `insert` text | plain `et al` text, no `insert` track |
| 13 | New reference insert | whole new reference wrapped in `insert[data-track-code="ref-01"]` |

## Rules that keep those cases apart

- Compare kinds are `input`, `rich`, and `summernote`. Plain text uses collapsed space. Rich and Summernote compare innerHTML, not visible text.
- `etal` does not use the field-text helper. The checkbox owns insert and uncheck del.
- Style-trim `count`, `after`, and `insert` come from `getContributorTrim(refType, 'author')`. They are not hardcoded 7 / 3 / `et al`.
- Style-trim `et al` is not the checkbox. `trackEtalInsert` is always false.
- Trim applies only when `count` is a number greater than 0 and less than 99, and the author list is at least that long. A shorter list keeps every author and writes no trim `et al`.
- Editor and translator groups are not style-trimmed by this helper.

## Ownership (bridge vs track.js)

- Insert mode: `ref_bridge` wraps the new reference in `insert[data-track-code="ref-01"]` and may create insert/del nodes directly.
- Edit/query mode: `ref_bridge` emits the plain rebuilt citation and then `ReferenceTrack.applyUpdate(...)` writes the required `<insert>` / `<del>` for every leaf based on the 13 cases (including case 7 preserve and case 11 author trim).
- DOI, URL/URI, `pub-id`, and PMID source-leaf lookup uses `findReferenceLinkLeaf()` from the shared adapter. Tracking does not maintain its own semantic selectors; configured link slots remain live, while genuinely unconfigured values follow the existing terminal orphan `<del>` policy.
