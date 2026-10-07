import { useMemo } from 'react';
import ActivityChart from '../components/ActivityChart';
import Notifications from '../components/Notifications';
import QueryChart from '../components/QueryChart';
import RecentDocumentsGrid from '../components/RecentDocumentsGrid';
import StatsCards from '../components/StatsCards';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';

const activityData = [
  { label: 'Mon', value: 14 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 12 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 20 },
  { label: 'Sat', value: 10 },
  { label: 'Sun', value: 16 }
];

const queryData = [
  { label: 'Open', value: 34 },
  { label: 'Answered', value: 52 },
  { label: 'Escalated', value: 9 }
];

export default function DevDashboard() {
  const stats = useMemo(() => [
    { label: 'Documents', value: 182, hint: 'Across active projects' },
    { label: 'Active Sessions', value: 37, hint: 'Editors online now' },
    { label: 'Pending Queries', value: 34, hint: 'Needs author response' },
    { label: 'User Activity', value: '2.3k', hint: 'Events in 24h' },
    { label: 'Publishing Progress', value: '76%', hint: 'Monthly target completion' }
  ], []);

  const notifications = useMemo(() => [
    { id: 'n1', title: 'Deadline Alert', message: '8 manuscripts due for proof approval today.' },
    { id: 'n2', title: 'Query Spike', message: 'Author queries increased by 14% in the last 48 hours.' },
    { id: 'n3', title: 'Session Peak', message: 'Concurrent edit sessions reached weekly high.' }
  ], []);

  const rowData = useMemo(() => Array.from({ length: 28 }, (_, index) => ({
    documentId: `DOC-${1000 + index}`,
    title: `Research Manuscript ${index + 1}`,
    status: index % 3 === 0 ? 'In Review' : index % 3 === 1 ? 'Editing' : 'Proof Ready',
    assignee: ['A. Kim', 'R. Smith', 'S. Patel'][index % 3],
    updatedAt: `2026-03-${String((index % 28) + 1).padStart(2, '0')} 14:${String(index % 60).padStart(2, '0')}`
  })), []);

  return (
    <div className="min-h-screen bg-[#f6f3ec] p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <DashboardTopBar
          title="CMS Dashboard"
          subtitle="Operational overview for editorial and production teams."
        />

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <ActivityChart data={activityData} />
            <RecentDocumentsGrid rowData={rowData} />
          </div>
          <div className="space-y-4">
            <QueryChart data={queryData} />
            <Notifications items={notifications} />
          </div>
        </div>
      </div>
    </div>
  );
}
