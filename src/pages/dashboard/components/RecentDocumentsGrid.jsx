import { memo, useMemo } from 'react';
import AgGridWrapper from './grid/AgGridWrapper';

function RecentDocumentsGrid({ rowData }) {
  const columnDefs = useMemo(() => [
    { field: 'documentId', headerName: 'Doc ID', minWidth: 100 },
    { field: 'title', headerName: 'Title', flex: 2, minWidth: 220 },
    { field: 'status', headerName: 'Status', minWidth: 140 },
    { field: 'assignee', headerName: 'Assignee', minWidth: 140 },
    { field: 'updatedAt', headerName: 'Updated At', minWidth: 160 }
  ], []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Documents</h3>
      </div>
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

export default memo(RecentDocumentsGrid);
