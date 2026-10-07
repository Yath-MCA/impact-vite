import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';
import { Search, Download, Users, LogIn, Edit, Eye, Clock, Shield } from 'lucide-react';

const mockActivityData = Array.from({ length: 45 }, (_, i) => ({
  id: `ACT-${1000 + i}`,
  userId: `USR-${100 + (i % 15)}`,
  username: ['john.doe', 'jane.smith', 'admin.user', 'editor1', 'editor2', 'viewer1', 'qc.user', 'dev.user'][i % 8],
  email: `user${i % 8}@cms.local`,
  action: ['Login', 'Logout', 'Document Edit', 'Document View', 'Report Generated', 'Settings Changed', 'User Created', 'Password Changed'][i % 8],
  module: ['Auth', 'Auth', 'Editor', 'Viewer', 'Reports', 'Admin', 'Admin', 'Auth'][i % 8],
  ipAddress: `192.168.${i % 255}.${(i * 7) % 255}`,
  timestamp: `2026-03-${String((i % 28) + 1).padStart(2, '0')} ${String((i % 24)).padStart(2, '0')}:${String((i % 60)).padStart(2, '0')}`,
  details: [
    'Successful login from web browser',
    'User logged out',
    'Edited document DOC-12345',
    'Viewed document DOC-67890',
    'Generated XML Failure Report',
    'Modified system configuration',
    'Created new user account',
    'Password successfully updated'
  ][i % 8],
  status: ['Success', 'Success', 'Success', 'Success', 'Success', 'Warning', 'Success', 'Success'][i % 8]
}));

export default function UserActivity() {
  const [filter, setFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    return mockActivityData.filter(item => {
      const matchesSearch = !filter ||
        item.username.toLowerCase().includes(filter.toLowerCase()) ||
        item.email.toLowerCase().includes(filter.toLowerCase()) ||
        item.details.toLowerCase().includes(filter.toLowerCase()) ||
        item.ipAddress.includes(filter);
      const matchesUser = !userFilter || item.username === userFilter;
      const matchesAction = actionFilter === 'all' || item.action === actionFilter;
      const matchesDate = (!dateFrom || item.timestamp >= dateFrom) && (!dateTo || item.timestamp <= dateTo);
      return matchesSearch && matchesUser && matchesAction && matchesDate;
    });
  }, [filter, userFilter, actionFilter, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const uniqueUsers = useMemo(() => {
    return [...new Set(mockActivityData.map(item => item.username))];
  }, []);

  const uniqueActions = useMemo(() => {
    return [...new Set(mockActivityData.map(item => item.action))];
  }, []);

  const stats = useMemo(() => {
    const logins = filteredData.filter(i => i.action === 'Login').length;
    const edits = filteredData.filter(i => i.action === 'Document Edit').length;
    const views = filteredData.filter(i => i.action === 'Document View').length;
    const uniqueUsersActive = new Set(filteredData.map(i => i.username)).size;
    return { logins, edits, views, uniqueUsersActive, total: filteredData.length };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const exportData = () => {
    const csv = [
      ['ID', 'User ID', 'Username', 'Email', 'Action', 'Module', 'IP Address', 'Timestamp', 'Details', 'Status'].join(','),
      ...filteredData.map(row => [
        row.id, row.userId, row.username, row.email, row.action,
        row.module, row.ipAddress, row.timestamp, `"${row.details}"`, row.status
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-activity.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'Login': return <LogIn className="w-4 h-4" />;
      case 'Logout': return <LogIn className="w-4 h-4 rotate-180" />;
      case 'Document Edit': return <Edit className="w-4 h-4" />;
      case 'Document View': return <Eye className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'Login': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Logout': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'Document Edit': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Document View': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Report Generated': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Settings Changed': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'User Created': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <DashboardTopBar
          title="User Activity"
          subtitle="Monitor user login activity, edit history, and module access logs"
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-1">
              <LogIn className="w-4 h-4" />
              Logins
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.logins}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm mb-1">
              <Edit className="w-4 h-4" />
              Edits
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.edits}</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm mb-1">
              <Eye className="w-4 h-4" />
              Views
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.views}</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Active Users
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.uniqueUsersActive}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Total Events
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user, IP, or details..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              />
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Module</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">IP Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Details</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(row.action)}`}>
                        {getActionIcon(row.action)}
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                          {row.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{row.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                        {row.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs font-mono">
                      {row.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-xs" title={row.details}>
                      {row.details}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {row.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
