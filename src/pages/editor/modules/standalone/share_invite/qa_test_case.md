# QA Test Cases: Share Invite

## Coverage Goal
Validate Share Invite UI behavior, recipient validation, and payload contract for single and multiple emails.

## Test Data Source
Use recipient samples in [src/modules/share_invite/test.json](src/modules/share_invite/test.json).

## Preconditions
1. User can open editor and Share Invite dialog.
2. API endpoints are reachable in selected environment.
3. Toast UI and dialog controls are visible.

## Functional Cases

### TC-SI-001: Open dialog
- Steps:
1. Open Share Invite dialog.
2. Observe input, subject, comments, share and cancel actions.
- Expected:
1. Dialog opens without console errors.
2. Share button is disabled by default.

### TC-SI-002: Add valid single email
- Steps:
1. Enter valid email.
2. Press Enter.
- Expected:
1. Recipient chip is created.
2. Share button becomes enabled.

### TC-SI-003: Add multiple emails by paste
- Steps:
1. Paste mixed comma and semicolon email list.
2. Click outside input to apply helper processing.
- Expected:
1. Valid emails are converted into chips.
2. Invalid entries are ignored or warned.

### TC-SI-004: Prevent self-email for non-admin
- Steps:
1. Enter logged-in user email.
2. Attempt to share.
- Expected:
1. Warning shown.
2. Share action is blocked.

### TC-SI-005: Recipient limit
- Steps:
1. Add recipients up to allowed limit.
2. Add one additional recipient.
- Expected:
1. Limit warning appears.
2. Extra recipient is not added.

### TC-SI-006: Remove recipient chip
- Steps:
1. Add at least three recipients.
2. Remove one recipient chip.
- Expected:
1. Chip count decreases.
2. Payload excludes removed recipient.

## Payload Contract Cases

### TC-SI-007: Verify payload for multi-email share
- Steps:
1. Stub share submit path to capture options and API payload.
2. Submit with two or more recipients.
- Expected:
1. emailtolist is comma-separated recipient string.
2. username is comma-separated recipient string.
3. emailto is recipient array.

### TC-SI-008: Verify no dependency on legacy recipient field
- Steps:
1. Run share flow with captured payload.
2. Inspect options object used by response handler.
- Expected:
1. Flow succeeds using new recipient fields.
2. No hard dependency on removed recipient field.

## Regression Cases

### TC-SI-009: Landing validation with multi-recipient link
- Steps:
1. Open landing with multi-recipient shared data.
2. Validate one of configured recipient emails.
- Expected:
1. User can proceed with valid selected email.
2. Selection is persisted correctly.

### TC-SI-010: Finalize fallback behavior
- Steps:
1. Execute finalize path after share.
2. Validate linkfrom resolution.
- Expected:
1. linkfrom uses emailtolist or emailto fallback correctly.

## Result Template
- Case ID:
- Environment:
- Build:
- Status: Pass or Fail
- Evidence: screenshot or log path
- Notes:
