# activity skills

Use when editing `src/features/dashboard/activity/`.

## Do
- Keep screens focused; reuse `src/components` widgets.
- Register overlays via ModuleRegistry when used in editor overlays.
- Update key files in README when adding screens.

## Do not
- Add new primary app routes without dashboard route planning.
- Bypass ModuleManager when the UI is meant as an editor overlay.

## Workflows
1. Update UserActivity UI/data wiring.
2. Ensure registry id remains stable if referenced.
3. Keep dashboard-related activity code under `features/dashboard/activity`.

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../../docs/SKILLS_AND_WORKFLOWS.md)
