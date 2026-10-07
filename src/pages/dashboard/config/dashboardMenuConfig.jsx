import {
  FiHome,
  FiFile,
  FiSettings,
  FiBarChart2,
  FiRefreshCw,
  FiBook,
  FiDatabase,
  FiGitBranch,
  FiShield,
  FiUsers,
  FiActivity,
  FiFolder,
  FiEdit3,
  FiCheckSquare,
  FiTrendingUp,
  FiDownload,
  FiUpload,
  FiCpu,
  FiAlertTriangle,
  FiGitPullRequest
} from 'react-icons/fi';

export const dashboardMenuConfig = {
  admin: [
    {
      id: 'overview',
      label: 'Overview',
      path: '/dashboard/admin',
      onClick: () => { window.location.href = '/dashboard/admin'; },
      icon: FiHome,
      permissions: ['read']
    },
    {
      id: 'documents',
      label: 'Documents',
      path: '/doc-dashboard',
      onClick: () => { window.location.href = '/doc-dashboard'; },
      icon: FiFile,
      permissions: ['read']
    },
    {
      id: 'configuration',
      label: 'Configuration',
      path: '/config-manager',
      onClick: () => { window.location.href = '/config-manager'; },
      icon: FiSettings,
      permissions: ['manage_config'],
      subItems: [
        {
          label: 'Client Configurations',
          path: '/config-manager/clients',
          onClick: () => { window.location.href = '/config-manager/clients'; },
          icon: FiUsers,
          permissions: ['read']
        },
        {
          label: 'Journal Configurations',
          path: '/config-manager/journals',
          onClick: () => { window.location.href = '/config-manager/journals'; },
          icon: FiBook,
          permissions: ['read']
        },
        {
          label: 'XML Editor',
          path: '/config-manager/editor',
          onClick: () => { window.location.href = '/config-manager/editor'; },
          icon: FiEdit3,
          permissions: ['write']
        },
        {
          label: 'Capability Catalog',
          path: '/config-manager?view=capability-catalog',
          onClick: () => { window.location.href = '/config-manager?view=capability-catalog'; },
          icon: FiDatabase,
          permissions: ['write']
        },
        {
          label: 'Change History',
          path: '/config-manager/history',
          onClick: () => { window.location.href = '/config-manager/history'; },
          icon: FiRefreshCw,
          permissions: ['read']
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      onClick: () => { window.location.href = '/reports'; },
      icon: FiBarChart2,
      permissions: ['read'],
      subItems: [
        {
          label: 'Activity Report',
          path: '/reports/activity',
          onClick: () => { window.location.href = '/reports/activity'; },
          icon: FiActivity,
          permissions: ['read']
        },
        {
          label: 'Performance Report',
          path: '/reports/performance',
          onClick: () => { window.location.href = '/reports/performance'; },
          icon: FiTrendingUp,
          permissions: ['read']
        },
        {
          label: 'Error Report',
          path: '/reports/errors',
          onClick: () => { window.location.href = '/reports/errors'; },
          icon: FiAlertTriangle,
          permissions: ['read']
        },
        {
          label: 'Usage Statistics',
          path: '/reports/usage',
          onClick: () => { window.location.href = '/reports/usage'; },
          icon: FiDatabase,
          permissions: ['read']
        }
      ]
    },
    {
      id: 'history',
      label: 'History',
      path: '/history',
      onClick: () => { window.location.href = '/history'; },
      icon: FiRefreshCw,
      permissions: ['read']
    },
    {
      id: 'migration-status',
      label: 'Migration Status',
      path: '/dashboard/migration-status',
      onClick: () => { window.location.href = '/dashboard/migration-status'; },
      icon: FiGitPullRequest,
      permissions: ['read']
    },
    {
      id: 'users',
      label: 'User Management',
      path: '/admin/users',
      onClick: () => { window.location.href = '/admin/users'; },
      icon: FiUsers,
      permissions: ['manage_users']
    },
    {
      id: 'system',
      label: 'System',
      path: '/admin/system',
      onClick: () => { window.location.href = '/admin/system'; },
      icon: FiCpu,
      permissions: ['manage_config'],
      subItems: [
        {
          label: 'System Status',
          path: '/admin/system/status',
          onClick: () => { window.location.href = '/admin/system/status'; },
          icon: FiCheckSquare,
          permissions: ['read']
        },
        {
          label: 'Logs',
          path: '/admin/system/logs',
          onClick: () => { window.location.href = '/admin/system/logs'; },
          icon: FiFolder,
          permissions: ['view_logs']
        },
        {
          label: 'Backup & Restore',
          path: '/admin/system/backup',
          onClick: () => { window.location.href = '/admin/system/backup'; },
          icon: FiDownload,
          permissions: ['manage_config']
        }
      ]
    }
  ],

  developer: [
    {
      id: 'overview',
      label: 'Overview',
      path: '/dashboard/dev',
      onClick: () => { window.location.href = '/dashboard/dev'; },
      icon: FiHome,
      permissions: ['read']
    },
    
    {
      id: 'editor',
      label: 'Editor',
      path: '/editor',
      onClick: () => { window.location.href = '/editor'; },
      icon: FiEdit3,
      permissions: ['write']
    },
    {
      id: 'debug',
      label: 'Debug Tools',
      path: '/debug',
      onClick: () => { window.location.href = '/debug'; },
      icon: FiCpu,
      permissions: ['debug'],
      subItems: [
        {
          label: 'Package Failure',
          path: '/reports/package-failure',
          onClick: () => { window.location.href = '/reports/package-failure'; },
          icon: FiAlertTriangle,
          permissions: ['read']
        },
        {
          label: 'XML Failure',
          path: '/reports/xml-failure',
          onClick: () => { window.location.href = '/reports/xml-failure'; },
          icon: FiAlertTriangle,
          permissions: ['read']
        },
        {
          label: 'Compare Tool',
          path: '/reports/compare',
          onClick: () => { window.location.href = '/reports/compare'; },
          icon: FiGitBranch,
          permissions: ['read']
        },
        {
          label: 'Validation Logs',
          path: '/debug/validation',
          onClick: () => { window.location.href = '/debug/validation'; },
          icon: FiCheckSquare,
          permissions: ['view_logs']
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports/dev',
      onClick: () => { window.location.href = '/reports/dev'; },
      icon: FiBarChart2,
      permissions: ['read']
    },
    {
      id: 'migration-status',
      label: 'Migration Status',
      path: '/dashboard/migration-status',
      onClick: () => { window.location.href = '/dashboard/migration-status'; },
      icon: FiGitPullRequest,
      permissions: ['read']
    },
    {
      id: 'logs',
      label: 'Logs',
      path: '/debug/logs',
      onClick: () => { window.location.href = '/debug/logs'; },
      icon: FiFolder,
      permissions: ['view_logs']
    }
  ],

  document: [
    {
      id: 'overview',
      label: 'Document Dashboard',
      path: '/doc-dashboard',
      onClick: () => { window.location.href = '/doc-dashboard'; },
      icon: FiHome,
      permissions: ['read']
    },
    {
      id: 'my-documents',
      label: 'My Documents',
      path: '/documents/my',
      onClick: () => { window.location.href = '/documents/my'; },
      icon: FiFile,
      permissions: ['read']
    },
    {
      id: 'editor',
      label: 'Document Editor',
      path: '/editor/document',
      onClick: () => { window.location.href = '/editor/document'; },
      icon: FiEdit3,
      permissions: ['write']
    },
    {
      id: 'upload',
      label: 'Upload Documents',
      path: '/documents/upload',
      onClick: () => { window.location.href = '/documents/upload'; },
      icon: FiUpload,
      permissions: ['upload']
    },
    {
      id: 'downloads',
      label: 'Downloads',
      path: '/documents/downloads',
      onClick: () => { window.location.href = '/documents/downloads'; },
      icon: FiDownload,
      permissions: ['download']
    },
    {
      id: 'recent',
      label: 'Recent Activity',
      path: '/documents/recent',
      onClick: () => { window.location.href = '/documents/recent'; },
      icon: FiRefreshCw,
      permissions: ['read']
    }
  ]
};

export const getDashboardTypeFromPath = (pathname) => {
  if (pathname.includes('/dashboard/admin')) {
    return 'admin';
  } else if (pathname.includes('/dashboard/dev')) {
    return 'developer';
  } else if (pathname.includes('/doc-dashboard')) {
    return 'document';
  }
  return 'admin'; // default
};

export const getDefaultPathForDashboardType = (dashboardType) => {
  const defaultPaths = {
    admin: '/dashboard/admin',
    developer: '/dashboard/dev',
    document: '/doc-dashboard'
  };
  return defaultPaths[dashboardType] || '/dashboard/admin';
};
