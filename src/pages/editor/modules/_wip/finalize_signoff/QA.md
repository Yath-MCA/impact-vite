# FinalizeSignOff — manual smoke checklist

**Workflow + payload reference:** [`docs/finalize/FinalizeSignOff_Workflow.md`](../../../docs/finalize/FinalizeSignOff_Workflow.md). **Combine API:** [`savewithfinalize.md`](savewithfinalize.md).

Run after ModuleSystem cutover. Default capabilities = **legacy** commit.

1. **Register / open**
   - Editor toolbar Finalize opens one `#FinalizingDialog` (no duplicate DOM).
   - `window.openFinalizeDialog` and `window.FinalizeDialog` are set after open.
   - para_id finalize path and QC (CO) still open finalize after store/fire.

2. **Role stages**
   - Primary + open author queries → `query_open` (Reply to query), not finalize Yes.
   - CO + open queries → `query_open_co_user` (Submit still available).
   - Query count mismatch → `query_mismatch` + Logoff.

3. **Collab**
   - Collab-enabled primary with no open queries → `collaborative_status` table.
   - On Yes: session close uses `process: signoff` (check network / LinkSessionClose log).

4. **Legacy happy path** (default caps)
   - Non-collab finalize Yes → ShareInvite sign-off AJAX → `finalize_pass` → survey/redirect.
   - Non-CO still fires `updateSignOffTime` when applicable.

5. **saveWithLogout capability**
   - In console: `window.IMPACT_FINALIZE_USE_SAVE_WITH_LOGOUT = true` then finalize.
   - Expect combined `savewithlogout` call; **no** separate ShareInvite `signoff: true` FE call after success.
   - Reset: `delete window.IMPACT_FINALIZE_USE_SAVE_WITH_LOGOUT`.

6. **saveWithFinalize (Combine API v2)**
   - UAT/local only: `window.IMPACT_SAVE_WITH_FINALIZE_READY = true` then finalize Author pubkit path.
   - Network: **one** `savewithfinalize` POST — no separate `updateorinsert` / `findupdateorinsert` / `pukitapiclosetask` during commit.
   - Payload: `recordtype: savewithfinalize`, `shared_id`, `shared_id_attachments` (role-scoped; Collator = all attachments), `info`, `trackPDF`, `count_info`, pubkit fields when applicable.
   - Collator path: verify `shared_id_attachments` length matches all document attachments in DevTools payload.
   - Response: `save`, `shareandinvite` (with `key`), `session`, `closetaskres`, `taskclosureuser` sections when full success.
   - Post phase: no duplicate post AJAX when `isPostPhaseComplete` true.
   - Partial (`save` ok, `session`/`shareandinvite` fail) → `finalize_retry`.
   - Reset: `delete window.IMPACT_SAVE_WITH_FINALIZE_READY`.

7. **Failure**
   - Force ShareInvite/sign-off failure (`r: 0`) → `finalize_retry` stage.

8. **Unit**
   - `npx vitest run tests/unit/finalize_signoff/capabilitiesAndFlow.test.js`
