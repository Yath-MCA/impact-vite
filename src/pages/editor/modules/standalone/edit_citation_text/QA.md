# Edit Citation Text — QA Test Documentation

Module under test: `src/modules/edit_citation_text/`  
Related menu: **Edit Citation Text** (`editCiteText`)  
Config: `citeGroup` → `editCiteText`

See [README.md](./README.md) for product overview and [DEV.md](./DEV.md) for implementation details.

---

## Preconditions

- Document with at least one bibliographic citation (`a.xref[data-role=bibr]` or `ref-type=bibr`)
- For Linked-field cases: samples for chapter/section title, boxed-text/fig caption (see C-LF*)
- Prefer Name & Date journal (`data-label-format="unnumbered"`) for primary scenarios
- Assets rebuilt so new `context.js` + template + module JS + `xref_role_config.json` are loaded
- `editCiteText` enabled in client `config.xml`
- At least two bibliography refs available when testing **Change**

---

## 1. Menu visibility

| ID | Steps | Expected |
|----|-------|----------|
| C-M01 | Right-click Name & Date / numbered `bibr` xref | **Edit Citation Text** visible |
| C-M01b | Right-click `fig` / `table` / `section` / `chapter` / `boxed-text` xref (current JSON) | Menu **visible** (`enable: true`) |
| C-M01c | Right-click xref with `data-role`/`ref-type`=`disp-formula` | Menu **hidden** (`disp-formula.enable: false`; exact key wins over `equation` selector aliases) |
| C-M01d | Right-click `equation` xref | Menu **visible**; dialog = Edit Equation Citation |
| C-M02 | Right-click fig or table xref | Menu **shown**; dialog title / Linked label from role (`Edit Figure Citation` / `Linked figure`, etc.) |
| C-M03 | Right-click deleted xref (`data-remove`) | Menu **not** shown |
| C-M04 | Right-click restricted xref (e.g. footnote/aff) | Menu **not** shown |
| C-M05 | Para-locked block containing xref | Menu **not** shown / open blocked |
| C-M06 | Set `editCiteText` `show="false"`, reload | Menu **not** shown |
| C-M07 | Confirm existing **Edit Citation** / **Insert Citation** still appear as before | Regression OK |

---

## 1b. Linked field content (role-aware)

| ID | Steps | Expected |
|----|-------|----------|
| C-LF01 | Open `bibr` cite | Linked label = **Linked reference**; value = mixed-citation / ref text (year kept if truncated); full text in input `title` |
| C-LF02 | Open `chapter` / `section` whose title has nested `target` + PageID/senter | Linked label = **Linked chapter** / **Linked section**; value = plain title only (no target / PI noise) |
| C-LF03 | Open `boxed-text` with `<label>Box 1.1</label>` + caption title | Linked label = **Linked box**; value = caption title (e.g. `Navigating Terminology`), **not** `Box 1.1` |
| C-LF04 | Open `fig` / `table` with caption title | Linked label = **Linked figure** / **Linked table**; value = caption title (or `.caption .p` / caption text fallback) |
| C-LF05 | Non-bibr open | **Change** / Wrap / sync UI hidden (`allowChangeRef` / `allowWrap` / `allowSyncFromRef` false) |

---

## 2. Happy path (display text)

| ID | Steps | Expected |
|----|-------|----------|
| C-H01 | Open dialog on cite with surround `(qtd in Nelson 1973, 5)` | Display Text = `Nelson 1973` only (xref-only); button **Wrap selection** |
| C-H02 | Change text; Apply enables | Apply enabled when text dirty (`normalizeSpace`) |
| C-H03 | Apply | Text updates in editor; dialog closes |
| C-H04 | Inspect DOM after text-only Apply | `rid` / `href` / `ref-type` / `data-role` unchanged |
| C-H05 | Inspect DOM after direct text edit | `data-track-code="cite-text-direct-01"` |
| C-H06 | Show Tracking after direct edit | “Direct citation text edited” |
| C-H07 | Show Tracking after indirect edit | “Indirect citation text edited” / `cite-text-indirect-01` |
| C-H08 | Close dialog and reopen; edit text again | Apply enables (listener remount / `_boundTextInput` OK) |
| C-H09 | Paste into Display Text | Apply enables after paste |
| C-H10 | Type `O'Neil` in Display Text | Becomes `O’Neil` (typographic apostrophe) |
| C-H11 | Change editor selection while dialog open | Button label becomes **Update wrap** |
| C-H12 | Wrap/Update wrap of `(qtd in …, 5)` / `(…, p. 281)` / `(Gentry & Smith, 2019)` (≤5 extras) | Editor range auto-selected; Display updated; no space before comma |
| C-H13 | Wrap/Update wrap then Apply | Updates xref and surround prefix/suffix |
| C-H14 | Apply without ever using Wrap selection | Xref body only; surround nodes unchanged |
| C-H15 | Click Wrap when DOM surround is >5 extras | Toast; Display unchanged |
| C-H15a | Click **Wrap selection** with no prior editor drag on `(qtd in Name Year, p. n)` or `<a>…</a>, p. n` | Editor highlights wrap; Display fills; `rangeSelected`; no user drag required |
| C-H15b | Apply after wrap with page sibling | DOM is `</a>, p. …` (no whitespace text node between xref and comma) |
| C-H16 | Wrap selection on `(PVAO, n.d.)` | Display filled; Apply OK |
| C-H17 | Wrap selection on `(Mohamed & Chew, n.d)` | Same (`n.d` without trailing period) |
| C-H18 | Full cite `(Olick et al., 2011)` selected | 0 extra words; Display OK |
| C-H19 | `(United Nations Secretary-General, 2004)` body inside xref | Wrap selection OK |
| C-H20 | `(Bandit Chulasai & Ratchada Chotipanich, 2021)` | Dual/multi-word authors OK |
| C-H21 | Surround Apply with `n.d.` cite + page (e.g. selection used) | Prefix/suffix split treats `n.d.` as date end |
| C-H22 | Wrap selection on narrative `Assmann (2008)` (body inside xref) | Display filled; 0 extras; Apply OK |
| C-H23 | Wrap selection on `Abousnnouga and Machin (2013)` | Same; `and` does not inflate extras |
| C-H24 | Wrap selection on `Molden, 2016` / `Abousnnouga & Machin, 2011` | Cite-only OK |
| C-H25 | Wrap selection on `Beckstead et al., 2011` | `et al.` counts as one token; OK |
| C-H26 | Year-only body `1997` or fragment `2013)` | Wrap selection / Apply OK |
| C-H27 | Wrap selection on `de la Paz, 2012` | Particle surname OK |
| C-H28 | Wrap selection on `Barr & Skrbis̆, 2008` | Diacritic author OK |
| C-H29 | Incomplete paren year `Remensnyder (1996` / `… Machin (2010` | Year match; no forced `)` |
| C-H30 | Surround Apply on `Assmann (2008)` + page/suffix | Closing `)` stays on xref body, not suffix |
| C-H31 | Wrap selection on `(Mohamed & Chew, n.d, p. 234)` then Apply | Xref = `Mohamed & Chew, n.d`; `, p. 234` is sibling text **outside** `a.xref` (often inside same `<insert>`) |
| C-H32 | Re-edit cite already wrapped in `<insert><a>…n.d</a>, p. 234</insert>`; change page or cite; Apply | Updates in place; page stays outside `a.xref`; no second link for page; no nested wrap around cite body |
| C-H33 | Wrap on Chicago reprint `(Thackeray [1848] 1950, 25)` | Editor selects full outer paren wrap (not `[1848]`); Display includes body + page; Apply → xref `Thackeray [1848] 1950`, sibling `, 25` |
| C-H34 | Open dialog on direct cite (no parens / no page sibling) | **Wrap selection** disabled |
| C-H35 | Open on `(Name Year)` or `<a>…</a>, p. n` | **Wrap selection** enabled |
| C-H36 | Open cite with 3 same-rid siblings | Section after Linked reference shows grid of 3; Prev/Next + `N of M` when clean |
| C-H37 | Edit Display Text (dirty) | Prev/Next and grid jump **disabled**; **Wrap selection** also **disabled** |
| C-H37b | Revert Display Text to original on a cite with surround | **Wrap selection** **re-enabled** (when wrap range still available) |
| C-H38 | Revert Display Text to original (clean) | Prev/Next **enabled** again; navigate reloads dialog on target cite |
| C-H39 | Prev/Next/grid to another same-rid cite | Editor scrolls to and selects target `a.xref` first; dialog text updates; Display Text focused last |

---

## 3. Change corresponding reference

Bibr / `allowChangeRef` only. Non-bibr roles hide **Change** (see C-LF05).

| ID | Steps | Expected |
|----|-------|----------|
| C-L01 | Click **Change** | `#cite_ref_picker` opens with filter + truncated rows |
| C-L02 | Select another reference | Linked label updates; Display Text becomes new `Surname, Year` |
| C-L03 | Apply after Change | `rid` / `href` / `data-cke-saved-href` updated; editor shows new name/year |
| C-L04 | Change when Display Text had `…, p. 12` | New `Surname, Year, p. 12` (page suffix kept) |
| C-L05 | Change rid + further edit text; Apply | Both applied; track code is direct/indirect |
| C-L06 | Multi-space `rid` cite; click **Change** | Toast to use Edit Citation; picker does not open |
| C-L07 | Filter list by author fragment, id, or year | Matching truncated rows only; `title` has full label |
| C-L08 | Cancel after selecting a different ref (before Apply) | No DOM change |
| C-L09 | Long mixed-citation; open Change / select ref | Truncated linked field and list rows still show the publication year |

---

## 4. Formatting retention

| ID | Steps | Expected |
|----|-------|----------|
| C-F01 | Cite with `<em class="italic" data-name="italic">et al.</em>`; edit wording; Apply | Format tags not fully stripped; no bare `textContent` wipe of all markup |
| C-F02 | Cite with `<span class="font" data-name="font" …>`; Change + Apply with new text | Link attrs updated; display text updated |
| C-F03 | Formatted cite; text edit with track on | `<del>` contains previous HTML markup |
| C-F04 | Entire xref wrapped in one format element; edit text; Apply | Wrapper attrs retained; text updated inside |
| C-F05 | Single-word author → dual-word author (e.g. Arafat → Van der Berg) | Full dual-word name visible in editor after Apply |

---

## 5. Structure / Name & Date

| ID | Steps | Expected |
|----|-------|----------|
| C-S01 | Edit “Smith et al. 2020” → custom wording | Link still points to same `CIT####` unless Change used |
| C-S02 | Multi-rid cluster: edit one selected xref text | Only that xref text changes; attrs intact |
| C-S03 | After free-edit, open existing **Edit Citation** (Modify refs) | Cross Citation still opens |
| C-S04 | Indirect cite; Wrap/Update wrap; change page to `p. 99`; Apply | Suffix text node updates |
| C-S05 | `Arafat, 1995` → add `p. 123` into Display Text (xref-only) | Page text applied into xref body |
| C-S06 | Alter name or year only | Works; editor shows new wording |
| C-S07 | Edit Reference Text changes first surname/year for rid | Linked `bibr` xrefs token-updated via `syncFromRefChange`; page siblings outside xref untouched |
| C-S07b | Edit Reference Text changes Author Surname 2 / bare string-name; cite is `Ghimire and Mokhtari, 2025` | Second name → new token in same-rid cites; first-author-only cites unchanged |
| C-S08 | Cite already custom (no old surname/year tokens) | Sync skips that xref |
| C-S09 | Formatted cite synced from ref year change | Format retained when possible; `cite-text-sync-01` |

---

## 6. Track changes

| ID | Steps | Expected |
|----|-------|----------|
| C-T01 | Edit cite not inside `<insert>`; Apply | Old content in `<del>`; xref wrapped in `<insert>` |
| C-T02 | Edit cite already inside same-user `<insert>`; Apply | Text updates without nested broken structure |
| C-T03 | Snapshot / undo stack | Document save snapshot runs; editor remains usable |
| C-T04 | Change reference + Apply (display refreshed) | Editor text + link attrs updated; track code direct/indirect or relink as appropriate |
| C-T05 | Apply with wrap: insert + xref both have same `data-track-code` | Show Tracking shows **one** row (child skipped; attrs kept on both) |

---

## 7. Negative / edge

| ID | Steps | Expected |
|----|-------|----------|
| C-N01 | Open dialog; do not change text or rid | Apply disabled |
| C-N02 | Clear Display Text to empty | Apply stays disabled / cannot apply empty |
| C-N03 | Cancel / X after typing | No DOM change |
| C-N04 | Open dialog then delete xref elsewhere before Apply | Error/close; no crash |
| C-N05 | Ctrl/Cmd+Enter with dirty text | Applies (same as Apply button) |
| C-N06 | Open picker, click **Change** again | Picker collapses |

---

## 8. Config / regression

| ID | Steps | Expected |
|----|-------|----------|
| C-R01 | Hyperlink Edit Link on URL still works | Unaffected |
| C-R02 | Insert Citation / Delete Citation flows | Unaffected |
| C-R03 | Numbered journal cite free-edit | Text + track code; no forced renumber from this dialog |
| C-R04 | Show Tracking still resolves direct/indirect/relink messages | Messages from support JSON |

---

## Sign-off checklist

- [ ] Menu visibility (C-M*)
- [ ] Linked field content (C-LF*)
- [ ] Happy path + attrs (C-H*)
- [ ] Change reference (C-L* — bibr only)
- [ ] Formatting retention (C-F*)
- [ ] Structure (C-S*)
- [ ] Track changes (C-T*)
- [ ] Negatives (C-N*)
- [ ] Regression (C-R*)
- [ ] Show Tracking for `cite-text-direct-01` / `cite-text-indirect-01` / `cite-text-relink-01`
