import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const location = useLocation();
  const [dashboardType, setDashboardType] = useState('admin');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect dashboard type from URL
  useEffect(() => {
    const path = location.pathname;

    if (path.includes('/dashboard/admin')) {
      setDashboardType('admin');
    } else if (path.includes('/dashboard/dev')) {
      setDashboardType('developer');
    } else if (path.includes('/doc-dashboard')) {
      setDashboardType('document');
    } else if (path.includes('/dashboard/')) {
      setDashboardType('admin');
    } else {
      // Default to admin dashboard
      setDashboardType('admin');
    }
  }, [location.pathname]);

  // Load user permissions (mock implementation)
  useEffect(() => {
    const loadUserPermissions = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call
        const mockPermissions = {
          admin: ['read', 'write', 'delete', 'manage_users', 'manage_config'],
          developer: ['read', 'write', 'debug', 'view_logs'],
          document: ['read', 'write', 'upload', 'download']
        };

        setUserPermissions(mockPermissions[dashboardType] || []);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        setUserPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserPermissions();
  }, [dashboardType]);

  const hasPermission = (permission) => {
    return userPermissions.includes(permission);
  };

  const canAccessMenu = (menuItem) => {
    if (!menuItem.permissions || menuItem.permissions.length === 0) {
      return true;
    }

    return menuItem.permissions.some(permission => hasPermission(permission));
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const value = {
    dashboardType,
    setDashboardType,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    userPermissions,
    setUserPermissions,
    hasPermission,
    canAccessMenu,
    loading,
    rowData,
    setRowData,
    fetchLoading,
    setFetchLoading
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default DashboardContext;
