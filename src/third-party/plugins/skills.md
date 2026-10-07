# plugins skills

Use when editing `src/shared/plugins/`.

## Do
- Keep changes in this folder's responsibility.
- Update this README key-files list when adding important files.
- Prefer feature-MVC placement rules in `docs/FEATURE_MVC_STRUCTURE.md`.

## Do not
- Invent parallel ownership in another tree without documenting status.
- Break stable routes (`/validateurl`, `/editor`, `/login`, `/config-manager`).

## Workflows
1. Prefer official packages directly unless a wrapper adds real value.
2. Document wrapper behavior in folder README when non-obvious.
3. See docs/PLUGINS_README.md for broader notes.

## Related
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../docs/SKILLS_AND_WORKFLOWS.md)
- [src/README.md](../../README.md)
