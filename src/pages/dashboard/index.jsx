// Canonical dashboard entry: shell + page.config + styles live under this folder.
import './styles.css';

export { default as DashboardShell } from './shell/DashboardShell';
export { default as DashboardSidebar } from './layout/DashboardSidebar';
export { default as DashboardHome } from './pages/DashboardHome';
export { DashboardProvider, useDashboard } from './context/DashboardContext';
export { default as DashboardContext } from './context/DashboardContext';
export {
  dashboardMenuConfig,
  getDashboardTypeFromPath,
  getDefaultPathForDashboardType,
} from './config/dashboardMenuConfig';
