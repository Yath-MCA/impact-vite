# grid skills

Use when editing `src/features/dashboard/components/grid/` (or related imports).

## Do
- Keep changes scoped to this folder's responsibility.
- Prefer reuse from shared charts/grid/layout when possible.
- Update this README key-files list when adding files.

## Do not
- Add route-level pages here — use `src/features/`.
- Introduce new session/API orchestration — use `src/services/`.

## Workflows
1. Keep wrapper config centralized.
2. Feature/grids pass column defs + row data.
3. Avoid duplicating AgGrid setup elsewhere.

## Related
- Folder: [README.md](./README.md)
- Dashboard components: [README.md](../README.md) · [skills](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../../docs/SKILLS_AND_WORKFLOWS.md)
