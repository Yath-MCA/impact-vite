# Edit Reference Text — QA Test Documentation

Module: `src/modules/edit_reference_text/`  
Menu: **Edit Reference Text** (`editRefText`)

---

## Preconditions

- Rebuild assets (template + context + styles)
- Refs with authors: 1, 2, 3+, and with et al.; optional editors
- `editRefText` enabled

---

## 1. Layout / collapse / gated preview

| ID | Steps | Expected |
|----|-------|----------|
| T01 | Open dialog | Edit Field → Preview → tabs (**Citation Preview** active \| Suggestion on UAT/local only); idle hint visible; editor collapse hidden; field Apply/Revert disabled |
| T01b | Click **Suggestion** tab (UAT/local) | Suggestion pane shows; Citation pane hidden |
| T01b-live | Open on live (not UAT/local) | **Suggestion** tab hidden; Citation Preview only |
| T01c | Click **Citation Preview** tab | Citation pane shows again; tab label may include `(n)` count |
| T02 | Click Preview segment | Collapse expands; input shown; idle hint hidden |
| T02k | Focus Preview segment; Enter or Space | Same as T02 |
| T03 | Type in Edit Field | Preview text **unchanged** |
| T04 | Field **Apply** | Preview updates; editor collapses to idle hint; footer Apply enabled if dirty |
| T05 | Edit again; field **Revert** | Preview back to original; collapse idle |
| T06 | Ctrl/Cmd+Enter | Same as field Apply |
| T07 | Open a field; click footer **Apply** | Warning toaster; no DOM write |
| T08 | Field Apply then footer Apply | DOM updated; insert stamped `ref-text-01` |
| T09 | Open source / article-title / chapter-title | Textarea has **5** rows (titles may use Summernote) |
| T09b | Open surname / given-names containing visible `<insert>` / `<del>` history | Edit Field uses contenteditable and shows retained visible inner HTML, not concatenated deleted text |
| T09c | Open collab / publisher-loc / publisher-name / comment containing inline markup | Edit Field uses contenteditable and retains sanitized inner HTML |
| T09d | Open year / volume / issue / fpage / lpage containing accidental inline markup | Field remains plain text; number-style fields do not initialize contenteditable or Summernote |
| T10 | Dirty Edit Field; click another Preview segment | `AlertNewDialog`: Update / Stay / Revert |
| T11 | Choose **Update** | Current field applied to preview; clicked field opens |
| T12 | Choose **Revert** | Current field reverted; clicked field opens |
| T13 | Choose **Stay** | Current Edit Field kept; no switch |

---

## 2. Suggestion / Add author

| ID | Steps | Expected |
|----|-------|----------|
| S01 | Pub type with only single-author peers | **Add author** hidden |
| S02 | Same pub type has any ref with 2+ authors | **Add author** visible |
| S03 | Book with `(Eds.)` after names | **Add editor** shown; Add author hidden |
| S04 | Peers have `uri`, current lacks it | `uri` suggestion chip |
| S05 | + Add author; field Apply; footer Apply | New `string-name` with inner `<insert data-track-code=ref-text-01>` (not outer wrap) |
| S06 | Edit existing year; footer Apply | Year span: `<insert data-track-code=ref-text-01>` then `<del data-track-code=ref-text-del-01>` |
| S07 | After year edit, open dialog Preview | Preview shows **new** year only (del hidden) |
| S07b | Re-open dialog on already-tracked year (`insert`+`del` in DOM) | Preview **and** Edit Field show insert text only (e.g. `2021`), not `20212020` |
| S08 | Add suggested field between existing leaves | Leaf + prev/next delims appended only; intervening text **not** wiped via `deleteContents` |
| S09 | Edit italic-wrapped source; footer Apply | `.source > em` retained; insert+del **inside** em |

---

## 3. Structure / tracking

| ID | Steps | Expected |
|----|-------|----------|
| X01 | Edit year via field Apply + footer Apply | Outer year span unchanged; insert+del **inside** span; insert=`ref-text-01`, del=`ref-text-del-01` |
| X02 | Show Tracking (insert) | “Reference text edited” |
| X02b | Show Tracking (del) | “Reference text deleted” (`ref-text-del-01`) |
| X03 | Add suggested leaf (e.g. uri) | Token span with inner insert only; no outer insert wrapping the span |
| X04 | Edit italic source | `<span class="source"><em>…insert+del…</em></span>` |
| X05 | Change first author surname; check **Update linked citations**; footer Apply | Matching `a.xref` bodies update surname token; track `cite-text-sync-01` |
| X05b | Change **Author Surname 2** or bare second `string-name`; check sync; footer Apply | Same-rid cites containing that name replace it; Author-1-only cites unchanged |
| X06 | Change year only; cites still show old custom author without year token | Those cites skipped (no blind rewrite) |
| X07 | Change surname; cite has italic `et al.` | Format wrappers retained when possible; `et al.` kept |
| X08 | Open ref with 2+ document cites | Citation Preview shows cites in a **grid** (not one-per-row); count in heading/tab |
| X09 | Open ref with no cites | Citation Preview empty hint; sync checkbox **hidden** |
| X10 | Change surname/year; check sync; footer Apply | Citation Preview would show synced text; sync runs |
| X11 | Change surname/year; leave sync unchecked; footer Apply | Ref updates; cites **unchanged** |
| X12 | Open dialog (no name/year dirty yet) | **Update linked citations** hidden |
| X13 | Field-Apply year or any author surname (cites exist) | Checkbox **shown** (unchecked, enabled) |
| X14 | Revert year/surname so no sync delta | Checkbox **hidden** again |
| X15 | Open dual-author ref (e.g. Ghimire / Mokhtari) whose order differs from peers | Preview shows both authors + `, and ` in editor document order; no omitted second author |

---

## 4. Labels / messages.json (chrome)

Rebuild/copy module JSON + template into `dist/assets/{version}/modules/` before these checks. Hard-refresh if the session already cached `EDIT_REFERENCE_TEXT_MESSAGES`.

| ID | Steps | Expected |
|----|-------|----------|
| L01 | Open Edit Reference Text | Footer primary button text is **Update** (not Apply) |
| L02 | Close dialog; open again on another (or same) ref | Footer still **Update** after remount |
| L03 | Confirm `data-lang-lab="btn_apply"` on `#apply_ref_text` | Matches `messages.json` en `labels.btn_apply` |

---

## Sign-off

- [ ] T01–T13 (incl. T01b / T01b-live / T01c / T02k)
- [ ] S01–S09 (incl. S07b)
- [ ] X01–X15 (incl. X02b / X05b)
- [ ] L01–L03
