# Linksharing session — use cases

**Docs:** [skills.md](./skills.md) · [WORKFLOW.md](./WORKFLOW.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md)

Narrative scenarios for dual-guard. Map to QA IDs where noted.

Backend reference only: [`../linksharing-frontend-backend-map.md`](../linksharing-frontend-backend-map.md).

---

## UC1 — Author happy path (QA L1, E1)

**Actors:** Author with valid IMPACT link.

**Steps**

1. Open landing validate URL; complete Agree/Continue.
2. Server grants session (`process: check` → `r:1`).
3. Client stores `session_id` / `docid` via `setItemsandReDirect` and verifies via `confirmLinkSessionOnServer` → `confirmSessionOnServer`.
4. Browser navigates to editor6.
5. `InitialLoadDialog.validateSessionThenReady` awaits Promise `new_session_check`, then getdocs, then Ready.

**Expected**

- Active row: `docstatus:1`, `session_end_time:0`.
- Local backup holds session id.
- Editor usable; idle scheduler starts only after Ready (`CHECK_REQUEST.Init` in `onInitializeComplete`).
- No Session Expired dialog on first paint.

---

## UC2 — Reopen after logout / idle sign-off (QA E2, I2)

**Actors:** Author who previously logged out or left after idle timeout.

**Steps**

1. Prior session closed with `process: close` (logout or idle Leave).
2. User hard-refreshes a bookmarked editor URL (stale sessionStorage/backup possible).
3. Loader runs dual-guard.

**Expected**

- `new_session_check` and/or getdocs fails for closed `session_id`.
- Backup + tabid cleaned; Session Expired without a Ready flash.
- Idle monitoring does not start.
- User returns via landing for a new `check` (not endless `refresh` of closed id).

---

## UC3 — Soft refresh while editing (QA E3)

**Actors:** Author mid-session.

**Steps**

1. Editor Ready with active session and tab id in storage.
2. User refreshes the tab (F5).

**Expected**

- Client sends `process: refresh` with same tab/session ids.
- Getdocs confirms active row.
- Editor returns to Ready; work continues.

---

## UC4 — Second user / Send Request (QA R1–R3, L4)

**Actors:** Active editor holder; second person with same link (non-collab).

**Steps**

1. First user holds active session in editor.
2. Second user lands; `check` returns `r:0` → Send Request.
3. First user’s scheduler surfaces LinkShare dialog.
4. Accept, Reject, or timeout.

**Expected**

- Accept/timeout: handoff via `updatestatus_reqstatus`; second user poll/grant passes dual-guard (`skipVerify: false`) into editor.
- Reject: `requeststatus:4`; second user denied with remarks path.

---

## UC5 — Collaborative / Collator bypass (QA L3)

**Actors:** Same username on collab-enabled doc, or Collator force-close path.

**Steps**

1. Open / grant path that sets `skipVerify` (collab bypass) or `canforceClose` (Collator).
2. Landing `setItemsandReDirect` skips getdocs block when product allows.

**Expected**

- Documented bypass only — see [DEV.md](./DEV.md) skipVerify inventory.
- Where bypass does not apply, verify still requires an active matching row.

---

## UC6 — Finalize then reopen (QA F1)

**Actors:** Author completing review.

**Steps**

1. Finalize / sign-off → logout path closes session (`close`, or collab `signoff` via `buildSignoffPayload`).
2. User opens the same landing link again.

**Expected**

- Prior row is not active.
- New `check` inserts/grants a new `session_id`.
- Dual-guard verifies the **new** id before editor Ready.
- Must not treat closed backup as a successful refresh.

---

## UC7 — Track View (QA E4)

**Actors:** Track View reader.

**Expected**

- `validateSessionThenReady`: Track View / localhost allow Ready; live editor runs session gate — does **not** seed on Ready.
- No spurious Session Expired from editor gate.
- Track features load as before.

---

## UC8 — Save active / stale / outage (QA S0–S2)

**Actors:** Author mid-edit.

| Case | Expected (`mapSaveValidationReason`) |
|------|----------------------------------------|
| Active session | Save allowed |
| Closed elsewhere (`no_active_row` / mismatch / …) | Stale block + redirect |
| getdocs blip (`request_error` / `getdocs_unavailable`) | **Postpone** — not expire redirect |

---

## UC9 — Idle grace (QA I1)

**Actors:** Author just reached Ready; no successful save yet.

**Expected**

- No idle alert within `IDLE_GRACE_MS` (5 min) after `__linkSessionReadyAt`.
- Also no false idle while `lastSaveTimestamp == 0` until first save.

---

## State cheat sheet

| State | Local | Server active row |
|-------|--------|-------------------|
| After successful landing grant | sessionStorage + sessionbackup | `docstatus:1`, end `0` |
| After Ready | Same + tab id as used by refresh; `__linkSessionReadyAt` set | Same |
| After logout/idle close | Backup should be cleared on gate fail | `docstatus:0`, end time set |
| After LinkShare accept | Old session handed off; new grant for requester | New active row for requester |
