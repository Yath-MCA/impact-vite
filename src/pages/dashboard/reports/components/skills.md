# reports skills

Use when editing `src/features/dashboard/reports/components/` (or related imports).

## Do
- Keep changes scoped to this folder's responsibility.
- Prefer reuse from shared charts/grid/layout when possible.
- Update this README key-files list when adding files.

## Do not
- Add route-level pages here — use `src/features/`.
- Introduce new session/API orchestration — use `src/services/`.

## Workflows
1. Prefer dashboard/shared widgets here.
2. Keep full report pages in `features/dashboard/reports/pages`.
3. Do not move dashboard report UI back to top-level `components/`.

## Related
- Folder: [README.md](./README.md)
- Feature: [reports](../README.md) · [skills](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../../docs/SKILLS_AND_WORKFLOWS.md)
