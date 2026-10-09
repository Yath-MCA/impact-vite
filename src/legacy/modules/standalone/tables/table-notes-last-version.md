# Table footnotes — last version (letter assign)

This note describes the **letter-renumber change** in table notes (`TablesMethodsGroup` in [`context.js`](context.js)). It is not a new module. Dialog types, cite-by-rid, and probability stars were already in place.

## What did not change

- Unique letter cites are still collected by **`rid`** (`_collectCitations`). Caption then table rows, one entry per footnote id.
- Probability cues (`*`, `**`, `***`) are **skipped** for letter renumber.
- Original letter is **not** taken from ICE `$(xref).text()` (e.g. `<insert data-del-val="a">b</insert>`).
- Notes and xrefs still update by **`OrginalID`** (`_updateNoteLabels`, `_updateCitations`).

## What changed

Previously `_assignRenumberedLabels` set `Renumbered = curOrder[i]` in **LTR unique-cite order**. On a mixed JCN TABLE 1, χ² is cited before `n (%)`, so inserting a new `a` on Variable kept χ² as `b` and jumped old `a` (`n (%)`) to **`c`**.

Now `_assignRenumberedLabels` **alphabet-shifts** the letter series:

1. Find the new footnote (`data-new` on the fn).
2. Sort the other letter notes by current `data-label` (`a` < `b` < `c` …).
3. Place the new note at the insert letter (usually `a`).
4. Assign `a, b, c…` in that list.

## Expected after Insert New Cued `a` on Variable (JCN T1)

| Location | Before | After |
| --- | --- | --- |
| Variable (new cite) | — | `a` |
| `n (%)` (`T1Fn3`, was `a`) | `a` | **`b`** |
| χ² (`T1Fn4`, was `b`) | `b` | **`c`** |
| IHD / Other comorbidities | `c` / `d` | `d` / `e` |
| `*` / `**` / `***` | unchanged | unchanged |

## Automated check

```text
node tests/unit/tables/runTblFnLabelType.mjs
```

After insert on `#IMP58`: `#IMP64` (`n (%)`) superscript is `b`; `#IMP63` (χ²) is `c`. Unique `fn` ids; stars still `*`/`**`/`***`.

## Ship

Rebuild gulp/`dist` (or the webpack bundle Tomcat actually serves) before judging localhost. Do not commit unless asked.

See also [table-notes-qa-production.md](table-notes-qa-production.md).
