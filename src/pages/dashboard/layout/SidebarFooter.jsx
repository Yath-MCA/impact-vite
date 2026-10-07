import React from 'react';
import { FiUsers } from 'react-icons/fi';

const SidebarFooter = ({ dashboardType }) => {
  return (
    <div className="sidebar-footer">
      <div className="user-info">
        <div className="user-avatar">
          <FiUsers />
        </div>
        <div className="user-details">
          <div className="user-name">Admin User</div>
          <div className="user-role">{dashboardType}</div>
        </div>
      </div>
    </div>
  );
};

export default SidebarFooter;
