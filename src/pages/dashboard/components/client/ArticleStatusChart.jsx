import { memo } from 'react';
import BarChart from '../../../../components/charts/BarChart';

function ArticleStatusChart({ data }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Article Status</h3>
      <BarChart data={data} />
    </section>
  );
}

export default memo(ArticleStatusChart);
