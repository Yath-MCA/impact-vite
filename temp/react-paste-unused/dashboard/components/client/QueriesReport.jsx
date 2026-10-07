import { memo } from 'react';
import AreaChart from '../../../../components/charts/AreaChart';

function QueriesReport({ data }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Author Queries Report</h3>
      <AreaChart data={data} />
    </section>
  );
}

export default memo(QueriesReport);
