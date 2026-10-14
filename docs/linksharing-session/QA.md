# Linksharing session — QA checklist

**Docs:** [skills.md](./skills.md) · [WORKFLOW.md](./WORKFLOW.md) · [DEV.md](./DEV.md) · [use_cases.md](./use_cases.md)

Pass/fail cases for dual-guard (landing redirect + InitialLoadDialog Ready + save reason mapping).

## Prerequisites

- Built/deployed landing and editor6 including updated LinkSession (`LinkSessionCore`), LandingPage, `_initalLoadingDialog`, `editor_page_events_fn`, `index.js`.
- Browser DevTools → Network + Application (sessionStorage / localStorage).
- Test non-collab and collab (if available); localhost vs deployed host where possible.

---

## Landing

| # | Steps | Expected |
|---|--------|----------|
| L1 | Valid link → Agree/Continue → grant `r:1` | Network: `linksharing` then `getdocs`; redirect to editor; `xmleditor:sessionbackup:{docid}` contains session id |
| L2 | Simulate closed/missing active row before redirect | Silent up to **3** `process:check` + `remarks:landing_retry` + re-verify; if still fail → **No** navigate; `Land_Page_TRY_AGAIN`; sessionbackup cleared; **no** auto-refresh |
| L2b | Check returns DB error `r:0` (e.g. ClassCastException / Error while accessing DB) | **No** grant/redirect (even if collab/Collator); TRY_AGAIN / request error path |
| L3 | Collab / Collator path that sets `skipVerify` / `canforceClose` on **conflict-shaped** `r:0` | Redirect proceeds without getdocs block (when product allows) — not on bare exception payloads |
| L4 | Send Request → poll grant → redirect | Same dual-guard before navigate as L1 (`skipVerify: false` on poll grant) |

---

## Editor open / refresh

| # | Steps | Expected |
|---|--------|----------|
| E1 | Fresh open from L1 (live editor) | Overlay Validating → Ready after check+getdocs; **no** immediate Session Expired flash |
| E2 | Logout → hard refresh editor URL with old bookmark (live) | Gate failure + `expired_session_alert`; idle **not** started |
| E3 | Soft refresh while session still active (live) | `refresh` + getdocs ok; editor Ready |
| E4 | Track View / readonly | Ready immediately (`track_view_allow`); **no** expired alert; **no** seed |
| E5 | **Localhost** editor open | Ready immediately (`localhost_allow`); **no** seed; **no** expired alert |
| E6 | Live editor missing `session_id` | Gate fail + alert; **no** Ready |
| E7 | Live getdocs fail | Gate fail + alert; **no** seed on live Ready |
| E7 | **E2E direct editor** (no landing Accept): `BASE_URL` = editor `?docid=…` | [`session-baseline`](../../tests/e2e/helpers/session-baseline.helper.js) seeds `xmleditor:sessionid:{docid}` + backup before goto; Ready after dual-guard; optional `E2E_SESSION_MOCK=1` |
| E8 | **E2E mock seed** `npm run test:e2e:direct` with `E2E_SESSION_MOCK=1` | Storage + mocked `linksharing`/`getdocs` return active row (see `direct-editor-session-seed.spec.js`) |

---

## Request / second tab

| # | Steps | Expected |
|---|--------|----------|
| R1 | Open second tab / Send Request while editor active | Scheduler / LinkShare dialog behavior unchanged |
| R2 | Accept request on active editor | Handoff via `updatestatus_reqstatus`; requester can open after poll |
| R3 | Reject request | `requeststatus:4`; requester sees reject path |

---

## Idle / finalize

| # | Steps | Expected |
|---|--------|----------|
| I1 | Within 5 min of Ready (`IDLE_GRACE_MS`) with `lastSaveTimestamp == 0` | No false idle timeout |
| I2 | Idle ≥40 min after Ready → Leave | `process:close` + remarks `idle_leave`; redirect with idle alert params |
| F1 | Finalize → reopen same link | New landing `check` + verify; not silent `refresh` of closed session |

---

## Save dual-guard

| # | Steps | Expected |
|---|--------|----------|
| S0 | Autosave with active session | Save succeeds (`allow`) |
| S1 | Save after session closed elsewhere | Stale block + redirect (not hang) |
| S2 | Save during getdocs outage / `request_error` / `getdocs_unavailable` | **Postpone** retry — **not** expire redirect |

---

## Regressions / smoke

| # | Steps | Expected |
|---|--------|----------|
| S3 | Normal logout | Session closed; landing reopen works |
| S4 | Production (non-localhost) with getdocs blocked | Ready/redirect blocked (fail closed) |

---

## Network signals

| Moment | Expect |
|--------|--------|
| Landing redirect (L1/L4) | `linksharing` (grant / check / poll) → **`getdocs`** (find active) → navigation |
| Landing skipVerify (L3) | `linksharing` grant → navigate **without** blocking getdocs verify |
| Editor after resources (E1/E3) | `linksharing` (`check`/`refresh`) → **`getdocs`** → then scheduler `linksharing` (`scheduler` / `update_session_end_time`) |
| Localhost seed (E5) | **`getdocs`** first → if miss: `linksharing` (`check`, `remarks: local`) → **`getdocs`** → Ready → scheduler |
| Gate failure (E2/E6) | `linksharing` and/or `getdocs` fail → **no** Ready; **no** scheduler start |
| Save validation (S0–S2) | Prefer shared getdocs via `confirmLinkSessionOnServer` / `confirmSessionOnServer` |

DevTools tip: filter Network by `linksharing` and `getdocs`; confirm order above before claiming Ready.
