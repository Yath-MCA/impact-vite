import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

const SidebarNav = ({
  menuItems,
  sidebarOpen,
  expandedMenuId,
  isActive,
  onMenuClick,
  onNavigate
}) => {
  return (
    <nav className="sidebar-nav">
      {menuItems.map((item, index) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedMenuId === item.id;
        const active = isActive(item.path);

        return (
          <div key={item.id || index} className="menu-item">
            <div
              className={`menu-link ${active ? 'active' : ''}`}
              onClick={() => onMenuClick(item)}
              title={!sidebarOpen ? item.label : ''}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onMenuClick(item);
                }
              }}
            >
              <div className="menu-content">
                <item.icon className="menu-icon" />
                <span className="menu-label">{item.label}</span>
              </div>
              {hasSubItems && (
                <FiChevronDown className={`menu-chevron ${isExpanded ? 'expanded' : ''}`} />
              )}
            </div>

            {hasSubItems && isExpanded && sidebarOpen && (
              <div className="submenu">
                {item.subItems.map((subItem, subIndex) => (
                  <div
                    key={`${item.id}-sub-${subIndex}`}
                    className={`submenu-item ${isActive(subItem.path) ? 'active' : ''}`}
                    onClick={() => onNavigate(subItem.path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onNavigate(subItem.path);
                      }
                    }}
                  >
                    <subItem.icon className="submenu-icon" />
                    <span className="submenu-label">{subItem.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarNav;
