import React from 'react';

const SidebarHeader = ({ dashboardType }) => {
  return (
    <div className="sidebar-header">
      <h2>IMPACT</h2>
      <p className="dashboard-type">
        {dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Dashboard
      </p>
    </div>
  );
};

export default SidebarHeader;
