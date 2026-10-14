# session skills

Use when editing `src/services/session/`.

## Do
- Keep changes in this folder's responsibility.
- Update this README key-files list when adding important files.
- Prefer feature-MVC placement rules in `docs/FEATURE_MVC_STRUCTURE.md`.

## Do not
- Invent parallel ownership in another tree without documenting status.
- Break stable routes (`/validateurl`, `/editor`, `/login`, `/config-manager`).

## Workflows
1. Change process/status constants in sessionConstants.
2. Storage read/commit lives in `services/core/editorSessionStorage.js`, not here -- keep this folder to verify/idle-timeout/send-receive only.
3. Config via window.ENV / VITE_.
4. Classify check r==0 with sessionCheckClassify before treating it as a conflict.
5. Cover branches in `tests/unit/session/` (storage/shareKey/user-info/entry tests live in `tests/unit/core/`).

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../docs/SKILLS_AND_WORKFLOWS.md)
