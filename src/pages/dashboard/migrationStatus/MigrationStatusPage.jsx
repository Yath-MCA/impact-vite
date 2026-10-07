import { useMemo } from 'react';
import DashboardTopBar from '../../../components/layout/DashboardTopBar';
import { migrationPhases, STATUS, STATUS_LABEL, MIGRATION_STATUS_UPDATED_AT } from './migrationStatusData';
import { editorModuleCategories, EDITOR_MODULE_STATUS_UPDATED_AT, MODULE_PLUMBING_CAVEAT } from './editorModuleStatusData';

const STATUS_BADGE_CLASS = {
  [STATUS.NOT_STARTED]: 'bg-gray-100 text-gray-600',
  [STATUS.DRAFTED]: 'bg-amber-100 text-amber-700',
  [STATUS.BLOCKED]: 'bg-red-100 text-red-700',
  [STATUS.PARTIAL]: 'bg-orange-100 text-orange-700',
  [STATUS.AUTHORITATIVE]: 'bg-emerald-100 text-emerald-700'
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function MigrationStatusPage() {
  const summary = useMemo(() => {
    const total = migrationPhases.length;
    const drafted = migrationPhases.filter((p) => p.newServiceStatus === STATUS.DRAFTED).length;
    const blocked = migrationPhases.filter((p) => p.newServiceStatus === STATUS.BLOCKED).length;
    const notStarted = migrationPhases.filter((p) => p.newServiceStatus === STATUS.NOT_STARTED).length;
    return { total, drafted, blocked, notStarted };
  }, []);

  const editorModuleSummary = useMemo(() => {
    const items = editorModuleCategories.flatMap((c) => c.items);
    const total = items.length;
    const authoritative = items.filter((i) => i.status === STATUS.AUTHORITATIVE).length;
    const notStarted = items.filter((i) => i.status === STATUS.NOT_STARTED).length;
    return { total, authoritative, notStarted };
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f3ec] p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <DashboardTopBar
          title="Session Service Migration Status"
          subtitle="Legacy poll-based flow vs. new Session Service, phase by phase."
        />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <span><strong>{summary.drafted}</strong>/{summary.total} phases drafted</span>
              <span><strong>{summary.blocked}</strong> blocked</span>
              <span><strong>{summary.notStarted}</strong> not started</span>
              <span>Legacy flow (<code>sessionGateway.js</code>) is authoritative for all phases today.</span>
            </div>
            <span className="text-xs text-gray-400">Last updated {MIGRATION_STATUS_UPDATED_AT}</span>
          </div>
        </section>

        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Phase</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">New Session Service</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Legacy Flow</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {migrationPhases.map((row) => (
                <tr key={row.phase}>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-800">{row.phase}. {row.name}</td>
                  <td className="whitespace-nowrap px-4 py-2"><StatusBadge status={row.newServiceStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-2"><StatusBadge status={row.legacyStatus} /></td>
                  <td className="px-4 py-2 text-gray-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <DashboardTopBar
          title="Editor Module Migration Status"
          subtitle="Legacy impactweb editor modules vs. impact_react_vite ports."
        />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <span><strong>{editorModuleSummary.authoritative}</strong>/{editorModuleSummary.total} modules ported</span>
              <span><strong>{editorModuleSummary.notStarted}</strong> not started</span>
            </div>
            <span className="text-xs text-gray-400">Last updated {EDITOR_MODULE_STATUS_UPDATED_AT}</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">{MODULE_PLUMBING_CAVEAT}</p>
        </section>

        {editorModuleCategories.map((cat) => (
          <section key={cat.category} className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-800">{cat.category}</h3>
              <code className="text-xs text-gray-400">{cat.legacyPath}</code>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Module</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">New Path</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.items.map((item) => (
                  <tr key={item.name}>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-800">{item.name}</td>
                    <td className="whitespace-nowrap px-4 py-2"><StatusBadge status={item.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-500">{item.path ? <code className="text-xs">{item.path}</code> : '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
