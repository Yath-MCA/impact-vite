import { useDashboard as useDashboardContext } from '../context/DashboardContext';
import { dashboardMenuConfig } from '../config/dashboardMenuConfig';

// Custom hook for dashboard-specific functionality
export const useDashboard = () => {
  const dashboardContext = useDashboardContext();

  // Get menu items for current dashboard type
  const getMenuItems = () => {
    return dashboardMenuConfig[dashboardContext.dashboardType] || [];
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    return dashboardContext.hasPermission(permission);
  };

  // Check if user can access specific menu item
  const canAccessMenuItem = (menuItem) => {
    if (!menuItem.permissions || menuItem.permissions.length === 0) {
      return true;
    }
    
    return menuItem.permissions.some(permission => hasPermission(permission));
  };

  // Get filtered menu items based on permissions
  const getAccessibleMenuItems = () => {
    const allItems = getMenuItems();
    
    return allItems.map(item => {
      if (item.subItems && item.subItems.length > 0) {
        const accessibleSubItems = item.subItems.filter(subItem => 
          canAccessMenuItem(subItem)
        );
        
        return {
          ...item,
          subItems: accessibleSubItems
        };
      }
      
      return item;
    }).filter(item => canAccessMenuItem(item));
  };

  // Get dashboard statistics (mock implementation)
  const getDashboardStats = async () => {
    // TODO: Replace with actual API calls
    const mockStats = {
      admin: {
        totalDocuments: 1250,
        activeUsers: 45,
        systemHealth: 'Good',
        recentActivity: 23
      },
      developer: {
        totalPackages: 89,
        successRate: 94.5,
        errorsToday: 3,
        debugSessions: 12
      },
      document: {
        myDocuments: 45,
        sharedWithMe: 12,
        recentUploads: 8,
        downloads: 156
      }
    };

    return mockStats[dashboardContext.dashboardType] || {};
  };

  // Get recent activity (mock implementation)
  const getRecentActivity = async () => {
    // TODO: Replace with actual API calls
    const mockActivity = [
      {
        id: 1,
        type: 'document_created',
        message: 'New document "Q1 Report" created',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        user: 'John Doe'
      },
      {
        id: 2,
        type: 'config_updated',
        message: 'Configuration updated for client LWW',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user: 'Jane Smith'
      },
      {
        id: 3,
        type: 'error_resolved',
        message: 'XML validation error resolved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        user: 'Bob Johnson'
      }
    ];

    return mockActivity;
  };

  // Navigate to specific dashboard
  const navigateToDashboard = (dashboardType) => {
    const paths = {
      admin: '/dashboard/admin',
      developer: '/dashboard/dev',
      document: '/doc-dashboard'
    };
    
    return paths[dashboardType] || '/dashboard/admin';
  };

  // Format dashboard type for display
  const formatDashboardType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return {
    ...dashboardContext,
    getMenuItems,
    getAccessibleMenuItems,
    hasPermission,
    canAccessMenuItem,
    getDashboardStats,
    getRecentActivity,
    navigateToDashboard,
    formatDashboardType
  };
};

export default useDashboard;
