# Share Invite Module

## Purpose
The Share Invite module lets users share document access through email and invite one or more recipients.

## Location
- [src/modules/share_invite/index.js](src/modules/share_invite/index.js)
- [src/modules/share_invite/context.js](src/modules/share_invite/context.js)
- [src/modules/share_invite/template.html](src/modules/share_invite/template.html)
- [src/modules/share_invite/test.json](src/modules/share_invite/test.json)

## Core Flow
1. User opens Share and Invite dialog.
2. User adds one or more email recipients.
3. Input helper validates, deduplicates, and enforces recipient limit.
4. Module builds request payload.
5. Payload is sent to shareandinvite API.
6. UI shows success or warning based on response.

## Payload Contract
Current payload fields for recipients:
- emailtolist: comma-separated recipient emails
- username: comma-separated recipient emails
- emailto: array of recipient emails

Example shape:
- emailtolist: sivakumars@company.co,srinivasa.prabhu@company.co
- username: sivakumars@company.co,srinivasa.prabhu@company.co
- emailto: [sivakumars@company.co, srinivasa.prabhu@company.co]

## Important Behaviors
- Self-email validation for non-admin users.
- Max recipient cap enforced by email input helper.
- Supports pasted mixed input with commas and semicolons.
- Co-role metadata is included for role-based sharing.

## Dependency Notes
- Uses global USER_INFO, SHARED_KEY, ROLE_IDS, GET_JSON.
- Uses FetchService for API request.
- Uses emailInputHelper for recipient chip handling.

## Maintenance Checklist
1. Keep recipient contract consistent across legacy and module implementations.
2. Update tests when payload fields change.
3. Verify landing flow still handles multi-recipient emailto array.
4. Re-check finalize path fallback logic for emailtolist or emailto.
