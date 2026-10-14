# Linksharing session — skills entry

**Audience:** agents and onboarding. Dual-guard for landing redirect and editor InitialLoadDialog in **impactweb** (`LinkSessionCore` / LinkSession module).

**Docs:** [WORKFLOW.md](./WORKFLOW.md) · [DEV.md](./DEV.md) · [QA.md](./QA.md) · [use_cases.md](./use_cases.md)

Backend process catalog (reference only — do not invent APIs): [`../linksharing-frontend-backend-map.md`](../linksharing-frontend-backend-map.md), [`../../src/modules/shared/link_session/API.md`](../../src/modules/shared/link_session/API.md).

---

## Dual-guard (definition)

1. Write client `session_id` / `docid` (and related keys) to **sessionStorage** and mirror into **`xmleditor:sessionbackup:{docid}`**.
2. Re-verify the **same** `session_id` is an **active** row in Mongo `rlinksharing` via **`POST getdocs`** (`API_GET_DOCS`).
3. Only then **redirect** (landing) or mark editor **Ready** and start **`CHECK_REQUEST`**.

### Active row

| Field | Required value |
|-------|----------------|
| `docstatus` | `"1"` (`LinkSessionCore.DOC_STATUS.ACTIVE`) |
| `session_end_time` | `"0"` |
| `session_id` | Matches client |

Implemented by `LinkSessionCore.isActiveSessionRecord(record, expected)`.

---

## Key symbols (impactweb)

| Symbol | Role | As implemented |
|--------|------|----------------|
| `LinkSessionCore.confirmSessionOnServer` | Shared getdocs dual-guard | [`LinkSessionCore.js`](../../src/modules/shared/link_session/LinkSessionCore.js) |
| `validateBeforeSave` | Alias → `confirmSessionOnServer` | Same file |
| `window.confirmLinkSessionOnServer` | Thin alias → core instance (do **not** duplicate body) | [`index.js`](../../src/js/index.js) + `installSessionGlobals` |
| `ensureLocalSessionEntry` | Optional localhost seed (`check`/`remarks:local`) — **not Ready** | [`localHostSession.js`](../../src/modules/shared/link_session/localHostSession.js) |
| `setItemsandReDirect` | Landing: `setSessionState` → verify → navigate | [`LandingPage.js`](../../src/js/dialogModules/LandingPage.js) (async) |
| `new_session_check` / `newSessionCheck` | Promise-based editor `check` / `refresh` | Core + stub in [`editor_page_events_fn.js`](../../src/js/editor_page_events_fn.js) |
| `InitialLoadDialog.validateSessionThenReady` | Gate Ready until check + getdocs ok | [`_initalLoadingDialog.js`](../../src/js/_initalLoadingDialog.js) |
| `LinkSessionCore.mapSaveValidationReason` | Save reason → `allow` / `postpone` / `stale` | Core static helper |
| `cleanupSessionStorageBackups` / `clearEditorTabId` | Clear backup + tab id on expire / verify fail | Core / globals |

---

## Do

- Fail **closed** on getdocs / gate errors (production **and** localhost Ready/seed).
- On **`IS_LOCAL_HOST`:** storage `session_id` → getdocs match proceed; else seed `process: check` with **`remarks: "local"`** → getdocs verify → only then Ready / `CHECK_REQUEST`. No transport fail-open.
- On verify fail or expired session: cleanup backup + clear tab id; do **not** start idle `CHECK_REQUEST`.
- Prefer one shared helper for landing + InitialLoadDialog + save path.
- Map save `request_error` / `getdocs_unavailable` → **postpone**, not stale redirect.
- Inventory every `skipVerify` / `canforceClose` call site in [DEV.md](./DEV.md).

## Do not

- Claim Ready / hide InitialLoadDialog before getdocs verify (or local seed+verify).
- Start `CHECK_REQUEST.Init()` before dual-guard passes.
- Bypass localhost Ready with empty DB row or on getdocs/seed transport errors.
- Keep calling `refresh` with a **closed** backup `session_id` without cleanup.
- Invent new `process` values — use existing linksharing catalog in [DEV.md](./DEV.md) / API.md.
- Add a duplicate `confirmLinkSessionOnServer` implementation body outside `LinkSessionCore`.

---

## Quick debug

1. Network: after grant / editor open, expect `linksharing` then `getdocs` with `tbl: linksharing`, `docstatus: "1"`, `session_end_time: "0"`.
2. **Localhost:** expect `linksharing` with `remarks: "local"` when seeding, then `getdocs`; overlay status `Seeding local session ...` before Ready.
3. Application → Local Storage → `xmleditor:sessionbackup:{docid}` should contain `xmleditor:sessionid:{docid}` on success.
4. Overlay status: `Validating session ...` / `Confirming session ...` / `Seeding local session ...` before Ready.
5. Console: `[LinkSessionGate]` / `[LinkSessionClose]` structured lines (`stage`, `docid`, `session_id`, `reason`, `ok`).
