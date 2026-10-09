# LinkSession Request Module

Editor incoming-request dialog (`LinkSessionRequestDialog`).

**Full docs:** [README.md](./README.md) · [MODULES.md](../link_session/MODULES.md)

## Registration

`module_main.js` — `LinkSessionRequestModule`, depends on `LinkSessionService`.

Load before `CHECK_REQUEST.Init()` completes; `openRequestDialog` retries until registered.

Editor open after Init: `window.new_session_check()` is owned by `LinkSessionCore` (`installSessionGlobals`), not `editor_page_events_fn.js`.

## Methods

- `request_dialog()` — show accept/reject dialog
- `showLoop()` — mark request active, start 1s countdown and 30s auto-accept timeout
- `handleConfirmDialog` — accept/reject via `LinkSessionService.getInstance().getJsonOrBuild`
- `handleDialogAutoAccept` — clear timers, docstatus `3` after timeout
- `clearRequestDialogTimers()` — clear countdown/timeout and active flag

## Globals

- `window.LinkSessionRequestDialog` (alias: deprecated `LinkShareDialog`)
- `window.LinkSessionPorts.request`
- `window.confirmok`

## DOM

Template id: `LinkSessionRequestDialog` — not legacy `LinkShareDialog`.

## Clash guard

Request dialog is blocked while idle alert is active. Idle alert is skipped while this dialog is active and will be checked again on a later `15000ms` LinkSession scheduler tick.
