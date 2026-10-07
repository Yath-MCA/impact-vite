import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ClientManagementGrid from '../components/admin/ClientManagementGrid';
import ProjectGrid from '../components/admin/ProjectGrid';
import SystemMetrics from '../components/admin/SystemMetrics';
import UserManagementGrid from '../components/admin/UserManagementGrid';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';
import AppLayout from '../../../components/layout/AppLayout';

export default function AdminDashboard() {
  const systemMetrics = useMemo(() => [
    { label: 'CPU Load', value: '42%' },
    { label: 'Memory', value: '63%' },
    { label: 'API Latency', value: '128ms' },
    { label: 'Error Rate', value: '0.12%' }
  ], []);

  const users = useMemo(() => Array.from({ length: 40 }, (_, index) => ({
    userId: `USR-${100 + index}`,
    name: `User ${index + 1}`,
    email: `user${index + 1}@cms.local`,
    role: ['Admin', 'Editor', 'Production', 'Author'][index % 4],
    status: index % 6 === 0 ? 'Inactive' : 'Active',
    lastLogin: `2026-03-${String((index % 28) + 1).padStart(2, '0')} 09:${String(index % 60).padStart(2, '0')}`
  })), []);

  const clients = useMemo(() => [
    { clientId: 'PLOS', name: 'Public Library of Science', projects: 24, activeUsers: 58, sla: '99.9%', health: 'Good' },
    { clientId: 'OUP', name: 'Oxford University Press', projects: 31, activeUsers: 67, sla: '99.8%', health: 'Good' },
    { clientId: 'LWW', name: 'LWW', projects: 18, activeUsers: 29, sla: '99.7%', health: 'Fair' },
    { clientId: 'Elsevier', name: 'Elsevier', projects: 42, activeUsers: 93, sla: '99.9%', health: 'Good' }
  ], []);

  const projects = useMemo(() => Array.from({ length: 50 }, (_, index) => ({
    projectId: `PRJ-${500 + index}`,
    title: `Publishing Workflow ${index + 1}`,
    client: ['PLOS', 'OUP', 'LWW', 'Elsevier'][index % 4],
    owner: ['A. Chen', 'M. Brown', 'L. Kumar'][index % 3],
    progress: 35 + (index % 65),
    status: ['Planning', 'Active', 'Blocked', 'Complete'][index % 4]
  })), []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1400px] space-y-4">
        <DashboardTopBar
          title="Admin Dashboard"
          subtitle="Manage users, clients, projects, and platform health."
        />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">System Overview</h2>
          <p className="text-sm text-gray-600">
            Centralized control for RBAC, client onboarding, delivery health, and production throughput.
          </p>
          <Link className="mt-2 inline-block text-sm font-medium text-orange-700" to="/dashboard/admin/capability-catalog">
            Capability catalog
          </Link>
        </section>

        <SystemMetrics items={systemMetrics} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <UserManagementGrid rowData={users} />
          <ClientManagementGrid rowData={clients} />
        </div>

        <ProjectGrid rowData={projects} />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">Role Permission Manager</h3>
          <p className="mt-1 text-sm text-gray-600">Use feature hooks and `src/config/clientConfig.js` to tune role/client privileges.</p>
        </section>
      </div>
    </AppLayout>
  );
}
