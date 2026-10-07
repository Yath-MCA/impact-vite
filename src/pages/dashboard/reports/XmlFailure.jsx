import { useState, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';
import { Search, Download, FileCode, AlertCircle } from 'lucide-react';

const mockData = Array.from({ length: 45 }, (_, i) => ({
  id: `XML-${1000 + i}`,
  docId: `DOC-${2000 + i}`,
  manuscriptNo: `MS-${3000 + i}`,
  client: ['PLOS', 'OUP', 'LWW', 'Elsevier'][i % 4],
  errorCategory: ['Validation Error', 'Parsing Error', 'DTD Error', 'Schema Error'][i % 4],
  errorMessage: [
    'Element not allowed in current context',
    'XML parsing failed at line 245',
    'DTD validation failed for element',
    'Schema constraint violation'
  ][i % 4],
  lineNumber: (i * 17) % 500 + 1,
  timestamp: `2026-03-${String((i % 28) + 1).padStart(2, '0')} ${String((i % 24)).padStart(2, '0')}:${String((i % 60)).padStart(2, '0')}`,
  severity: ['Critical', 'High', 'Medium', 'Low'][i % 4],
  status: ['Open', 'Fixed', 'In Review', 'Wont Fix'][i % 4],
  assignedTo: ['xmlteam1', 'xmlteam2', 'Not Assigned', 'devteam'][i % 4]
}));

export default function XmlFailure() {
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    return mockData.filter(item => {
      const matchesSearch = !filter ||
        item.docId.toLowerCase().includes(filter.toLowerCase()) ||
        item.manuscriptNo.toLowerCase().includes(filter.toLowerCase()) ||
        item.errorMessage.toLowerCase().includes(filter.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [filter, severityFilter]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const stats = useMemo(() => {
    const critical = filteredData.filter(i => i.severity === 'Critical').length;
    const high = filteredData.filter(i => i.severity === 'High').length;
    const open = filteredData.filter(i => i.status === 'Open').length;
    return { critical, high, open, total: filteredData.length };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const exportData = () => {
    const csv = [
      ['ID', 'Doc ID', 'Manuscript No', 'Client', 'Error Category', 'Error Message', 'Line Number', 'Timestamp', 'Severity', 'Status', 'Assigned To'].join(','),
      ...filteredData.map(row => [
        row.id, row.docId, row.manuscriptNo, row.client,
        row.errorCategory, `"${row.errorMessage}"`, row.lineNumber, row.timestamp, row.severity, row.status, row.assignedTo
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xml-failures.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <DashboardTopBar
          title="XML Failure Report"
          subtitle="Track and manage XML validation and parsing errors"
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Critical
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.critical}</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              High Severity
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.high}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm mb-1">
              <FileCode className="w-4 h-4" />
              Open Issues
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.open}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <FileCode className="w-4 h-4" />
              Total Issues
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
                  placeholder="Search by Doc ID, Manuscript No, or error..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Error Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Line</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Assigned To</th>
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
                      <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <FileCode className="w-3 h-3" />
                        {row.errorCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Line {row.lineNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        row.severity === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        row.severity === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        row.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Fixed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        row.status === 'Open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        row.status === 'In Review' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.assignedTo}</td>
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
