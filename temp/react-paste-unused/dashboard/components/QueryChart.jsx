import { memo } from 'react';
import PieChart from '../../../components/charts/PieChart';

function QueryChart({ data }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Query Status</h3>
      <PieChart data={data} />
    </section>
  );
}

export default memo(QueryChart);
