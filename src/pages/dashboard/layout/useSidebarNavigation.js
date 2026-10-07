import { startTransition, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/providers/AuthProvider';
import { dashboardMenuConfig } from '../config/dashboardMenuConfig';
import { filterMenuItemsByPermission } from '../utils/menuPermissions';

const useSidebarNavigation = (dashboardType, sidebarOpen, setSidebarOpen) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const [expandedMenuId, setExpandedMenuId] = useState(null);

  const menuItems = useMemo(() => {
    const items = dashboardMenuConfig[dashboardType] || [];
    return filterMenuItemsByPermission(items, { isAuthenticated, isAdmin });
  }, [dashboardType, isAuthenticated, isAdmin]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigation = (path) => {
    startTransition(() => {
      navigate(path);
    });
  };

  const handleMenuClick = (item) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    if (!hasSubItems) {
      handleNavigation(item.path);
      return;
    }

    if (!sidebarOpen) {
      setSidebarOpen(true);
      return;
    }

    setExpandedMenuId((current) => (current === item.id ? null : item.id));
  };

  return {
    expandedMenuId,
    menuItems,
    isActive,
    toggleSidebar,
    handleNavigation,
    handleMenuClick
  };
};

export default useSidebarNavigation;
