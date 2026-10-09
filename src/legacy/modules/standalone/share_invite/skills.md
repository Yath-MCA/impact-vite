# Share Invite Skills Matrix

## Objective
Define the practical skills needed to maintain, test, and release Share Invite changes safely.

## Skill Areas

| Area | Required Skill | Level | Owner |
| --- | --- | --- | --- |
| Frontend JS | Event handling, DOM updates, module lifecycle | Intermediate | Feature Developer |
| Validation | Email parsing, dedupe, recipient limits | Intermediate | Feature Developer |
| API Contract | Request payload shaping and compatibility | Intermediate | Feature Developer |
| QA Automation | Playwright test updates and assertions | Intermediate | QA Automation Engineer |
| Workflow Knowledge | Author and co-author sharing behavior | Intermediate | BA or Product QA |
| Regression Analysis | Landing and finalize integration checks | Advanced | Senior QA |

## Role Guidance

### Developer
- Understand share payload construction in [src/modules/share_invite/index.js](src/modules/share_invite/index.js).
- Keep contract aligned with legacy implementation if still active.
- Validate behavior with both single and multi-email input.

### QA Engineer
- Verify dialog behavior with typing, paste, remove, and overflow.
- Verify payload includes emailtolist, username, and emailto array.
- Run integration checks for landing validation and signoff workflows.

### Reviewer
- Confirm no regression in button enable and validation states.
- Confirm no stale references to removed payload fields.
- Confirm tests cover happy path and negative path.

## Onboarding Checklist
1. Read [src/modules/share_invite/readme.md](src/modules/share_invite/readme.md).
2. Review sample test data in [src/modules/share_invite/test.json](src/modules/share_invite/test.json).
3. Walk through updated e2e test in [tests/e2e/land-editor/landing-to-editor6-shareinvite.spec.js](tests/e2e/land-editor/landing-to-editor6-shareinvite.spec.js).
4. Run targeted test and inspect payload in browser runtime interception.
