// Dashboard feature exports for the wired shell (Phase 3).
// Heavier pasted modules live under temp/react-paste-unused/dashboard/.

export { default as DashboardSidebar } from './layout/DashboardSidebar';
export { default as DashboardHome } from './pages/DashboardHome';
export { default as DashboardShell } from './shell/DashboardShell';
export { DashboardProvider, useDashboard } from './context/DashboardContext';
export { default as DashboardContext } from './context/DashboardContext';
export {
  dashboardMenuConfig,
  getDashboardTypeFromPath,
  getDefaultPathForDashboardType,
} from './config/dashboardMenuConfig';
