import { useMemo, useState } from 'react';
import ReportCharts from '../components/ReportCharts';
import ReportFilters from '../components/ReportFilters';
import ReportGrid from '../components/ReportGrid';
import DashboardTopBar from '../../../../components/layout/DashboardTopBar';

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    from: '2026-03-01',
    to: '2026-03-31',
    client: 'All',
    journal: 'All'
  });

  const processingData = useMemo(() => [
    { label: 'Article Processing', value: 48 },
    { label: 'Author Queries', value: 34 },
    { label: 'Editing Activity', value: 57 },
    { label: 'User Activity', value: 22 },
    { label: 'Timeline', value: 29 }
  ], []);

  const activityData = useMemo(() => [
    { label: 'W1', value: 21 },
    { label: 'W2', value: 25 },
    { label: 'W3', value: 28 },
    { label: 'W4', value: 24 },
    { label: 'W5', value: 30 }
  ], []);

  const rowData = useMemo(() => Array.from({ length: 35 }, (_, index) => ({
    reportId: `RPT-${500 + index}`,
    type: ['Article Processing', 'Author Query', 'Editing Activity', 'User Activity', 'Production Timeline'][index % 5],
    client: ['PLOS', 'OUP', 'LWW', 'Elsevier'][index % 4],
    journal: ['Clinical', 'Biomedical', 'Engineering'][index % 3],
    period: '2026-Q1',
    owner: ['Ops', 'Editorial', 'Production'][index % 3],
    updatedAt: `2026-03-${String((index % 28) + 1).padStart(2, '0')}`
  })), []);

  return (
    <div className="min-h-screen bg-[#f6f3ec] p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <DashboardTopBar
          title="Reports"
          subtitle="Generate and export operational insights."
        />

        <ReportFilters filters={filters} onChange={setFilters} />
        <ReportCharts processingData={processingData} activityData={activityData} />
        <ReportGrid rowData={rowData} />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Export Panel</h3>
          <div className="flex gap-2">
            <button type="button" className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600">
              Export PDF
            </button>
            <button type="button" className="rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900">
              Export Excel
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
