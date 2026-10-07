import { memo } from 'react';

function ProductionOverview({ items }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <article key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}

export default memo(ProductionOverview);
