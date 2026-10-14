# Developer Guide: Share Invite

## Scope
This guide is for implementing and debugging Share Invite behavior in the module path.

## Main Files
- [src/modules/share_invite/index.js](src/modules/share_invite/index.js)
- [src/modules/share_invite/context.js](src/modules/share_invite/context.js)
- [src/modules/share_invite/template.html](src/modules/share_invite/template.html)
- [src/js/dialogModules/jsx/ShareInvite_Module.jsx](src/js/dialogModules/jsx/ShareInvite_Module.jsx)

## Local Workflow
1. Open Share Invite dialog from editor.
2. Add recipients using keyboard and paste paths.
3. Intercept payload before API call when debugging.
4. Validate response handling and dialog close behavior.

## Key Methods
- fire: Builds outbound options and triggers share request.
- SHARE_DOCUMENT: Maps options into API payload.
- SHARE_DOC_RESPONSE: Handles share response and post-action UI.
- _collectToEmails: Collects recipient list from helper.

## Debug Tips
1. Check recipient list after flushInput in fire.
2. Log normalized emails before payload mapping.
3. Validate rolebase branch for co-role metadata.
4. Confirm landing supports emailto as array.

## Common Pitfalls
- Stale contract fields used in one code path only.
- UI enabled state does not match helper state.
- Local host behavior differs from shared environments.
- E2E instability due to overlays intercepting clicks.

## Recommended Checks Before Merge
1. Contract fields present: emailtolist, username, emailto.
2. No dependency on removed recipient fields.
3. Legacy and module implementations aligned.
4. Targeted e2e case updated and passing or justified.

## Change Log Template
- Date:
- Change:
- Files:
- Risk:
- Test Evidence:
