import { useMemo } from 'react';
import ArticleStatusChart from '../components/client/ArticleStatusChart';
import ArticlesGrid from '../components/client/ArticlesGrid';
import ProductionOverview from '../components/client/ProductionOverview';
import QueriesReport from '../components/client/QueriesReport';
import LineChart from '../../../components/charts/LineChart';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';

export default function ClientDashboard() {
  const overview = useMemo(() => [
    { label: 'Articles', value: 124, hint: 'In production pipeline' },
    { label: 'In Editing', value: 42, hint: 'Active editorial stage' },
    { label: 'Pending Queries', value: 28, hint: 'Awaiting author input' },
    { label: 'Revision Progress', value: '68%', hint: 'Average completion' },
    { label: 'On-Time Delivery', value: '91%', hint: 'Current schedule adherence' }
  ], []);

  const statusData = useMemo(() => [
    { label: 'Submitted', value: 20 },
    { label: 'Editing', value: 42 },
    { label: 'Proofing', value: 31 },
    { label: 'Published', value: 17 }
  ], []);

  const queryTrend = useMemo(() => [
    { label: 'W1', value: 18 },
    { label: 'W2', value: 24 },
    { label: 'W3', value: 19 },
    { label: 'W4', value: 27 },
    { label: 'W5', value: 16 }
  ], []);

  const timeline = useMemo(() => [
    { label: 'Jan', value: 14 },
    { label: 'Feb', value: 22 },
    { label: 'Mar', value: 19 },
    { label: 'Apr', value: 28 },
    { label: 'May', value: 24 },
    { label: 'Jun', value: 30 }
  ], []);

  const articles = useMemo(() => Array.from({ length: 30 }, (_, index) => ({
    articleId: `ART-${2000 + index}`,
    title: `Clinical Study ${index + 1}`,
    journal: ['PLOS One', 'OUP Medicine', 'LWW Cardiology'][index % 3],
    stage: ['Editing', 'Proofing', 'Author Review'][index % 3],
    queries: index % 8,
    deadline: `2026-04-${String((index % 28) + 1).padStart(2, '0')}`
  })), []);

  return (
    <div className="min-h-screen bg-[#f6f3ec] p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <DashboardTopBar
          title="Client Dashboard"
          subtitle="Publisher view of production status, queries, and schedule progress."
        />

        <ProductionOverview items={overview} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <ArticleStatusChart data={statusData} />
            <ArticlesGrid rowData={articles} />
          </div>
          <div className="space-y-4">
            <QueriesReport data={queryTrend} />
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Production Timeline</h3>
              <LineChart data={timeline} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
