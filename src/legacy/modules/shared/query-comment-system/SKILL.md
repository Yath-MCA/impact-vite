---
name: comment-query
description: >-
  Use when changing author queries, comments, query panel/dialog, collator verify
  (openVerify), quick reply mode, or src/js/query.js query system code.
  Read README, skills, DEV, and QA in src/modules/comment_query before editing.
---

# Comment Query

Runtime code is split in [`src/query-comment-system/`](../../query-comment-system/). Documentation lives in this folder.

Read before changing behavior:

- [README.md](./README.md) — architecture, globals, entry points
- [skills.md](./skills.md) — INSERT / REPLY / DELETE / RESTORE / VERIFY flows
- [DEV.md](./DEV.md) — class/method inventory, submit options, verify internals
- [QA.md](./QA.md) — manual checklist
- [TestCase.md](./TestCase.md) — numbered test cases

## Hard rules

1. **Id convention** — DOM `id="queryDialog"` equals module id; `window.queryDialog` must be the **module instance**, not the HTMLElement.
2. **Always await** `moduleSystem.getModule('queryDialog')` before use.
3. **Track view** — no `queryDialog` / `openVerify`; guard collator-only paths with `isCollator`.
4. **Verify skip logic** — DOM `approved` or `lastResponse.sameUserRole` skips verify; default DOM `pending` stamp does **not**.
5. **Verify footer** — quick actions left, `n of N | Prev | Next` right, single row via `.dialog-verify-footer.verify-stepper`.
6. **Demand-based validation** — submit rules come from per-open `options`, not global defaults.

## Collator quick reply

- Panel and dialog share `QueryTemplates.renderQuickReplyButtonRow()`
- In verify mode, quick buttons live in footer only (`shouldShowDialogQuickReply` false)
- `Approved` / `Pending` submit immediately; `TS Notes` opens free text

## Related

- Styles: [`src/static/css/Dialogs/QueryCommentModule.scss`](../../static/css/Dialogs/QueryCommentModule.scss)
- Deep reference: [`docs/query-system-docs.md`](../../../docs/query-system-docs.md)
