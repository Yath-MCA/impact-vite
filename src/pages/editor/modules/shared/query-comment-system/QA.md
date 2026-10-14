# Comment Query — QA Checklist

Module under test: query/comment system (`src/query-comment-system/`, merged at build).  
See [README.md](./README.md) for overview and [DEV.md](./DEV.md) for implementation details.

## Prerequisites

- Assets rebuilt so `query.js` and `QueryCommentModule.scss` are current
- Test as **Author**, **Editor**, and **Collator (CO)** roles
- Editor: `editor6.html?docid=...`
- `commentQueryGroup` enabled in client `config.xml`
- `#queryDialog` loads (`window.queryDialog.open` is a function, not a DOM node)

---

## 1. Panel — add and list

| ID | Steps | Expected |
|----|-------|----------|
| CQ-P01 | Click `#addcmt` on comment tab | Dialog opens for new comment |
| CQ-P02 | Switch to query tab, add query | Dialog opens; new AQ label assigned on save |
| CQ-P03 | Create query, check panel list | Item appears with correct label and status |
| CQ-P04 | Click panel item | Editor scrolls/selects marker |
| CQ-P05 | Filter open vs closed queries | List updates correctly |
| CQ-P06 | Comment tab list | Comments shown; no AQ labels |

---

## 2. Dialog — create, reply, attachments

| ID | Steps | Expected |
|----|-------|----------|
| CQ-D01 | Context menu **Add Comment** | Dialog opens (`ADD_NEW_CMD`) |
| CQ-D02 | Context menu **Add Query** | Dialog opens (`ADD_NEW_QRY`) |
| CQ-D03 | Toolbar **Add Comment** | `add_comment` command opens dialog |
| CQ-D04 | Create query with text only | Saves; marker in editor; panel refreshes |
| CQ-D05 | Create query with attachment | Attachment uploaded and linked |
| CQ-D06 | Reply to open query as editor | Response added; query may close per workflow |
| CQ-D07 | Open figures workflow with `isAttachmentRequired` | Save blocked without attachment |
| CQ-D08 | Open with `isInputContentRequired` | Save blocked with empty text |
| CQ-D09 | Click marker in editor | Dialog opens on correct query/comment |

---

## 3. Collator quick reply (panel + dialog)

| ID | Steps | Expected |
|----|-------|----------|
| CQ-C01 | Open as collator, view panel query | Quick buttons visible (`Approved`, `Pending`, `TS Notes`) |
| CQ-C02 | Click **Approved** on panel | Immediate submit; query updated |
| CQ-C03 | Click **Pending** on panel | Immediate submit |
| CQ-C04 | Click **TS Notes** | Textarea expands for free text |
| CQ-C05 | Open dialog reply (non-verify) as collator | Quick buttons in dialog body |
| CQ-C06 | Click **Approved** in dialog | Submits and closes |

---

## 4. Collator verify (`openVerify`)

| ID | Steps | Expected |
|----|-------|----------|
| CQ-V01 | As collator, call `openVerify()` or `openVerifyDialog()` on undecided query | Verify dialog opens; header shows "Verify AQn" |
| CQ-V02 | Check footer layout | Single row: quick left (`Approved`/`Pending`/`TS Notes`), `n of N \| Prev \| Next` right |
| CQ-V03 | Click **Next** / **Prev** | Queue navigates; count updates; editor cursor follows |
| CQ-V04 | Click **TS Notes** in footer | Hidden input shell appears for free text |
| CQ-V05 | Click **Approved** in footer | Submits; auto-advances to next item or closes |
| CQ-V06 | Open verify on query with DOM `data-collation-status="approved"` | Skipped / does not open verify |
| CQ-V07 | Open verify after collator already replied (`sameUserRole`) | Skipped; footer quick hidden if forced open |
| CQ-V08 | Open verify on collator-authored comment | Skipped |
| CQ-V09 | Query with default DOM `pending` stamp (author last reply) | **Opens verify** — footer visible |
| CQ-V10 | Narrow dialog width | Footer stays one row; horizontal scroll if needed |

---

## 5. Track view

| ID | Steps | Expected |
|----|-------|----------|
| CQ-T01 | Open `editor6TrackView.html` as collator | Panel loads queries/comments |
| CQ-T02 | Attempt `queryDialog.open` | Guarded / unavailable (no full dialog module) |
| CQ-T03 | Panel refresh after DOM change | List syncs from editor |

---

## 6. Regressions

| ID | Check | Expected |
|----|-------|----------|
| CQ-R01 | `typeof window.queryDialog.open === 'function'` | Module instance, not HTMLElement |
| CQ-R02 | Context menu Add Comment/Query after late editor init | Commands present |
| CQ-R03 | Delete response with attachment | Response removed; status reverted if last |
| CQ-R04 | `queryModule.persistFinalQuerySnapshot` on signoff | No console errors |
| CQ-R05 | Non-collator roles | No verify footer; default reply mode per config |
| CQ-R06 | Restore deleted query marker | `QueryRestoreModule` re-inserts when configured |

---

## Notes

- E2E automation: [`tests/e2e/modules/query-comment.spec.js`](../../../tests/e2e/modules/query-comment.spec.js), [`query-workflow.spec.js`](../../../tests/e2e/modules/query-workflow.spec.js)
- Numbered cases: [TestCase.md](./TestCase.md)
