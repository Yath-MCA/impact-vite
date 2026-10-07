import { memo, useMemo } from 'react';
import AgGridWrapper from '../../components/grid/AgGridWrapper';

function ReportGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'reportId', headerName: 'Report ID', minWidth: 120 },
    { field: 'type', headerName: 'Type', minWidth: 180 },
    { field: 'client', headerName: 'Client', minWidth: 120 },
    { field: 'journal', headerName: 'Journal', minWidth: 140 },
    { field: 'period', headerName: 'Period', minWidth: 140 },
    { field: 'owner', headerName: 'Owner', minWidth: 120 },
    { field: 'updatedAt', headerName: 'Updated', minWidth: 150 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Data Grid</h3>
      <div className="h-[360px]">
        <AgGridWrapper
          rowData={rowData}
          columnDefs={columnDefs}
          pagination
          paginationPageSize={10}
        />
      </div>
    </section>
  );
}

export default memo(ReportGrid);
