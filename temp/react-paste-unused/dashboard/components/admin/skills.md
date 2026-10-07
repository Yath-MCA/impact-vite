# admin skills

Use when editing `src/features/dashboard/components/admin/` (or related imports).

## Do
- Keep changes scoped to this folder's responsibility.
- Prefer reuse from shared charts/grid/layout when possible.
- Update this README key-files list when adding files.

## Do not
- Add route-level pages here — use `src/features/`.
- Introduce new session/API orchestration — use `src/services/`.

## Workflows
1. Extend an existing grid or metrics widget.
2. Wire columns/actions to existing API helpers.
3. Smoke-test from admin dashboard routes.
4. Document new exports here.

## Related
- Folder: [README.md](./README.md)
- Feature: [dashboard](../../README.md) · [skills](../../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../../docs/SKILLS_AND_WORKFLOWS.md)
