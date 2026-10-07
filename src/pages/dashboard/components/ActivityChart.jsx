import { memo } from 'react';
import LineChart from '../../../components/charts/LineChart';

function ActivityChart({ data }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Document Activity</h3>
      <LineChart data={data} />
    </section>
  );
}

export default memo(ActivityChart);
