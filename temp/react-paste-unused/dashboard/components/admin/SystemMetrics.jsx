import { memo } from 'react';

function SystemMetrics({ items }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">System Health Metrics</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-800">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default memo(SystemMetrics);
