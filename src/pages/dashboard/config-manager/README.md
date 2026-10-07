# config-manager

## Purpose / ownership
Config Manager feature (canonical). The old `components/ConfigManager` facade has been retired.

## Key files
- `ConfigManagerPage.jsx`
- `ConfigList.jsx`
- `ConfigEditor.jsx`
- `ConfigHistory.jsx`
- `index.js`

## Dependencies
Protected admin routes; dashboard nest route optional.

## Status
**active**

Capability catalog CRUD is at `/dashboard/admin/capability-catalog`. `/config-manager?view=capability-catalog` stays an alias. Dev steps: `docs/dev/capability-catalog.md`.
