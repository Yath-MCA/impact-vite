// Dashboard Feature Module
// This file exports all dashboard-related components and utilities

// Layout Components
export { default as DashboardLayout } from './layout/DashboardLayout';
export { default as DashboardSidebar } from './layout/DashboardSidebar';

// Pages
export { default as AdminDashboard } from './pages/AdminDashboard';
export { default as ClientDashboard } from './pages/ClientDashboard';
export { default as DevDashboard } from './pages/DevDashboard';
export { default as DocDashboard } from './pages/DocDashboard';

// Components
export { default as StatsCards } from './components/StatsCards';
export { default as ActivityChart } from './components/ActivityChart';
export { default as QueryChart } from './components/QueryChart';
export { default as RecentDocumentsGrid } from './components/RecentDocumentsGrid';
export { default as Notifications } from './components/Notifications';
export { default as ClientManagementGrid } from './components/admin/ClientManagementGrid';
export { default as ProjectGrid } from './components/admin/ProjectGrid';
export { default as SystemMetrics } from './components/admin/SystemMetrics';
export { default as UserManagementGrid } from './components/admin/UserManagementGrid';
export { default as ArticleStatusChart } from './components/client/ArticleStatusChart';
export { default as ArticlesGrid } from './components/client/ArticlesGrid';
export { default as ProductionOverview } from './components/client/ProductionOverview';
export { default as QueriesReport } from './components/client/QueriesReport';

// Context
export { DashboardProvider, useDashboard } from './context/DashboardContext';
export { default as DashboardContext } from './context/DashboardContext';

// Configuration
export { 
  dashboardMenuConfig, 
  getDashboardTypeFromPath, 
  getDefaultPathForDashboardType 
} from './config/dashboardMenuConfig';

// Routes
export { default as DashboardRoutes } from './routes/dashboardRoutes';

// Hooks
export { default as useDashboard } from './hooks/useDashboard';
