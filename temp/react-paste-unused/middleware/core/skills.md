# core skills

Use when editing `src/services/core/`.

## Do
- Keep changes in this folder's responsibility.
- Update this README key-files list when adding important files.
- Prefer feature-MVC placement rules in `docs/FEATURE_MVC_STRUCTURE.md`.

## Do not
- Invent parallel ownership in another tree without documenting status.
- Break stable routes (`/validateurl`, `/editor`, `/login`, `/config-manager`).

## Workflows
1. Align session commit keys with `editorSessionStorage.js`/`shareKeyEntry.js`.
2. Prefer ES modules imports over new window globals.
3. Coordinate with features/editor bootstrap (`editorEntry.js`/`useEditorEntry.js`).

## Archived
- The jQuery-era `InitService`/`EditorInitService`/`SharedKeyService`/`StorageService`/`URLService`/`LoadingService`/`SessionGuard` classes and `services/bridge/GlobalBridge.js` were unused by the live app (never instantiated outside each other) and were moved to `temp/legacy/` on 2026-09-08.

## Related
- Parent: [../README.md](../README.md) · [../skills.md](../skills.md)
- Index: [docs/SKILLS_AND_WORKFLOWS.md](../../../docs/SKILLS_AND_WORKFLOWS.md)
