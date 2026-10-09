# Comment Query — Test Cases

Structured manual and E2E test cases for the query/comment system.  
E2E harness reference: [`tests/e2e/docs/QUERY_WORKFLOW_TESTS.md`](../../../tests/e2e/docs/QUERY_WORKFLOW_TESTS.md).

**Specs:** [`query-comment.spec.js`](../../../tests/e2e/modules/query-comment.spec.js), [`query-workflow.spec.js`](../../../tests/e2e/modules/query-workflow.spec.js), [`insert-comment-basic.spec.js`](../../../tests/e2e/modules/insert-comment-basic.spec.js)

---

## SECTION 1 — CREATE QUERY / COMMENT

### TC-CQ-001: Create Query Without Attachments
**Objective:** Author can create a query with text only.

**Steps:**
1. Get initial query count
2. Open dialog, set process to `query`
3. Enter content, save

**Expected:**
- Query created with status `open`
- Total and open query counts increase by 1
- No attachments

---

### TC-CQ-002: Create Comment Without Attachments
**Objective:** User can create a comment with text only.

**Steps:**
1. Get initial comment count
2. Open dialog with `process: 'comment'`
3. Enter content, save

**Expected:**
- Comment created with status `comment`
- Comment count increases by 1

---

### TC-CQ-003: Create Query With Single Image Attachment
**Objective:** Query creation with TIF attachment.

**Test data:** `Fig1_R3_Final_V2.tif`

**Expected:**
- Query created; attachment count = 1
- Filename pattern parsed (revision, version, extension)

---

### TC-CQ-004: Create Query With Multiple Mixed Attachments
**Objective:** Multiple attachment types in one query.

**Test data:** TIF + PDF + PNG files

**Expected:**
- Attachment count = 3; types detected correctly

---

## SECTION 2 — REPLY AND UPDATE

### TC-CQ-005: Editor Replies Without Attachments
**Objective:** Editor adds text response to open query.

**Expected:**
- Response added; query status may change to `closed`
- Response count = 1

---

### TC-CQ-006: Editor Replies With PDF Attachment
**Objective:** Editor reply includes PDF.

**Test data:** `Supplementary_Material_R2.pdf`

**Expected:**
- Response with attachment; extension `.pdf`

---

### TC-CQ-007: Update Query With Attachments
**Objective:** Author adds attachment to existing query.

**Expected:**
- Attachment count 0 → 1; content updated

---

### TC-CQ-008: Delete Response With Attachments
**Objective:** Remove response and verify cleanup.

**Expected:**
- Response deleted; count = 0; status reverted to `open` if applicable

---

## SECTION 3 — ATTACHMENT MODULE

### TC-CQ-009: Attachment Module Integration
**Objective:** AttachmentModule API present.

**Checks:** `setupFileInput`, `validateFile`, `uploadFiles`, `formatAttachmentResponse`, `normalizeAttachments`

**Expected:** All methods accessible; module initialized

---

### TC-CQ-010: Filename Pattern Validation
**Objective:** Pattern parsing for revision/version keywords.

**Test data:**
- `Fig1_R3_Final_V2.tif` → R3, V2, Final
- `Fig1Final_V2.tif` → V2, Final
- `Supplementary_Material_R2.pdf` → R2

**Expected:** Patterns extracted per spec in QUERY_WORKFLOW_TESTS.md

---

## SECTION 4 — DEMAND-BASED VALIDATION

### TC-CQ-011: Attachment Required
**Objective:** Workflow blocks save without attachment.

**Steps:** Open dialog with `isAttachmentRequired: true`; save without file

**Expected:** Alert/block; no save

---

### TC-CQ-012: Content Required
**Objective:** Workflow blocks empty text.

**Steps:** Open with `isInputContentRequired: true`; save empty

**Expected:** Alert/block; no save

---

### TC-CQ-013: Single Attachment Limit
**Objective:** `hasAllowedMultipleAttach: false` enforces one file.

**Expected:** Second attachment rejected or blocked on save

---

## SECTION 5 — COLLATOR QUICK REPLY

### TC-CQ-014: Panel Quick Approved
**Objective:** Collator one-click Approved on panel.

**Expected:** Immediate submit; DOM/state updated; panel refresh

---

### TC-CQ-015: Panel Quick Pending
**Objective:** Collator one-click Pending on panel.

**Expected:** Immediate submit; `lastResponse.sameUserRole` true

---

### TC-CQ-016: TS Notes Free Text
**Objective:** TS Notes reveals textarea (panel and dialog).

**Expected:** User can enter free text; submit saves response

---

### TC-CQ-017: Dialog Quick Reply (Non-Verify)
**Objective:** Collator dialog reply shows body quick buttons.

**Expected:** Approved/Pending instant; TS Notes expands input

---

## SECTION 6 — COLLATOR VERIFY

### TC-CQ-018: openVerify Undecided Query
**Objective:** Verify opens for query needing collator action.

**Precondition:** Closed query; author last reply; no collator reply; DOM may have default `pending` stamp

**Steps:** `queryDialog.openVerify(queryId)` or `queryModule.openVerifyDialog(queryId)`

**Expected:**
- `_verifyMode` true
- Header: "Verify AQn"
- Footer single row: quick left, `n of N | Prev | Next` right

---

### TC-CQ-019: Verify Footer After Collator Replied
**Objective:** Quick buttons hidden when collator already replied.

**Precondition:** `lastResponse.sameUserRole` true

**Expected:** Nav may show; quick zone empty/hidden

---

### TC-CQ-020: Skip Approved Query
**Objective:** Approved items excluded from verify queue.

**Precondition:** DOM `data-collation-status="approved"`

**Expected:** `openVerify` returns false / item not in queue

---

### TC-CQ-021: Skip Collator-Authored Comment
**Objective:** Collator comments not in verify queue.

**Expected:** `shouldSkipVerifyItem` true; not opened via `openVerify`

---

### TC-CQ-022: Verify Prev/Next Navigation
**Objective:** Queue navigation across multiple items.

**Steps:** Open verify with queue length > 1; click Prev/Next

**Expected:** Index updates; thread reloads; count label correct; buttons disabled at ends

---

### TC-CQ-023: Verify Auto-Advance After Approved
**Objective:** Quick reply advances queue.

**Steps:** Approved on first item with more in queue

**Expected:** Dialog shows next item without manual Next click

---

### TC-CQ-024: Verify Queue Order
**Objective:** Pending queries first, then comments.

**Expected:** `buildVerifyQueue` order matches spec; own-mail comments excluded

---

## SECTION 7 — REGRESSIONS

### TC-CQ-025: window.queryDialog Is Module
**Objective:** Global is module instance.

**Expected:** `typeof window.queryDialog.open === 'function'`

---

### TC-CQ-026: Context Menu Commands
**Objective:** Add Comment/Query available after editor ready.

**Expected:** `ADD_NEW_CMD`, `ADD_NEW_QRY` execute without error

---

### TC-CQ-027: Track View Panel Only
**Objective:** Track view does not break without dialog module.

**Expected:** Panel renders; no `openVerify` without guard errors

---

### TC-CQ-028: Panel Add Button
**Objective:** `#addcmt` opens dialog.

**Expected:** Dialog visible; process matches active tab

---

## Filename pattern reference

See [`QUERY_WORKFLOW_TESTS.md`](../../../tests/e2e/docs/QUERY_WORKFLOW_TESTS.md) § Filename Pattern Specifications for full regex and edge cases.
