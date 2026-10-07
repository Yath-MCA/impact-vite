import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';
import { Search, Download, GitCompare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const mockData = Array.from({ length: 30 }, (_, i) => ({
  id: `CMP-${1000 + i}`,
  docId: `DOC-${2000 + i}`,
  manuscriptNo: `MS-${3000 + i}`,
  client: ['PLOS', 'OUP', 'LWW', 'Elsevier'][i % 4],
  sourceVersion: `v${1 + (i % 5)}.0`,
  targetVersion: `v${2 + (i % 5)}.0`,
  comparisonType: ['XML Compare', 'PDF Compare', 'Metadata Compare', 'Full Compare'][i % 4],
  differences: Math.floor(Math.random() * 20),
  added: Math.floor(Math.random() * 10),
  removed: Math.floor(Math.random() * 10),
  modified: Math.floor(Math.random() * 15),
  timestamp: `2026-03-${String((i % 28) + 1).padStart(2, '0')} ${String((i % 24)).padStart(2, '0')}:${String((i % 60)).padStart(2, '0')}`,
  status: ['Match', 'Differences Found', 'Error', 'In Progress'][i % 4],
  initiatedBy: ['editor1', 'system', 'qcuser', 'admin'][i % 4]
}));

export default function CompareReports() {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    return mockData.filter(item => {
      const matchesSearch = !filter ||
        item.docId.toLowerCase().includes(filter.toLowerCase()) ||
        item.manuscriptNo.toLowerCase().includes(filter.toLowerCase()) ||
        item.initiatedBy.toLowerCase().includes(filter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [filter, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const stats = useMemo(() => {
    const match = filteredData.filter(i => i.status === 'Match').length;
    const differences = filteredData.filter(i => i.status === 'Differences Found').length;
    const errors = filteredData.filter(i => i.status === 'Error').length;
    return { match, differences, errors, total: filteredData.length };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const exportData = () => {
    const csv = [
      ['ID', 'Doc ID', 'Manuscript No', 'Client', 'Source Version', 'Target Version', 'Comparison Type', 'Differences', 'Added', 'Removed', 'Modified', 'Timestamp', 'Status', 'Initiated By'].join(','),
      ...filteredData.map(row => [
        row.id, row.docId, row.manuscriptNo, row.client,
        row.sourceVersion, row.targetVersion, row.comparisonType,
        row.differences, row.added, row.removed, row.modified,
        row.timestamp, row.status, row.initiatedBy
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compare-reports.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <DashboardTopBar
          title="Compare Reports"
          subtitle="Compare document versions and track differences across workflows"
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Match
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.match}</div>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Differences Found
            </div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.differences}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-1">
              <XCircle className="w-4 h-4" />
              Errors
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.errors}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <GitCompare className="w-4 h-4" />
              Total Comparisons
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Doc ID, Manuscript No, or user..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="Match">Match</option>
                <option value="Differences Found">Differences Found</option>
                <option value="Error">Error</option>
                <option value="In Progress">In Progress</option>
              </select>
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Doc ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Manuscript No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Versions</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Comparison Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Changes</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Initiated By</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{row.id}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.docId}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.manuscriptNo}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.client}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{row.sourceVersion}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="text-xs font-medium text-gray-700">{row.targetVersion}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <GitCompare className="w-3 h-3" />
                        {row.comparisonType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        {row.differences > 0 ? (
                          <>
                            <span className="text-green-600">+{row.added}</span>
                            <span className="text-red-600">-{row.removed}</span>
                            <span className="text-yellow-600">~{row.modified}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">No changes</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Match' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        row.status === 'Differences Found' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        row.status === 'Error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.initiatedBy}</td>
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
