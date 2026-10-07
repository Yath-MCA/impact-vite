# Quarantined React / legacy paste (unused)

Moved here after login + dashboard shell wiring. Do **not** delete; restore when needed (e.g. AG Grid Phase 4).

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
| `dashboard/hooks/` | Not imported by live shell |
| `dashboard/pages/*` (role dashboards) | Shell uses DashboardHome only |
| `dashboard/layout/*` (old Layout/Header) | Live layout stays under `src/pages/dashboard/layout/` |
| `home/index.css`, `home/index.js` | BizLand CSS replaced by Tailwind home HTML |
| `middleware/layout/` | Not used by shell |
| `middleware/error/` | Not wired in ReactApp yet |
| `middleware/ClientProvider.jsx` | Only used by landing |
| `components/` | Unused shared widgets |
| `third-party/` | Not imported by live path |

## Kept live (not moved)

- `src/pages/login/` — `Login.jsx` + `page.config.js` + `styles.css`
- `src/pages/dashboard/` — entry barrel, `page.config.js`, `styles.css`, shell, layout, context, config, utils, DashboardHome
- `src/pages/home/` — HTML + `page.config.js` (Tailwind via `src/styles/app.css`)
- `src/middleware/providers/`, `src/app`, `src/core`, document-head helpers
