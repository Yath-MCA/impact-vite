# Table footnotes — QA and production checklist

Use this after a **rebuild**. Old `dist` still uses LTR letter rank (`n (%)` becomes `c`). Confirm the served JS includes alphabet-shift `_assignRenumberedLabels` in [`context.js`](context.js).

Change summary: [table-notes-last-version.md](table-notes-last-version.md).

## Regression command

```text
node tests/unit/tables/runTblFnLabelType.mjs
```

Expected: `runTblFnLabelType: ok`

## Manual smoke (JCN mixed TABLE 1)

Document mix: unnumber, abbrev, letters `a–d`, `*`/`**`/`***`, trailing unnumber, source.

### Insert New

1. Rebuild so Tomcat loads new tables context.
2. Open a JCN (or equivalent) table like TABLE 1.
3. On **Variable**, Insert New **Cued**, label **`a`**, apply.
4. Dialog title is Insert New (not Cite). Cued uses letters, not `*` (Probability).

**Expected**

- Variable cite: `a`
- `n (%)`: **`b`** (not `c`)
- χ²: **`c`**
- IHD: `d`; Other comorbidities: `e`
- `*` / `**` / `***` unchanged
- Each letter footnote has a unique `T1Fn*` id; cites keep `rid` to that id

### Cite vs Insert New

- Cite existing footnote: pick by rid/label; do not retitle as Cite when inserting new.
- Insert New Probability: `*` family, not letter `a`.

### ICE / second pass

- After insert, a tracked cite may show `<insert data-del-val="a">b</insert>`.
- Renumber again: letters stay unique; `n (%)` stays `b`; stars stay `*`.

### Delete / unlink

- Delete the new `a` (or unlink): remaining letters compact (`b`→`a`, `c`→`b`, …).
- Stars and unnumber/abbrev/source stay in place.

## Config variants

| Setup | What to check |
| --- | --- |
| No `Table.wrapfooter` | Infer alphabets from existing `a–z`. P-stars stay Probability. Letter insert still shifts `a`→`b`. |
| `designators=alphabets` (e.g. JCN XML) | Same shift as above. |
| `designators` symbols / arabic | Do not apply letter shift to those families. |

## Production / QA host

1. Deploy the **new** gulp or webpack output (not a stale `dist` on disk).
2. Hard-refresh or cache-bust the editor JS.
3. Repeat Insert New `a` on Variable on a real JCN article; fail the build if `n (%)` is `c` while χ² is still `b`.
4. Do not treat localhost as pass until rebuild has run.
