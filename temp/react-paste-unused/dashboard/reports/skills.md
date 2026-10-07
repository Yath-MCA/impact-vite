# reports skills

Use when editing `src/features/dashboard/reports/`.

## Do
- Keep screens focused; reuse `src/components` widgets.
- Register overlays via ModuleRegistry when used in editor overlays.
- Update key files in README when adding screens.

## Do not
- Add new primary app routes without dashboard route planning.
- Bypass ModuleManager when the UI is meant as an editor overlay.

## Workflows
1. Add a new report screen file here + registry entry.
2. Reuse components/reports filters/charts/grid.
3. When promoting to feature, move pages and keep shared widgets.
4. Smoke-test each failure report view.

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../docs/SKILLS_AND_WORKFLOWS.md)
