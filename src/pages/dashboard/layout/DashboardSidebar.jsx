import React, { useContext } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import DashboardContext from '../context/DashboardContext';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import SidebarNav from './SidebarNav';
import useSidebarNavigation from './useSidebarNavigation';
import './DashboardSidebar.css';

const DashboardSidebar = () => {
  const { dashboardType, sidebarOpen, setSidebarOpen } = useContext(DashboardContext);
  const {
    expandedMenuId,
    menuItems,
    isActive,
    toggleSidebar,
    handleNavigation,
    handleMenuClick
  } = useSidebarNavigation(dashboardType, sidebarOpen, setSidebarOpen);

  return (
    <>
      <button
        className="sidebar-toggle mobile"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      <button
        className={`sidebar-toggle desktop-floating ${sidebarOpen ? 'shifted' : ''}`}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />}

      <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <SidebarHeader dashboardType={dashboardType} />
        <SidebarNav
          menuItems={menuItems}
          sidebarOpen={sidebarOpen}
          expandedMenuId={expandedMenuId}
          isActive={isActive}
          onMenuClick={handleMenuClick}
          onNavigate={handleNavigation}
        />
        <SidebarFooter dashboardType={dashboardType} />
      </div>
    </>
  );
};

export default DashboardSidebar;
