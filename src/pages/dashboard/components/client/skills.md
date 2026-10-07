# client skills

Use when editing `src/features/dashboard/components/client/` (or related imports).

## Do
- Keep changes scoped to this folder's responsibility.
- Prefer reuse from shared charts/grid/layout when possible.
- Update this README key-files list when adding files.

## Do not
- Add route-level pages here — use `src/features/`.
- Introduce new session/API orchestration — use `src/services/`.

## Workflows
1. Change widgets carefully — used by client dashboard views.
2. Prefer shared charts/grid.
3. Long-term: relocate under `features/client` if ownership grows.

## Related
- Folder: [README.md](./README.md)
- Feature: [dashboard](../../README.md) · [skills](../../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../../docs/SKILLS_AND_WORKFLOWS.md)
