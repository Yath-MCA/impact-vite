# Quarantined React paste (unused in Phase 1–3)

Moved here after login + dashboard shell wiring passed unit/e2e/build.
Do **not** delete; restore with `git mv` when needed (e.g. AG Grid Phase 4).

## Inventory

| Path | Why quarantined |
|------|-----------------|
| `landing/` | Not mounted in hash router for this slice |
| `dashboard/reports/` | Not imported by DashboardShell |
| `dashboard/config-manager/` | Not imported by DashboardShell |
| `dashboard/doc-finder/` | DocsGrid/AG Grid deferred |
| `dashboard/doc-dashboard/` | Not mounted |
| `dashboard/activity/` | Not mounted |
| `dashboard/migrationStatus/` | Not mounted |
| `dashboard/components/` | AG Grid grids deferred |
| `dashboard/routes/` | Replaced by DashboardShell routes |
| `dashboard/pages/Admin|Client|Dev|DocDashboard.jsx` | Shell uses DashboardHome only |
| `dashboard/layout/DashboardLayout.jsx` | Shell uses custom chrome without DocsGrid |
| `dashboard/layout/DashboardHeader.jsx` | Replaced by DashboardShellHeader (no getDocs) |
| `middleware/layout/` | Not used by shell |
| `middleware/error/` | Not wired in ReactApp yet |
| `middleware/ClientProvider.jsx` | Only used by landing |
| `components/` | EmailChipsInput unused |
| `third-party/` | Not imported by live path |

## Kept live (not moved)

- `src/middleware/providers/apiService.js`, `AuthProvider.jsx`
- `src/pages/auth`, `src/pages/dashboard/shell`, sidebar layout pieces, context, config, utils, hooks
- `src/app`, `src/core`, `src/shared/documentHead*`, home HTML path
