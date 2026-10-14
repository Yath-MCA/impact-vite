# LinkSession Send Module (Level 1)

**Priority:** P0 — any defect in this flow is a Level 1 ticket.

**Full docs:** [README.md](./README.md) · [MODULES.md](../link_session/MODULES.md)

## Flow

1. `handleCheckResponse` → `r:0` → `delegateSendPrompt`
2. `LinkSessionSendModule.prompt` → `Land_Page_Send_Req`
3. Confirm → `sendAccessRequest` (branch by `requeststatus`)
4. Success → `handleUpdateReqId` → `showPollWaiting` (45s Swal)
5. Timer → `pollRequestStatus` → `completeAccessGrant`

## Bundle

Landing gulp only: `session_landing.js` (includes send module) → `landing.js`

## Ports

`buildLandingSessionContext().ui.sendPrompt` / `showPollWaiting` — must not call `delegateSendPrompt` (use `LinkSessionSendModule` or `onRequestError`).

## On failure

Missing `AlertNewDialog` or service → `ctx.onRequestError` → `Invalid_Alertfn('Land_Page_TRY_AGAIN_1')`.
