import React, { useState, useEffect, useRef } from 'react';
// Font Awesome Icons
import { FaBuilding, FaIndent } from 'react-icons/fa';
import {
  FiSettings,
  FiHome,

  FiBook,
  FiPlus,
  FiCode,
  FiRefreshCw,
  FiCheckCircle,
  FiMenu,
  FiX,
  FiSearch,
  FiDownload,
  FiUser,
  FiChevronDown,
  FiGrid,
  FiList
} from 'react-icons/fi';
import { LuGitCompare } from 'react-icons/lu';

import ConfigList from './ConfigList';
import ConfigEditor from './ConfigEditor';
import ConfigHistory from './ConfigHistory';
import CapabilityCatalogAdmin from './CapabilityCatalogAdmin.jsx';
import { fetchConfigXml } from './fetchConfigXml';
import './ConfigManager.css';

const ConfigManagerPage = () => {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    return new URLSearchParams(window.location.search).get('view') || 'dashboard';
  });
  const cancelledRef = useRef(false);
  const [sidebarMode, setSidebarMode] = useState('full');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalJournals: 0,
    recentChanges: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: 'Admin User',
    email: 'admin@impact.com',
    role: 'superadmin'
  });

  // Configuration paths (mirroring the vanilla implementation)
  const CONFIG_PATHS = {
    journals: {
      lww: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/lww/config.xml`,
      oup: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/oup/config.xml`,
      plos: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/plos/config.xml`,
      medknow: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/medknow/config.xml`,
      brill: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/brill/config.xml`,
      tnfjournals: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/tnfjournals/config.xml`,
      acs: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/acs/config.xml`,
      intellect: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/intellect/config.xml`,
      nihr: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/journals/nihr/config.xml`,
    },
    books: {
      oso: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/oso/config.xml`,
      tnf: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/tnf/config.xml`,
      oho: `assets/${import.meta.env.VITE_APP_VERSION || 'v1.0'}/config/books/oho/config.xml`
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'client-list', label: 'Client Configurations', icon: FaBuilding },
    { id: 'journal-list', label: 'Journal Configurations', icon: FiBook },
    { id: 'create-new', label: 'Create New Config', icon: FiPlus },
    { id: 'xml-editor', label: 'XML Editor', icon: FiCode },
    { id: 'capability-catalog', label: 'Capability Catalog', icon: FiGrid },
    { id: 'compare', label: 'Compare Configs', icon: LuGitCompare },
    { id: 'history', label: 'Change History', icon: FiRefreshCw },
    { id: 'validation', label: 'Validate XML', icon: FiCheckCircle }
  ];

  useEffect(() => {
    cancelledRef.current = false;
    loadDashboardData();
    loadUserProfile();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - replace with actual API calls
      const totalClients = Object.keys(CONFIG_PATHS.journals).length + Object.keys(CONFIG_PATHS.books).length;

      // Fetch journal counts from each client's XML
      let totalJournals = 0;
      for (const [clientId, path] of Object.entries(CONFIG_PATHS.journals)) {
        if (cancelledRef.current) return;
        try {
          const response = await fetchConfigXml(path);
          if (response.ok) {
            const xmlText = response.text;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const journals = xmlDoc.querySelectorAll('listofjournals > journal');
            totalJournals += journals.length;
          }
        } catch (error) {
          console.warn(`Error fetching ${clientId}:`, error);
        }
      }

      if (cancelledRef.current) return;

      setStats({
        totalClients,
        totalJournals,
        recentChanges: 5 // Mock data
      });

      // Mock recent activity
      setRecentActivity([
        {
          action: 'Created',
          file: 'lww/EJGH',
          user: 'John Doe',
          time: '2 hours ago'
        },
        {
          action: 'Modified',
          file: 'oup/OSO',
          user: 'Jane Smith',
          time: '4 hours ago'
        },
        {
          action: 'Validated',
          file: 'plos/PLOS',
          user: 'Bob Johnson',
          time: '6 hours ago'
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const loadUserProfile = () => {
    // Load user profile from localStorage or API
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  };

  const toggleSidebarMode = () => {
    const newMode = sidebarMode === 'full' ? 'icons' : 'full';
    setSidebarMode(newMode);
    localStorage.setItem('configManager:sidebarMode', newMode);
  };

  const filteredSidebarItems = sidebarItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return renderDashboard();
      case 'client-list':
        return <ConfigList type="clients" />;
      case 'journal-list':
        return <ConfigList type="journals" />;
      case 'xml-editor':
        return <ConfigEditor />;
      case 'capability-catalog':
        return <CapabilityCatalogAdmin />;
      case 'history':
        return <ConfigHistory />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-view">
      <h2 className="mb-4">Configuration Dashboard</h2>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stats-card clients">
            <FaBuilding className="stats-icon" />
            <h3>{stats.totalClients}</h3>
            <p>Total Clients</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card journals">
            <FiBook className="stats-icon" />
            <h3>{stats.totalJournals}</h3>
            <p>Total Journals</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card changes">
            <FiRefreshCw className="stats-icon" />
            <h3>{stats.recentChanges}</h3>
            <p>Recent Changes</p>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <FiRefreshCw className="me-2" />
              Recent Activity
            </div>
            <div className="card-body">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div>
                      <strong>{activity.action}</strong> {activity.file}
                      <br />
                      <small className="text-muted">by {activity.user}</small>
                    </div>
                    <small className="text-muted">{activity.time}</small>
                  </div>
                ))
              ) : (
                <p className="text-muted">No recent activity</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <FiSettings className="me-2" />
              Quick Actions
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => React.startTransition(() => setActiveView('create-new'))}
                >
                  <FiPlus className="me-2" />
                  Create New Configuration
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => React.startTransition(() => setActiveView('xml-editor'))}
                >
                  <FiCode className="me-2" />
                  Edit Existing Config
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => React.startTransition(() => setActiveView('validation'))}
                >
                  <FiCheckCircle className="me-2" />
                  Validate Configuration
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {/* Export functionality */ }}
                >
                  <FiDownload className="me-2" />
                  Export All Configs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getUserInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="config-manager">
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      <div className="main-container">
        {/* Header */}
        <div className="header">
          <div>
            <h1>
              <FiSettings className="me-2" />
              Configuration Manager
            </h1>
            <p className="mb-0">Manage Client & Journal Configurations</p>
          </div>
          <div className="header-right">
            {/* User Profile */}
            <div className="profile-pill">
              <div className="profile-avatar">
                {getUserInitials(userProfile.name)}
              </div>
              <div className="profile-meta">
                <div className="profile-name">{userProfile.name}</div>
                <div className="profile-role">{userProfile.role}</div>
              </div>
            </div>

            {/* Sidebar Mode Toggle */}
            <button
              className="btn btn-light btn-sm ms-3"
              onClick={toggleSidebarMode}
            >
              {sidebarMode === 'full' ? <FiGrid /> : <FiList />}
              {sidebarMode === 'full' ? 'Icons' : 'Full'} Mode
            </button>

            {/* Refresh Button */}
            <button
              className="btn btn-warning btn-sm ms-2"
              onClick={loadDashboardData}
            >
              <FiRefreshCw className="me-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span>Dashboard</span>
          <span className="separator">/</span>
          <span className="current">
            {sidebarItems.find(item => item.id === activeView)?.label || 'Configuration Manager'}
          </span>
        </div>

        <div className={`content-layout ${sidebarMode === 'icons' ? 'sidebar-icons' : ''}`}>
          {/* Sidebar */}
          <div className="sidebar">
            {sidebarMode === 'full' && (
              <div className="sidebar-search">
                <div className="search-box">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search configs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            {filteredSidebarItems.map(item => (
              <div
                key={item.id}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => React.startTransition(() => setActiveView(item.id))}
              >
                <item.icon className="sidebar-icon" />
                {sidebarMode === 'full' && (
                  <span className="sidebar-label">{item.label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="content-area">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigManagerPage;
