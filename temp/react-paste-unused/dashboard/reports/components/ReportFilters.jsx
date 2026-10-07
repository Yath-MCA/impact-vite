import { memo } from 'react';

function ReportFilters({ filters, onChange }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Filters</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-xs text-gray-600">
          Date Range
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
          />
        </label>
        <label className="text-xs text-gray-600">
          To
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
          />
        </label>
        <label className="text-xs text-gray-600">
          Client
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5"
            value={filters.client}
            onChange={(e) => onChange({ ...filters, client: e.target.value })}
          >
            <option value="All">All</option>
            <option value="PLOS">PLOS</option>
            <option value="OUP">OUP</option>
            <option value="LWW">LWW</option>
            <option value="Elsevier">Elsevier</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          Journal
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5"
            value={filters.journal}
            onChange={(e) => onChange({ ...filters, journal: e.target.value })}
          >
            <option value="All">All</option>
            <option value="Clinical">Clinical</option>
            <option value="Biomedical">Biomedical</option>
            <option value="Engineering">Engineering</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export default memo(ReportFilters);
