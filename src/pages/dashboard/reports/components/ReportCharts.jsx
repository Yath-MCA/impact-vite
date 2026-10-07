import { memo } from 'react';
import AreaChart from '../../../../components/charts/AreaChart';
import BarChart from '../../../../components/charts/BarChart';

function ReportCharts({ processingData, activityData }) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Article Processing Report</h3>
        <BarChart data={processingData} />
      </article>
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Editing Activity Report</h3>
        <AreaChart data={activityData} />
      </article>
    </section>
  );
}

export default memo(ReportCharts);
