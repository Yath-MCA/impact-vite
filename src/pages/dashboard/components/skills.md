# dashboard skills

Use when editing `src/features/dashboard/components/` (or related imports).

## Do
- Keep changes scoped to this folder's responsibility.
- Prefer reuse from shared charts/grid/layout when possible.
- Update this README key-files list when adding files.

## Do not
- Add route-level pages here — use `src/features/`.
- Introduce new session/API orchestration — use `src/services/`.

## Workflows
1. Prefer feature layout/pages for composition.
2. Keep widgets dumb; data from dashboard hooks/context.
3. Update README when adding widgets.

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../docs/SKILLS_AND_WORKFLOWS.md)
